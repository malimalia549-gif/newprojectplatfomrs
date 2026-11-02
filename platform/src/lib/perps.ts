/** Persistent, isolated-margin SANDBOX engine. No exchange or real funds are connected. */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { launches, perpFills, perpMarkets, perpOrders, perpPositions, users } from "@/db/schema";
import { ApiError, fakeTx, toPublicUser, type PublicUser } from "@/lib/auth";
import { notify } from "@/lib/forge";
import { head } from "@/lib/chain";
import { buildBook, liqPrice, nextMark, recentTape, unrealizedPnl, MAINT_MARGIN_BPS } from "@/lib/perp";
import { hashInt } from "@/lib/util";
import type { BookSnapshot, PerpMarket, PerpPosition } from "@/lib/dto";

const round = (n: number) => Number(n.toPrecision(12));
export type MarketRow = typeof perpMarkets.$inferSelect;
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export async function tickMarkets(): Promise<MarketRow[]> {
  const rows = await db.select().from(perpMarkets).orderBy(perpMarkets.id);
  const out: MarketRow[] = [];
  for (const m of rows) {
    const next = nextMark({ indexPrice: m.indexPrice, anchorPrice: m.anchorPrice, markPrice: m.markPrice, vol: m.vol, fundingHour: m.fundingHour, lastTickAt: m.lastTickAt.getTime() }, hashInt(m.symbol));
    const trail = [...JSON.parse(m.priceTrail || "[]") as number[], round(next.markPrice)].slice(-96);
    const [updated] = await db.update(perpMarkets).set({ indexPrice: round(next.indexPrice), markPrice: round(next.markPrice), anchorPrice: round(next.anchorPrice), fundingHour: round(next.fundingHour), lastTickAt: new Date(), open24hPrice: m.open24hPrice ?? next.markPrice, high24hPrice: Math.max(m.high24hPrice ?? next.markPrice, next.markPrice), low24hPrice: Math.min(m.low24hPrice ?? next.markPrice, next.markPrice), priceTrail: JSON.stringify(trail) }).where(eq(perpMarkets.id, m.id)).returning();
    out.push(updated);
  }
  return out;
}

function marketView(m: MarketRow, launch?: { slug: string; cashtag: string | null }): PerpMarket {
  return { id: m.id, symbol: m.symbol, venue: m.venue, indexPrice: m.indexPrice, markPrice: m.markPrice, change24h: m.open24hPrice ? (m.markPrice / m.open24hPrice - 1) * 100 : 0, fundingHour: m.fundingHour, fundingAnnual: m.fundingHour * 24 * 365, openInterestUsd: m.openInterestUsd, volume24hUsd: m.volume24hUsd, maxLeverage: m.maxLeverage, takerFeeBps: m.takerFeeBps, makerFeeBps: m.makerFeeBps, status: m.status, launchSlug: launch?.slug ?? null, cashtag: launch?.cashtag ?? null, high24h: m.high24hPrice ?? m.markPrice, low24h: m.low24hPrice ?? m.markPrice, trail: JSON.parse(m.priceTrail || "[]") };
}
export async function marketViews(_user: PublicUser | null): Promise<PerpMarket[]> {
  const [markets, linked] = await Promise.all([db.select().from(perpMarkets), db.select({ id: launches.id, slug: launches.slug, cashtag: launches.cashtag }).from(launches)]);
  return markets.map((m) => marketView(m, linked.find((l) => l.id === m.launchId)));
}
export function bookFor(symbol: string, mark: number, tick: number): BookSnapshot {
  const book = buildBook(symbol, mark, Math.min(tick, mark * 0.00025), Math.floor(Date.now() / 2600));
  const bid = book.bids[0].price, ask = book.asks[0].price;
  return { bids: book.bids, asks: book.asks, mid: (bid + ask) / 2, spreadBps: (ask - bid) / bid * 10000, imbalance: book.imbalanced };
}

/** Funding accrues once; it is deducted from equity, not twice from margin. */
export async function settleFunding(market: MarketRow) {
  const positions = await db.select().from(perpPositions).where(and(eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  const now = Date.now();
  for (const p of positions) {
    const hours = Math.max(0, Math.min(8, (now - p.lastFundingAt.getTime()) / 3_600_000));
    if (hours < 1 / 240) continue;
    const charge = round(market.fundingHour * hours * p.size * market.markPrice * (p.side === "long" ? 1 : -1));
    await db.update(perpPositions).set({ fundingAccrued: sql`${perpPositions.fundingAccrued} + ${charge}`, lastFundingAt: new Date(now) }).where(eq(perpPositions.id, p.id));
  }
}

async function recordFill(user: PublicUser, market: MarketRow, action: "open" | "close" | "liquidate" | "place" | "cancel", side: "long" | "short", size: number, price: number, feeUsd = 0, pnlUsd = 0, leverage = 1) {
  await db.insert(perpFills).values({ id: id("fil"), marketId: market.id, marketSymbol: market.symbol, userId: user.id, traderName: user.name, action, side, size: round(size), price: round(price), feeUsd: round(feeUsd), pnlUsd: round(pnlUsd), leverage, txHash: fakeTx("sandbox"), blockNumber: (await head()).headBlock });
}
async function credit(userId: string, amount: number) {
  await db.update(users).set({ usdc: sql`${users.usdc} + ${round(amount)}` }).where(eq(users.id, userId));
}
async function debit(userId: string, amount: number) {
  const [updated] = await db.update(users).set({ usdc: sql`${users.usdc} - ${round(amount)}` }).where(and(eq(users.id, userId), gte(users.usdc, round(amount)))).returning();
  if (!updated) throw new ApiError("Not enough sandbox USDC for margin and fees.", 402);
}
async function changeVolume(marketId: string, notional: number) {
  await db.update(perpMarkets).set({ volume24hUsd: sql`${perpMarkets.volume24hUsd} + ${round(notional)}` }).where(eq(perpMarkets.id, marketId));
}
async function syncOpenInterest(market: MarketRow) {
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${perpPositions.size} * ${market.markPrice}), 0)::float8` }).from(perpPositions).where(and(eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  await db.update(perpMarkets).set({ openInterestUsd: round(row.total) }).where(eq(perpMarkets.id, market.id));
}

export async function openPosition(user: PublicUser, marketId: string, input: { side: "long" | "short"; size?: number; notionalUsd?: number; leverage: number; tpPct?: number; slPct?: number }) {
  const [market] = await db.select().from(perpMarkets).where(eq(perpMarkets.id, marketId));
  if (!market) throw new ApiError("Market not found.", 404);
  if (market.status !== "live") throw new ApiError("Market is paused.", 409);
  if (!["long", "short"].includes(input.side) || !Number.isInteger(input.leverage) || input.leverage < 1 || input.leverage > market.maxLeverage) throw new ApiError("Invalid side or leverage.");
  await settleFunding(market);
  const price = market.markPrice * (input.side === "long" ? 1.0004 : 0.9996);
  const size = input.size && input.size > 0 ? input.size : (input.notionalUsd ?? 0) / price;
  const notional = size * price;
  if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(notional) || notional < 1 || notional > 100000) throw new ApiError("Sandbox order notional must be $1–$100,000.");
  const [current] = await db.select().from(perpPositions).where(and(eq(perpPositions.userId, user.id), eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  if (current && current.side !== input.side) throw new ApiError("Close the opposite position before reversing direction.", 409);
  if (current && current.leverage !== input.leverage) throw new ApiError("Use the existing position leverage, or close it first.", 409);
  const margin = notional / input.leverage;
  const fee = notional * market.takerFeeBps / 10000;
  await debit(user.id, margin + fee);
  if (current) {
    const combined = current.size + size;
    const entryPrice = (current.entryPrice * current.size + price * size) / combined;
    await db.update(perpPositions).set({ size: round(combined), entryPrice: round(entryPrice), margin: round(current.margin + margin), liqPrice: round(liqPrice(entryPrice, input.leverage, input.side)) }).where(eq(perpPositions.id, current.id));
  } else {
    const validTrigger = (v: number | undefined) => v === undefined || Number.isFinite(v) && v > 0 && v < 1;
    if (!validTrigger(input.tpPct) || !validTrigger(input.slPct)) throw new ApiError("TP/SL must be a positive fraction below 100%.");
    await db.insert(perpPositions).values({ id: id("pos"), userId: user.id, marketId, marketSymbol: market.symbol, side: input.side, size: round(size), entryPrice: round(price), margin: round(margin), leverage: input.leverage, liqPrice: round(liqPrice(price, input.leverage, input.side)), tpPrice: input.tpPct ? price * (1 + (input.side === "long" ? input.tpPct : -input.tpPct)) : null, slPrice: input.slPct ? price * (1 + (input.side === "long" ? -input.slPct : input.slPct)) : null });
  }
  await recordFill(user, market, "open", input.side, size, price, fee, 0, input.leverage);
  await changeVolume(market.id, notional);
  await syncOpenInterest(market);
  const [position] = await db.select().from(perpPositions).where(and(eq(perpPositions.userId, user.id), eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  return { price, notional, fee, margin, position: toPositionView(position, market.markPrice) };
}

export async function closePosition(user: PublicUser, positionId: string, fraction = 1, liquidation = false, executionMark?: number) {
  const [p] = await db.select().from(perpPositions).where(eq(perpPositions.id, positionId));
  if (!p || p.userId !== user.id) throw new ApiError("Position not found.", 404);
  if (p.status !== "open") throw new ApiError("Position already closed.", 409);
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) throw new ApiError("Close fraction must be between 0 and 1.");
  const [market] = await db.select().from(perpMarkets).where(eq(perpMarkets.id, p.marketId));
  await settleFunding(market);
  const [fresh] = await db.select().from(perpPositions).where(eq(perpPositions.id, p.id));
  const full = fraction >= 0.999999;
  const size = full ? fresh.size : fresh.size * fraction;
  const margin = full ? fresh.margin : fresh.margin * fraction;
  const funding = full ? fresh.fundingAccrued : fresh.fundingAccrued * fraction;
  const price = liquidation ? fresh.liqPrice : (executionMark ?? market.markPrice) * (fresh.side === "long" ? 0.9996 : 1.0004);
  const pnl = unrealizedPnl({ side: fresh.side, entryPrice: fresh.entryPrice, size }, price);
  const fee = liquidation ? 0 : size * price * market.takerFeeBps / 10000;
  const net = liquidation ? 0 : Math.max(0, margin + pnl - fee - funding);
  await db.update(perpPositions).set(full ? { status: "closed", closedAt: new Date(), size: 0, margin: 0, fundingAccrued: 0, realizedPnl: sql`${perpPositions.realizedPnl} + ${round(pnl - fee - funding)}` } : { size: round(fresh.size - size), margin: round(fresh.margin - margin), fundingAccrued: round(fresh.fundingAccrued - funding), realizedPnl: sql`${perpPositions.realizedPnl} + ${round(pnl - fee - funding)}` }).where(eq(perpPositions.id, p.id));
  await credit(user.id, net);
  await recordFill(user, market, liquidation ? "liquidate" : "close", fresh.side, size, price, fee, pnl - funding, fresh.leverage);
  await changeVolume(market.id, size * price);
  await syncOpenInterest(market);
  return { pnl: round(pnl), net: round(net), fee: round(fee), price, txHash: fakeTx("sandbox-close") };
}

/** Mark-to-market liquidation and actual TP/SL execution, only inside a ledger transaction. */
export async function sweep(market: MarketRow) {
  const positions = await db.select().from(perpPositions).where(and(eq(perpPositions.marketId, market.id), eq(perpPositions.status, "open")));
  for (const p of positions) {
    const pnl = unrealizedPnl(p, market.markPrice);
    const liquidated = margin_equity(p.margin, pnl, p.fundingAccrued) <= p.size * market.markPrice * MAINT_MARGIN_BPS;
    const tp = p.tpPrice !== null && (p.side === "long" ? market.markPrice >= p.tpPrice : market.markPrice <= p.tpPrice);
    const sl = p.slPrice !== null && (p.side === "long" ? market.markPrice <= p.slPrice : market.markPrice >= p.slPrice);
    if (!liquidated && !tp && !sl) continue;
    const [owner] = await db.select().from(users).where(eq(users.id, p.userId));
    if (!owner) continue;
    await closePosition(toPublicUser(owner), p.id, 1, liquidated, market.markPrice);
    await notify(p.userId, liquidated ? "liquidation" : "fill", `${market.symbol} ${liquidated ? "liquidated" : tp ? "take profit filled" : "stop loss filled"}`, "Sandbox position closed by the mark-to-market sweep.");
  }
  const orders = await db.select().from(perpOrders).where(and(eq(perpOrders.marketId, market.id), eq(perpOrders.status, "resting"))).orderBy(perpOrders.createdAt);
  for (const order of orders) {
    const trigger = order.limitPrice ?? 0;
    const hit = order.kind === "limit" ? (order.side === "buy" ? market.markPrice <= trigger : market.markPrice >= trigger) : (order.side === "buy" ? market.markPrice >= trigger : market.markPrice <= trigger);
    if (!hit) continue;
    const [owner] = await db.select().from(users).where(eq(users.id, order.userId));
    if (!owner) continue;
    // Reserved funds are returned before executing the same atomic fill.
    await credit(owner.id, order.reservedUsd);
    try {
      await openPosition(toPublicUser(owner), market.id, { side: order.side === "buy" ? "long" : "short", size: order.size, leverage: order.leverage });
      await db.update(perpOrders).set({ status: "filled", reservedUsd: 0, updatedAt: new Date() }).where(eq(perpOrders.id, order.id));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      await db.update(perpOrders).set({ status: "canceled", reservedUsd: 0, updatedAt: new Date() }).where(eq(perpOrders.id, order.id));
      await notify(owner.id, "system", "Resting order canceled", e.message);
    }
  }
}
const margin_equity = (margin: number, pnl: number, funding: number) => margin + pnl - funding;

export async function placeTriggerOrder(user: PublicUser, marketId: string, input: { side: "buy" | "sell"; limitPrice: number; size: number; leverage: number; kind: "limit" | "stop" }) {
  const [market] = await db.select().from(perpMarkets).where(eq(perpMarkets.id, marketId));
  if (!market || market.status !== "live") throw new ApiError("Market unavailable.", 409);
  if (!["buy", "sell"].includes(input.side) || !["limit", "stop"].includes(input.kind) || !Number.isInteger(input.leverage) || input.leverage < 1 || input.leverage > market.maxLeverage || !Number.isFinite(input.size) || input.size <= 0 || !Number.isFinite(input.limitPrice) || input.limitPrice <= 0) throw new ApiError("Invalid resting order.");
  const notional = input.size * input.limitPrice;
  if (notional < 1 || notional > 100000) throw new ApiError("Order notional must be $1–$100,000.");
  const reservedUsd = notional / input.leverage * (1 + market.takerFeeBps / 10000);
  await debit(user.id, reservedUsd);
  const orderId = id("ord");
  await db.insert(perpOrders).values({ id: orderId, marketId, marketSymbol: market.symbol, userId: user.id, side: input.side, kind: input.kind, size: input.size, limitPrice: input.limitPrice, leverage: input.leverage, reservedUsd, status: "resting" });
  await recordFill(user, market, "place", input.side === "buy" ? "long" : "short", input.size, input.limitPrice, 0, 0, input.leverage);
  return { id: orderId, reservedUsd };
}
export async function cancelOrder(user: PublicUser, orderId: string) {
  const [order] = await db.select().from(perpOrders).where(and(eq(perpOrders.id, orderId), eq(perpOrders.userId, user.id)));
  if (!order) throw new ApiError("Order not found.", 404);
  if (order.status !== "resting") throw new ApiError("Order is no longer resting.", 409);
  await db.update(perpOrders).set({ status: "canceled", reservedUsd: 0, updatedAt: new Date() }).where(eq(perpOrders.id, orderId));
  await credit(user.id, order.reservedUsd);
  return { id: orderId };
}

export function toPositionView(p: typeof perpPositions.$inferSelect, mark: number): PerpPosition {
  const pnl = unrealizedPnl(p, mark) - p.fundingAccrued;
  return { id: p.id, marketId: p.marketId, marketSymbol: p.marketSymbol, side: p.side, size: p.size, entryPrice: p.entryPrice, leverage: p.leverage, margin: p.margin, liqPrice: p.liqPrice, markPrice: mark, unrealized: round(pnl), roe: p.margin ? pnl / p.margin * 100 : 0, fundingAccrued: p.fundingAccrued, tpPrice: p.tpPrice, slPrice: p.slPrice, openedAt: p.openedAt.toISOString() };
}
export async function userPositions(user: PublicUser) {
  const markets = await db.select().from(perpMarkets);
  const marks = new Map(markets.map((m) => [m.id, m.markPrice]));
  const rows = await db.select().from(perpPositions).where(and(eq(perpPositions.userId, user.id), eq(perpPositions.status, "open"))).orderBy(desc(perpPositions.openedAt));
  return { positions: rows.map((p) => toPositionView(p, marks.get(p.marketId) ?? p.entryPrice)), orders: await db.select().from(perpOrders).where(and(eq(perpOrders.userId, user.id), eq(perpOrders.status, "resting"))).orderBy(desc(perpOrders.createdAt)), fills: await db.select().from(perpFills).where(and(eq(perpFills.userId, user.id), gte(perpFills.createdAt, sql`now() - interval '7 days'`))).orderBy(desc(perpFills.createdAt)).limit(40) };
}
export async function marketPanel(marketId: string, user: PublicUser | null) {
  const markets = await db.select().from(perpMarkets);
  const market = markets.find((m) => m.id === marketId);
  if (!market) throw new ApiError("Market not found.", 404);
  const linked = market.launchId ? await db.select().from(launches).where(eq(launches.id, market.launchId)).limit(1) : [];
  const fills = await db.select().from(perpFills).where(eq(perpFills.marketId, market.id)).orderBy(desc(perpFills.createdAt)).limit(24);
  const views = await marketViews(user);
  const own = user ? await userPositions(user) : { positions: [], orders: [] as typeof perpOrders.$inferSelect[] };
  return { market: views.find((v) => v.id === market.id)!, positions: own.positions, restingOrders: own.orders.map((o) => ({ id: o.id, symbol: o.marketSymbol, side: o.side, kind: o.kind, size: o.size, limitPrice: o.limitPrice, leverage: o.leverage, status: o.status })), book: bookFor(market.symbol, market.markPrice, market.tickSize), tape: recentTape(market.symbol, market.markPrice), launch: linked[0] ? { slug: linked[0].slug, symbol: linked[0].symbol, stage: linked[0].stage, cashtag: linked[0].cashtag, holders: linked[0].holdersCount } : null, fills: fills.map((f) => ({ id: f.id, action: f.action, side: f.side, size: f.size, price: f.price, pnlUsd: f.pnlUsd, traderName: f.traderName, txHash: f.txHash, blockNumber: f.blockNumber, createdAt: f.createdAt.toISOString(), mine: f.userId === user?.id })), markets: views };
}
export async function globalTape(limit = 24) {
  const rows = await db.select().from(perpFills).orderBy(desc(perpFills.createdAt)).limit(limit);
  return rows.map((f) => ({ id: f.id, symbol: f.marketSymbol, action: f.action, side: f.side, size: f.size, price: f.price, pnlUsd: f.pnlUsd, traderName: f.traderName, createdAt: f.createdAt.toISOString() }));
}
export async function simulationTick() {
  const { advanceSandboxHead } = await import("@/lib/chain");
  const { accrueAll } = await import("@/lib/stoke");
  await advanceSandboxHead();
  const markets = await tickMarkets();
  for (const market of markets) { await settleFunding(market); await sweep(market); }
  await accrueAll();
  return { at: Date.now(), markets: markets.length, live: false };
}
