/** HIP-3 venue engine: marks, depth, margin, fills, funding, liquidations. */

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { launches, perpFills, perpMarkets, perpOrders, perpPositions, users } from "@/db/schema";
import { ApiError, fakeTx, type PublicUser } from "@/lib/auth";
import { notify } from "@/lib/forge";
import { head } from "@/lib/chain";
import { buildBook, liqPrice, nextMark, recentTape, unrealizedPnl } from "@/lib/perp";
import { hashInt } from "@/lib/util";
import type { BookSnapshot, PerpMarket, PerpPosition } from "@/lib/dto";

/**
 * Prices on Elysium launch tokens are tiny (1e-6 … 1e-9 USD), so rounding must be
 * relative, not fixed-decimal — otherwise marks freeze and liquidations fire instantly.
 */
const r6 = (n: number) => (Number.isFinite(n) ? Number(n.toPrecision(12)) : 0);
const TRAIL_LEN = 96;

export type MarketRow = typeof perpMarkets.$inferSelect;

export async function tickMarkets(): Promise<MarketRow[]> {
  const rows = await db.select().from(perpMarkets);
  const out: MarketRow[] = [];
  for (const m of rows) {
    const next = nextMark(
      { indexPrice: m.indexPrice, anchorPrice: m.anchorPrice, markPrice: m.markPrice, vol: m.vol, fundingHour: m.fundingHour, lastTickAt: m.lastTickAt.getTime() },
      hashInt(m.symbol),
    );
    const trail = (m.priceTrail ? (JSON.parse(m.priceTrail) as number[]) : []).concat(next.markPrice).slice(-TRAIL_LEN);
    await db
      .update(perpMarkets)
      .set({
        indexPrice: r6(next.indexPrice),
        markPrice: r6(next.markPrice),
        anchorPrice: r6(next.anchorPrice),
        fundingHour: r6(next.fundingHour),
        lastTickAt: new Date(),
        open24hPrice: m.open24hPrice ?? next.markPrice,
        high24hPrice: Math.max(m.high24hPrice ?? next.markPrice, next.markPrice),
        low24hPrice: Math.min(m.low24hPrice ?? next.markPrice, next.markPrice),
        volume24hUsd: sql`${perpMarkets.volume24hUsd} * 0.995`,
        priceTrail: JSON.stringify(trail),
      })
      .where(eq(perpMarkets.id, m.id));
    out.push({ ...m, indexPrice: next.indexPrice, markPrice: next.markPrice, fundingHour: next.fundingHour, lastTickAt: new Date() });
  }
  return out;
}

export async function marketViews(user: PublicUser | null): Promise<PerpMarket[]> {
  const markets = await tickMarkets();
  const linked = await db
    .select({ id: launches.id, slug: launches.slug, cashtag: launches.cashtag, symbol: launches.symbol })
    .from(launches);
  return markets.map((m) => {
    const l = linked.find((row) => row.id === m.launchId);
    const open = m.open24hPrice ?? m.indexPrice;
    return {
      id: m.id,
      symbol: m.symbol,
      venue: m.venue,
      indexPrice: m.indexPrice,
      markPrice: m.markPrice,
      change24h: open ? ((m.markPrice - open) / open) * 100 : 0,
      fundingHour: m.fundingHour,
      fundingAnnual: m.fundingHour * 24 * 365,
      openInterestUsd: m.openInterestUsd,
      volume24hUsd: m.volume24hUsd,
      maxLeverage: m.maxLeverage,
      takerFeeBps: m.takerFeeBps,
      makerFeeBps: m.makerFeeBps,
      status: m.status,
      launchSlug: l?.slug ?? null,
      cashtag: l?.cashtag ?? null,
      high24h: m.high24hPrice ?? m.markPrice,
      low24h: m.low24hPrice ?? m.markPrice,
      trail: m.priceTrail ? (JSON.parse(m.priceTrail) as number[]) : [],
    };
  });
}

export function bookFor(symbol: string, mark: number, tick: number): BookSnapshot {
  const built = buildBook(symbol, mark, tick, Math.floor(Date.now() / 2600));
  const bestBid = built.bids[0]?.price ?? mark;
  const bestAsk = built.asks[0]?.price ?? mark;
  return {
    bids: built.bids,
    asks: built.asks,
    mid: (bestBid + bestAsk) / 2,
    spreadBps: bestBid ? ((bestAsk - bestBid) / bestBid) * 10_000 : 0,
    imbalance: built.imbalanced,
  };
}

/** Funding is charged per position from its own last accrual stamp (Hyperliquid-style, hourly). */
export async function settleFunding(market: MarketRow) {
  const open = await db.select().from(perpPositions).where(and(eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  if (!open.length) return;
  for (const p of open) {
    const since = Math.max(p.lastFundingAt.getTime(), p.openedAt.getTime());
    const hours = Math.min(8, Math.max(0, (Date.now() - since) / 3_600_000));
    if (hours < 1 / 240) continue;
    const charged = market.fundingHour * hours * p.size * market.markPrice * (p.side === "long" ? 1 : -1);
    if (!Number.isFinite(charged)) continue;
    await db
      .update(perpPositions)
      .set({
        fundingAccrued: sql`${perpPositions.fundingAccrued} + ${r6(charged)}`,
        lastFundingAt: new Date(),
        margin: sql`greatest(0, ${perpPositions.margin} - ${r6(Math.max(0, charged))})`,
      })
      .where(eq(perpPositions.id, p.id));
  }
}

/** Mark-to-market sweep: trigger orders, TP/SL, liquidations. */
export async function sweep(market: MarketRow) {
  const h = await head(500);
  const open = await db.select().from(perpPositions).where(and(eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  for (const p of open) {
    const hit = p.side === "long" ? market.markPrice <= p.liqPrice : market.markPrice >= p.liqPrice;
    if (!hit) continue;
    const loss = Math.min(p.margin, unrealizedPnl({ side: p.side, entryPrice: p.entryPrice, size: p.size }, p.liqPrice));
    await db
      .update(perpPositions)
      .set({ status: "closed", closedAt: new Date(), realizedPnl: sql`${perpPositions.realizedPnl} + ${r6(loss)}`, margin: 0 })
      .where(eq(perpPositions.id, p.id));
    await db.insert(perpFills).values({
      id: `fil_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      marketId: market.id,
      marketSymbol: market.symbol,
      userId: p.userId,
      traderName: "keeper",
      action: "liquidate",
      side: p.side,
      size: p.size,
      price: p.liqPrice,
      feeUsd: 0,
      pnlUsd: r6(loss),
      leverage: p.leverage,
      txHash: fakeTx(`liq:${p.id}`),
      blockNumber: h.headBlock,
    });
    await db.update(perpMarkets).set({ openInterestUsd: sql`greatest(0, ${perpMarkets.openInterestUsd} - ${r6(p.size * market.markPrice)})` }).where(eq(perpMarkets.id, market.id));
    await notify(p.userId, "liquidation", `${market.symbol} position liquidated`, `${p.side.toUpperCase()} ${p.size.toLocaleString("en-US")} @ ${p.entryPrice.toPrecision(4)} hit maintenance margin at ${p.liqPrice.toPrecision(4)}.`);
  }

  const resting = await db.select().from(perpOrders).where(and(eq(perpOrders.marketId, market.id), eq(perpOrders.status, "resting")));
  for (const o of resting) {
    const trigger = o.limitPrice ?? 0;
    const shouldFill = o.kind === "limit" ? (o.side === "buy" ? market.markPrice <= trigger : market.markPrice >= trigger) : o.side === "buy" ? market.markPrice >= trigger : market.markPrice <= trigger;
    if (!shouldFill) continue;
    await db.update(perpOrders).set({ status: "triggered", updatedAt: new Date() }).where(eq(perpOrders.id, o.id));
    const owner = await db.select().from(users).where(eq(users.id, o.userId)).limit(1);
    const trader = owner[0];
    if (!trader) continue;
    await openInternal(
      { id: trader.id, name: trader.name, usdc: trader.usdc, wallet: trader.wallet },
      market,
      o.side === "buy" ? "long" : "short",
      o.size,
      o.leverage,
      { price: trigger, maker: true },
    );
  }
}

type Actor = { id: string; name: string; usdc: number; wallet: string };

async function openInternal(actor: Actor, market: MarketRow, side: "long" | "short", size: number, leverage: number, opts: { price?: number; maker?: boolean } = {}) {
  const h = await head(500);
  const price = opts.price ?? market.markPrice * (side === "long" ? 1 + 0.0004 : 1 - 0.0004);
  const notional = size * price;
  const fee = notional * ((opts.maker ? market.makerFeeBps : market.takerFeeBps) / 10_000);
  const margin = notional / leverage;
  if (margin + fee > actor.usdc) throw new ApiError(`Need ${(margin + fee).toFixed(2)} USDC of isolated margin, have ${actor.usdc.toFixed(2)}.`, 402);

  const existing = await db
    .select()
    .from(perpPositions)
    .where(and(eq(perpPositions.userId, actor.id), eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")))
    .limit(1);
  const current = existing[0];

  if (current && current.side === side) {
    const newSize = current.size + size;
    const newEntry = (current.entryPrice * current.size + price * size) / newSize;
    await db
      .update(perpPositions)
      .set({
        size: r6(newSize),
        entryPrice: r6(newEntry),
        margin: sql`${perpPositions.margin} + ${r6(margin)}`,
        leverage,
        liqPrice: r6(liqPrice(newEntry, leverage, side)),
      })
      .where(eq(perpPositions.id, current.id));
  } else if (current && current.side !== side) {
    const closing = Math.min(current.size, size);
    const pnl = unrealizedPnl({ side: current.side, entryPrice: current.entryPrice, size: closing }, price);
    const freed = (current.margin / current.size) * closing;
    const rest = current.size - size;
    if (rest <= 1e-6) {
      await db.update(perpPositions).set({ status: "closed", closedAt: new Date(), realizedPnl: sql`${perpPositions.realizedPnl} + ${r6(pnl)}`, margin: 0, size: 0 }).where(eq(perpPositions.id, current.id));
    } else {
      await db
        .update(perpPositions)
        .set({ size: r6(rest), realizedPnl: sql`${perpPositions.realizedPnl} + ${r6(pnl)}`, margin: sql`${perpPositions.margin} * ${rest / current.size}` })
        .where(eq(perpPositions.id, current.id));
    }
    await db.update(users).set({ usdc: sql`${users.usdc} + ${r6(freed + pnl - fee)}` }).where(eq(users.id, actor.id));
  } else {
    await db.insert(perpPositions).values({
      id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      marketId: market.id,
      marketSymbol: market.symbol,
      userId: actor.id,
      side,
      size: r6(size),
      entryPrice: r6(price),
      leverage,
      margin: r6(margin),
      liqPrice: r6(liqPrice(price, leverage, side)),
      openedAt: new Date(),
    });
  }

  await db
    .update(users)
    .set({ usdc: sql`greatest(0, ${users.usdc} - ${r6(current ? fee : margin + fee)})` })
    .where(eq(users.id, actor.id));
  await db
    .update(perpMarkets)
    .set({ openInterestUsd: sql`${perpMarkets.openInterestUsd} + ${r6(notional)}`, volume24hUsd: sql`${perpMarkets.volume24hUsd} + ${r6(notional)}` })
    .where(eq(perpMarkets.id, market.id));
  await db.insert(perpFills).values({
    id: `fil_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    marketId: market.id,
    marketSymbol: market.symbol,
    userId: actor.id,
    traderName: actor.name,
    action: "open",
    side,
    size: r6(size),
    price: r6(price),
    feeUsd: r6(fee),
    pnlUsd: 0,
    leverage,
    txHash: fakeTx(`open:${actor.id}:${market.id}`),
    blockNumber: h.headBlock,
  });
  await db.update(users).set({ points: sql`${users.points} + ${Math.max(1, Math.round(notional / 12))}` }).where(eq(users.id, actor.id));
  return { price, notional, fee, margin };
}

async function actorFor(user: PublicUser): Promise<Actor> {
  const fresh = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const row = fresh[0] ?? user;
  return { id: row.id, name: row.name, usdc: Number(row.usdc), wallet: row.wallet };
}

export async function openPosition(user: PublicUser, marketId: string, input: { side: "long" | "short"; size?: number; notionalUsd?: number; leverage: number; tpPct?: number; slPct?: number }) {
  const markets = await db.select().from(perpMarkets).where(eq(perpMarkets.id, marketId)).limit(1);
  const market = markets[0];
  if (!market) throw new ApiError("HIP-3 market not found.", 404);
  if (market.status !== "live") throw new ApiError("This venue is paused on testnet.", 409);
  const leverage = Math.max(1, Math.min(market.maxLeverage, Math.round(input.leverage || 10)));
  const price = market.markPrice * (input.side === "long" ? 1.0004 : 0.9996);
  const size = input.size && input.size > 0 ? input.size : (input.notionalUsd ?? 0) / price;
  if (!(size > 0)) throw new ApiError("Enter a size or notional greater than zero.", 400);
  const actor = await actorFor(user);
  const res = await openInternal(actor, market, input.side, size, leverage);
  const pos = await db.select().from(perpPositions).where(and(eq(perpPositions.userId, user.id), eq(perpPositions.marketId, marketId), eq(perpPositions.status, "open"))).limit(1);
  if (pos[0] && (input.tpPct || input.slPct)) {
    await db
      .update(perpPositions)
      .set({
        tpPrice: input.tpPct ? r6(price * (1 + (input.side === "long" ? input.tpPct : -input.tpPct))) : null,
        slPrice: input.slPct ? r6(price * (1 + (input.side === "long" ? -input.slPct : input.slPct))) : null,
      })
      .where(eq(perpPositions.id, pos[0].id));
  }
  return { ...res, position: pos[0] ? toPositionView(pos[0], market.markPrice) : null };
}

export async function closePosition(user: PublicUser, positionId: string, fraction = 1) {
  const rows = await db.select().from(perpPositions).where(eq(perpPositions.id, positionId)).limit(1);
  const p = rows[0];
  if (!p || p.userId !== user.id) throw new ApiError("Position not found.", 404);
  if (p.status === "closed") throw new ApiError("Position already closed.", 409);
  const markets = await db.select().from(perpMarkets).where(eq(perpMarkets.id, p.marketId)).limit(1);
  const market = markets[0]!;
  const h = await head(500);
  const portion = Math.max(0, Math.min(1, fraction));
  const size = p.size * portion;
  const price = market.markPrice * (p.side === "long" ? 0.9996 : 1.0004);
  const pnl = unrealizedPnl({ side: p.side, entryPrice: p.entryPrice, size }, price);
  const fee = size * price * (market.takerFeeBps / 10_000);
  const freed = p.margin * portion;
  const net = freed + pnl - fee - p.fundingAccrued * portion;

  if (portion >= 0.999) {
    await db
      .update(perpPositions)
      .set({ status: "closed", closedAt: new Date(), size: 0, margin: 0, realizedPnl: sql`${perpPositions.realizedPnl} + ${r6(pnl - p.fundingAccrued)}` })
      .where(eq(perpPositions.id, p.id));
  } else {
    await db
      .update(perpPositions)
      .set({ size: r6(p.size - size), margin: sql`${perpPositions.margin} - ${r6(freed)}`, realizedPnl: sql`${perpPositions.realizedPnl} + ${r6(pnl)}`, fundingAccrued: sql`${perpPositions.fundingAccrued} * ${1 - portion}` })
      .where(eq(perpPositions.id, p.id));
  }
  await db.update(users).set({ usdc: sql`${users.usdc} + ${r6(Math.max(0, net))}` }).where(eq(users.id, user.id));
  await db
    .update(perpMarkets)
    .set({ openInterestUsd: sql`greatest(0, ${perpMarkets.openInterestUsd} - ${r6(size * price)})`, volume24hUsd: sql`${perpMarkets.volume24hUsd} + ${r6(size * price)}` })
    .where(eq(perpMarkets.id, market.id));
  await db.insert(perpFills).values({
    id: `fil_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    marketId: market.id,
    marketSymbol: market.symbol,
    userId: user.id,
    traderName: user.name,
    action: "close",
    side: p.side,
    size: r6(size),
    price: r6(price),
    feeUsd: r6(fee),
    pnlUsd: r6(pnl),
    leverage: p.leverage,
    txHash: fakeTx(`close:${p.id}`),
    blockNumber: h.headBlock,
  });
  return { pnl: r6(pnl), net: r6(net), price: r6(price), txHash: fakeTx(`ack:${p.id}`) };
}

export async function placeTriggerOrder(user: PublicUser, marketId: string, input: { side: "buy" | "sell"; limitPrice: number; size: number; leverage: number; kind: "limit" | "stop" }) {
  const markets = await db.select().from(perpMarkets).where(eq(perpMarkets.id, marketId)).limit(1);
  const market = markets[0];
  if (!market) throw new ApiError("Market not found.", 404);
  if (!(input.size > 0) || !(input.limitPrice > 0)) throw new ApiError("Limit price and size are required for a resting order.", 400);
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(perpOrders).values({
    id,
    marketId,
    marketSymbol: market.symbol,
    userId: user.id,
    side: input.side,
    kind: input.kind,
    size: r6(input.size),
    limitPrice: r6(input.limitPrice),
    leverage: Math.max(1, Math.min(market.maxLeverage, input.leverage)),
    status: "resting",
  });
  const h = await head(500);
  await db.insert(perpFills).values({
    id: `fil_${Date.now()}_ack`,
    marketId,
    marketSymbol: market.symbol,
    userId: user.id,
    traderName: user.name,
    action: "place",
    side: input.side === "buy" ? "long" : "short",
    size: r6(input.size),
    price: r6(input.limitPrice),
    feeUsd: 0,
    pnlUsd: 0,
    leverage: input.leverage,
    txHash: fakeTx(`place:${id}`),
    blockNumber: h.headBlock,
  });
  return { id };
}

export async function cancelOrder(user: PublicUser, orderId: string) {
  const rows = await db.select().from(perpOrders).where(eq(perpOrders.id, orderId)).limit(1);
  const o = rows[0];
  if (!o || o.userId !== user.id) throw new ApiError("Order not found.", 404);
  if (o.status !== "resting") throw new ApiError("Order is no longer resting on the book.", 409);
  await db.update(perpOrders).set({ status: "canceled", updatedAt: new Date() }).where(eq(perpOrders.id, orderId));
  return { id: orderId };
}

export function toPositionView(p: typeof perpPositions.$inferSelect, mark: number): PerpPosition {
  const unrealized = unrealizedPnl({ side: p.side, entryPrice: p.entryPrice, size: p.size }, mark);
  return {
    id: p.id,
    marketId: p.marketId,
    marketSymbol: p.marketSymbol,
    side: p.side,
    size: p.size,
    entryPrice: p.entryPrice,
    leverage: p.leverage,
    margin: p.margin,
    liqPrice: p.liqPrice,
    markPrice: mark,
    unrealized: r6(unrealized),
    roe: p.margin ? (unrealized / p.margin) * 100 : 0,
    fundingAccrued: p.fundingAccrued,
    tpPrice: p.tpPrice,
    slPrice: p.slPrice,
    openedAt: p.openedAt.toISOString(),
  };
}

export async function userPositions(user: PublicUser) {
  const markets = await db.select().from(perpMarkets);
  const rows = await db.select().from(perpPositions).where(and(eq(perpPositions.userId, user.id), eq(perpPositions.status, "open"))).orderBy(desc(perpPositions.openedAt));
  const marks = new Map(markets.map((m) => [m.id, m.markPrice]));
  return {
    positions: rows.map((p) => toPositionView(p, marks.get(p.marketId) ?? p.entryPrice)),
    orders: await db
      .select()
      .from(perpOrders)
      .where(and(eq(perpOrders.userId, user.id), eq(perpOrders.status, "resting")))
      .orderBy(desc(perpOrders.createdAt)),
    fills: await db
      .select()
      .from(perpFills)
      .where(and(eq(perpFills.userId, user.id), gte(perpFills.createdAt, sql`now() - interval '7 days'`)))
      .orderBy(desc(perpFills.createdAt))
      .limit(40),
  };
}

export async function marketPanel(marketId: string, user: PublicUser | null) {
  const markets = await tickMarkets();
  const row = await db.select().from(perpMarkets).where(eq(perpMarkets.id, marketId)).limit(1);
  const market = row[0];
  if (!market) throw new ApiError("Market not found.", 404);
  const book = bookFor(market.symbol, market.markPrice, market.tickSize);
  for (const m of markets) await settleFunding(m);
  await sweep(market);
  const linked = market.launchId ? await db.select().from(launches).where(eq(launches.id, market.launchId)).limit(1) : [];
  const fills = await db.select().from(perpFills).where(eq(perpFills.marketId, market.id)).orderBy(desc(perpFills.createdAt)).limit(24);
  const views = await marketViews(user);
  const own = user ? await userPositions(user) : { positions: [], orders: [] as typeof perpOrders.$inferSelect[] };
  return {
    market: views.find((v) => v.id === market.id) ?? null,
    positions: own.positions,
    restingOrders: own.orders.map((o) => ({ id: o.id, symbol: o.marketSymbol, side: o.side, kind: o.kind, size: o.size, limitPrice: o.limitPrice, leverage: o.leverage, status: o.status })),
    book,
    tape: recentTape(market.symbol, market.markPrice),
    launch: linked[0] ? { slug: linked[0].slug, symbol: linked[0].symbol, stage: linked[0].stage, cashtag: linked[0].cashtag, holders: linked[0].holdersCount } : null,
    fills: fills.map((f) => ({
      id: f.id,
      action: f.action,
      side: f.side,
      size: f.size,
      price: f.price,
      pnlUsd: f.pnlUsd,
      traderName: f.traderName,
      txHash: f.txHash,
      blockNumber: f.blockNumber,
      createdAt: f.createdAt.toISOString(),
      mine: Boolean(user && f.userId === user.id),
    })),
    markets: views,
  };
}

export async function globalTape(limit = 24) {
  const rows = await db.select().from(perpFills).orderBy(desc(perpFills.createdAt)).limit(limit);
  return rows.map((f) => ({
    id: f.id,
    symbol: f.marketSymbol,
    action: f.action,
    side: f.side,
    size: f.size,
    price: f.price,
    pnlUsd: f.pnlUsd,
    traderName: f.traderName,
    createdAt: f.createdAt.toISOString(),
  }));
}
