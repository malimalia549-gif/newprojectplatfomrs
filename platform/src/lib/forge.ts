import { and, asc, desc, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  holders,
  launches,
  lifecycleEvents,
  notifications,
  perpMarkets,
  pointEvents,
  trades,
  users,
  type LaunchStage,
  type TicketState,
} from "@/db/schema";
import { ApiError, addressFor, fakeTx, toPublicUser, type PublicUser } from "@/lib/auth";
import { addFees, head } from "@/lib/chain";
import { CURVE, buyQuote, isFull, marginalPrice, marketCapHype, poolSeed, progressPct, sellQuote, feeSplit } from "@/lib/curve";
import { consumeCheckout, shareText } from "@/lib/xmoney";
import { fmtCompact, hashInt, normalizeSymbol, rng, slugify, symbolIssue } from "@/lib/util";
import type { HolderRow, LaunchDetail, LaunchSummary, TradeRow } from "@/lib/dto";

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const launchFeeHype = 0.05;

export type LaunchRow = typeof launches.$inferSelect;

export async function awardPoints(userId: string, delta: number, reason: string) {
  await db.insert(pointEvents).values({ id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, userId, delta, reason });
  await db.update(users).set({ points: sql`${users.points} + ${delta}` }).where(eq(users.id, userId));
}

export async function notify(userId: string, kind: "graduation" | "fill" | "liquidation" | "payment" | "airdrop" | "system", title: string, body: string, href?: string) {
  await db.insert(notifications).values({ id: `nt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, userId, kind, title, body, href: href ?? null });
}

function stageLabel(stage: LaunchStage) {
  return (
    {
      created: "created",
      trading: "trading on the curve",
      frozen: "curve sold out — frozen",
      graduating: "graduating (settlement ticket in flight)",
      graduated: "graduated to liquidity pool + HyperCore spot",
      perp_listed: "HIP-3 perp market live",
    } as Record<LaunchStage, string>
  )[stage];
}

async function priceChange(launchId: string, currentPrice: number) {
  const rows = await db
    .select({ price: trades.priceAfter })
    .from(trades)
    .where(and(eq(trades.launchId, launchId), gte(trades.createdAt, sql`now() - interval '24 hours'`)))
    .orderBy(asc(trades.createdAt))
    .limit(1);
  const open = rows[0]?.price;
  if (!open) return 0;
  return ((currentPrice - open) / open) * 100;
}

export async function toSummary(l: LaunchRow, hypeUsd: number, userId?: string | null): Promise<LaunchSummary> {
  const curveState = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };
  const priceHype = l.stage === "graduated" || l.stage === "perp_listed" ? (l.poolLiquidityHype || l.raisedHype) / (l.poolTokens || CURVE.bookTokens) : marginalPrice(curveState);
  const mcap = priceHype * l.totalSupply;
  const change = await priceChange(l.id, marginalPrice(curveState));
  let myBalance = 0;
  if (userId) {
    const mine = await db.select().from(holders).where(and(eq(holders.launchId, l.id), eq(holders.userId, userId))).limit(1);
    myBalance = mine[0]?.amount ?? 0;
  }
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    symbol: l.symbol,
    description: l.description,
    glyph: l.glyph,
    accent: l.accent,
    category: l.category,
    creatorName: l.creatorName,
    xHandle: l.xHandle,
    cashtag: l.cashtag,
    stage: l.stage,
    ticket: l.ticket,
    soldTokens: l.soldTokens,
    raisedHype: l.raisedHype,
    graduationHype: l.graduationHype,
    progressPct: progressPct(curveState),
    priceHype,
    priceUsd: priceHype * hypeUsd,
    marketCapHype: mcap,
    marketCapUsd: mcap * hypeUsd,
    holdersCount: l.holdersCount,
    tradesCount: l.tradesCount,
    volumeHype: l.volumeHype,
    change24h: change,
    perpMarketId: l.perpMarketId,
    poolAddress: l.poolAddress,
    createdAt: l.createdAt.toISOString(),
    graduatedAt: l.graduatedAt ? l.graduatedAt.toISOString() : null,
    myBalance,
    myStakeHype: 0,
  };
}

export async function getLaunch(slug: string) {
  const rows = await db.select().from(launches).where(or(eq(launches.slug, slug), eq(launches.symbol, slug.toUpperCase()))).limit(1);
  const l = rows[0];
  if (!l) throw new ApiError("No launch with that ticker or slug.", 404);
  return l;
}

export async function launchDetail(slug: string, user: PublicUser | null): Promise<LaunchDetail> {
  const l = await getLaunch(slug);
  const h = await head();
  const base = await toSummary(l, h.hypeUsd, user?.id);
  const curveState = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };

  const [tradeRows, holderRows, eventRows] = await Promise.all([
    db.select().from(trades).where(eq(trades.launchId, l.id)).orderBy(desc(trades.createdAt)).limit(40),
    db
      .select({ amount: sql<number>`coalesce(sum(${holders.amount}),0)::float8`, wallet: sql<string>`min(${holders.wallet})`, name: sql<string | null>`min(${users.name})` })
      .from(holders)
      .leftJoin(users, eq(holders.userId, users.id))
      .where(eq(holders.launchId, l.id))
      .groupBy(holders.userId, holders.wallet, users.name)
      .orderBy(desc(sql`sum(${holders.amount})`))
      .limit(10),
    db.select().from(lifecycleEvents).where(eq(lifecycleEvents.launchId, l.id)).orderBy(asc(lifecycleEvents.createdAt)),
  ]);

  const trail = await db
    .select({ price: trades.priceAfter, at: trades.createdAt })
    .from(trades)
    .where(eq(trades.launchId, l.id))
    .orderBy(asc(trades.createdAt))
    .limit(120);
  const startPrice = marginalPrice({ sold: 0, raised: 0, graduationHype: l.graduationHype, feeBps: l.feeBps });
  const curve = [
    { t: 0, price: startPrice, mcap: startPrice * CURVE.totalSupply },
    ...trail.map((row, i) => ({ t: i + 1, price: Number(row.price), mcap: Number(row.price) * CURVE.totalSupply })),
  ];

  const holderList: HolderRow[] = holderRows.map((row, i) => ({
    rank: i + 1,
    wallet: row.wallet,
    name: row.name,
    amount: Number(row.amount),
    pct: (Number(row.amount) / CURVE.totalSupply) * 100,
    isPool: false,
  }));
  const curveRemaining = Math.max(0, CURVE.sellable - l.soldTokens);
  const poolBag = l.stage === "graduated" || l.stage === "perp_listed" ? l.poolTokens : CURVE.bookTokens;
  holderList.push({ rank: holderList.length + 1, wallet: "0x…curvecurve", name: "LaunchPool (virtual)", amount: curveRemaining, pct: (curveRemaining / CURVE.totalSupply) * 100, isPool: true });
  if (poolBag > 0) holderList.push({ rank: holderList.length + 1, wallet: l.poolAddress ?? "0x…poolpool", name: "LP / spot book", amount: poolBag, pct: (poolBag / CURVE.totalSupply) * 100, isPool: true });

  const rows: TradeRow[] = tradeRows.map((t) => ({
    id: t.id,
    side: t.side,
    traderName: t.traderName,
    traderWallet: t.traderWallet,
    hypeAmount: t.hypeAmount,
    tokenAmount: t.tokenAmount,
    priceAfter: t.priceAfter,
    txHash: t.txHash,
    blockNumber: t.blockNumber,
    createdAt: t.createdAt.toISOString(),
    mine: Boolean(user && t.userId === user.id),
  }));

  return {
    ...base,
    tokenAddress: l.tokenAddress,
    poolLiquidityHype: l.poolLiquidityHype,
    poolTokens: l.poolTokens,
    lpLockedUntil: l.lpLockedUntil ? l.lpLockedUntil.toISOString() : null,
    hypercoreSpotIndex: l.hypercoreSpotIndex,
    perpSymbol: l.perpMarketId ? l.symbol : null,
    creatorHype: l.creatorHype,
    treasuryHype: l.treasuryHype,
    tickerReserve: l.tickerReserve,
    feeBps: l.feeBps,
    tgeBoost: l.tgeBoost,
    paidWith: l.paidWith,
    paymentRef: l.paymentRef,
    listedAt: l.listedAt ? l.listedAt.toISOString() : null,
    curve,
    trades: rows,
    holders: holderList.sort((a, b) => b.amount - a.amount).slice(0, 12),
    events: eventRows.map((e) => ({
      id: e.id,
      step: e.step,
      label: e.label,
      detail: e.detail,
      txHash: e.txHash,
      createdAt: e.createdAt.toISOString(),
    })),
    nextAction: nextAction(l),
  };
}

export function nextAction(l: LaunchRow): LaunchDetail["nextAction"] {
  if (l.stage === "trading" && !isFull({ sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps })) return null;
  if (l.stage === "trading") return { action: "graduate", label: "Freeze curve", hint: "800M sold — anyone can trigger graduation", costHype: 0 };
  if (l.stage === "frozen") return { action: "graduate", label: "graduate()", hint: "Settlement.openTicket — moves HYPE + 200M book tokens", costHype: 0 };
  if (l.ticket === "open") return { action: "dispatch", label: "dispatch()", hint: "Bridge legs: mirror → escrow, HYPE → ArbSys.withdrawEth", costHype: 0 };
  if (l.ticket === "dispatched")
    return { action: "confirm", label: "confirm() listing", hint: "Outbox claim + HIP-1 registerToken2, ticker budget enforced", costHype: l.tickerReserve };
  if (l.stage === "graduated") return { action: "deployPerp", label: "Deploy HIP-3 venue", hint: "Open a simulated perp venue — no HYPE stake is charged in this sandbox", costHype: 0 };
  if (l.stage === "perp_listed" && !l.cashtag)
    return { action: "listCashtag", label: "List $CASHTAG on X", hint: "Smart Cashtag + pinned announcement, paid with X Money", costHype: 0 };
  return null;
}

/* ------------------------------------------------------------------ *
 * Create
 * ------------------------------------------------------------------ */

export async function createLaunch(
  user: PublicUser,
  input: {
    name: string;
    symbol: string;
    description: string;
    category: "meme" | "infra" | "rwa" | "gaming" | "ai" | "dao";
    accent?: string;
    glyph?: string;
    xHandle?: string;
    graduationHype?: number;
    initialBuyHype?: number;
    paymentRef?: string;
  },
) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 28) throw new ApiError("Token name must be 2–28 characters.");
  const symbol = normalizeSymbol(input.symbol);
  const issue = symbolIssue(symbol);
  if (issue) throw new ApiError(issue);
  const description = (input.description ?? "").trim().slice(0, 280);
  const graduationHype = Math.max(6, Math.min(600, input.graduationHype ?? 45));

  const dupe = await db.select({ id: launches.id }).from(launches).where(or(eq(launches.symbol, symbol), eq(launches.slug, slugify(name)))).limit(1);
  if (dupe[0]) throw new ApiError(`“${symbol}” is already taken — ticker uniqueness is enforced across all launches.`, 409);

  // pay the launch fee either from the HYPE balance or a settled X Money intent
  let paidWith: "x_money" | "hype" = "hype";
  let paymentRef: string | null = null;
  if (input.paymentRef) {
    const settled = await consumeCheckout(input.paymentRef, "", user.id, "launch_fee");
    if (settled.amountHype + 1e-8 < launchFeeHype) throw new ApiError("This receipt does not cover the launch fee.", 400);
    paidWith = "x_money";
    paymentRef = settled.reference;
  } else {
    if (user.hype < launchFeeHype) throw new ApiError(`Not enough testnet HYPE for the ${launchFeeHype} HYPE launch fee — use the faucet or pay with X Money.`, 402);
    await db.update(users).set({ hype: sql`${users.hype} - ${launchFeeHype}` }).where(eq(users.id, user.id));
  }

  let slug = slugify(name) || symbol.toLowerCase();
  const clash = await db.select({ id: launches.id }).from(launches).where(eq(launches.slug, slug)).limit(1);
  if (clash[0]) slug = `${slug}-${hashInt(symbol) % 997}`;

  const id = `lch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(launches).values({
    id,
    slug,
    name,
    symbol,
    description,
    creatorId: user.id,
    creatorName: user.name,
    accent: input.accent ?? "#7ce0ff",
    glyph: input.glyph ?? symbol.slice(0, 1),
    category: input.category ?? "meme",
    xHandle: input.xHandle ? input.xHandle.replace(/^@/, "").toLowerCase() : null,
    totalSupply: CURVE.totalSupply,
    graduationHype,
    tickerReserve: Math.max(0.5, graduationHype * 0.05),
    stage: "trading",
    tokenAddress: addressFor(`${symbol}:${id}`),
    paidWith,
    paymentRef,
    soldTokens: 0,
    raisedHype: 0,
  });

  await pushEvent(id, "created", "launch() — CorePadFactory style deploy", `1,000,000,000 ${symbol} minted to the launch pool · curve live on Elysium 99801`);
  await pushEvent(id, "trading", "Trading open", `1% fee on the HYPE leg · 25% to creator · graduation at 800M sold`);
  await awardPoints(user.id, 500, "launch");
  await db.update(users).set({ role: sql`case when ${users.role} = 'trader' then 'creator' else ${users.role} end` }).where(eq(users.id, user.id));

  const initial = input.initialBuyHype ?? 0;
  if (!Number.isFinite(initial) || initial < 0 || initial > 3) throw new ApiError("Founder buy must be between 0 and 3 HYPE.", 400);
  if (initial > 0) {
    const [fresh] = await db.select().from(users).where(eq(users.id, user.id));
    await applyTrade(id, toPublicUser(fresh!), "buy", initial, 200);
  }

  const created = await db.select().from(launches).where(eq(launches.id, id)).limit(1);
  return launchDetail(created[0]!.slug, user);
}

export async function pushEvent(launchId: string, step: "created" | "trading" | "frozen" | "graduating" | "graduated" | "perp_listed" | "aborted", label: string, detail?: string, txHash?: string) {
  await db.insert(lifecycleEvents).values({ id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, launchId, step, label, detail: detail ?? null, txHash: txHash ?? null });
}

/* ------------------------------------------------------------------ *
 * Trading on the curve
 * ------------------------------------------------------------------ */

async function applyTrade(launchId: string, actor: PublicUser, side: "buy" | "sell", amount: number, slippageBps: number, expectedOut?: number) {
  const [userRow] = await db.select().from(users).where(eq(users.id, actor.id));
  if (!userRow) throw new ApiError("Account not found.", 401);
  const user = toPublicUser(userRow);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) throw new ApiError("Invalid amount or slippage.");

  const rows = await db.select().from(launches).where(eq(launches.id, launchId)).limit(1);
  const l = rows[0];
  if (!l) throw new ApiError("Launch not found.", 404);
  if (l.stage !== "trading") throw new ApiError(`Curve is ${l.stage} — spot trading happens on the graduated pool / HyperCore book.`, 409);

  const state = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };
  const h = await head();
  let quote;
  let spendHype = 0;
  let tokensOut = 0;

  if (side === "buy") {
    spendHype = amount;
    if (spendHype < 0.01) throw new ApiError("Minimum buy is 0.01 HYPE.");
    if (user.hype < spendHype) throw new ApiError(`Balance is ${user.hype.toFixed(4)} HYPE — top up via the faucet or X Money.`, 402);
    quote = buyQuote(state, spendHype, slippageBps);
    spendHype = quote.spent;
    tokensOut = quote.out;
    if (user.hype < spendHype) throw new ApiError("Insufficient HYPE.", 402);
    await db.update(users).set({ hype: sql`${users.hype} - ${r6(spendHype)}` }).where(eq(users.id, user.id));
  } else {
    const held = await db.select().from(holders).where(and(eq(holders.launchId, launchId), eq(holders.userId, user.id))).limit(1);
    const bag = held[0]?.amount ?? 0;
    const tokensIn = amount;
    if (tokensIn <= 0) throw new ApiError("You hold no tokens in this launch.", 400);
    quote = sellQuote(state, tokensIn, slippageBps);
    spendHype = -quote.out;
    tokensOut = -tokensIn;
    if (bag < tokensIn) throw new ApiError("Selling more than you hold.", 400);
    await db.update(holders).set({ amount: sql`${holders.amount} - ${r6(tokensIn)}`, updatedAt: new Date() }).where(and(eq(holders.launchId, launchId), eq(holders.userId, user.id)));
    await db.update(users).set({ hype: sql`${users.hype} + ${r6(quote.out)}` }).where(eq(users.id, user.id));
  }

  if (expectedOut !== undefined && (!Number.isFinite(expectedOut) || expectedOut < 0 || quote.out + 1e-8 < expectedOut * (1 - slippageBps / 10000))) throw new ApiError("Price moved beyond your slippage tolerance. Refresh the quote.", 409);

  const newSold = Math.min(CURVE.sellable, Math.max(0, side === "buy" ? state.sold + quote.out : state.sold - Math.abs(tokensOut)));
  const newRaised = side === "buy" ? quote.raisedAfter : quote.raisedAfter;
  const split = feeSplit(quote.fee);
  const frozen = newSold >= CURVE.sellable - 1;

  await db
    .update(launches)
    .set({
      soldTokens: r6(newSold),
      raisedHype: r6(newRaised),
      volumeHype: sql`${launches.volumeHype} + ${r6(Math.abs(side === "buy" ? spendHype : quote.out))}`,
      treasuryHype: sql`${launches.treasuryHype} + ${r6(split.treasury)}`,
      creatorHype: sql`${launches.creatorHype} + ${r6(split.creator)}`,
      tradesCount: sql`${launches.tradesCount} + 1`,
      stage: frozen ? "frozen" : "trading",
    })
    .where(eq(launches.id, launchId));

  if (side === "buy") {
    await db
      .insert(holders)
      .values({ id: `hld_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, launchId, userId: user.id, wallet: user.wallet, amount: r6(tokensOut) })
      .onConflictDoUpdate({ target: [holders.launchId, holders.userId], set: { amount: sql`${holders.amount} + ${r6(tokensOut)}`, updatedAt: new Date() } });
  }

  const countRow = await db.select({ n: sql<number>`count(*)::int` }).from(holders).where(and(eq(holders.launchId, launchId), sql`${holders.amount} > 0`));
  await db.update(launches).set({ holdersCount: countRow[0]?.n ?? 0 }).where(eq(launches.id, launchId));

  const tx = fakeTx(`${launchId}:${user.id}:${side}`);
  await db.insert(trades).values({
    id: `trd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    launchId,
    userId: user.id,
    traderName: user.name,
    traderWallet: user.wallet,
    side,
    hypeAmount: r6(Math.abs(side === "buy" ? spendHype : quote.out)),
    tokenAmount: r6(Math.abs(tokensOut)),
    feeHype: r6(quote.fee),
    priceAfter: quote.priceAfter,
    txHash: tx,
    blockNumber: h.headBlock,
    createdAt: new Date(),
  });

  await addFees(split.treasury, (split.stokeBuyback / (h.stokeUsd || 0.04)) * 1);
  await awardPoints(user.id, Math.max(2, Math.round((side === "buy" ? spendHype : quote.out) * 120)), `curve_${side}`);

  if (frozen) {
    await pushEvent(launchId, "frozen", "Curve sold out — 800M absorbed", "Pool frozen. Anyone can now call graduate().", tx);
    if (l.creatorId) await notify(l.creatorId, "graduation", `${l.symbol} is ready to graduate`, "Bonding curve completed. Trigger graduation to settle onto the pool + HyperCore book.", `/token/${l.slug}`);
  }

  return { tx, tokensOut: Math.abs(tokensOut), hypeOut: Math.abs(side === "buy" ? spendHype : quote.out), priceAfter: quote.priceAfter, impactPct: quote.impactPct };
}

export async function tradeLaunch(user: PublicUser, slug: string, side: "buy" | "sell", amount: number, slippageBps = 50, expectedOut?: number) {
  const l = await getLaunch(slug);
  const out = await applyTrade(l.id, user, side, amount, slippageBps, expectedOut);
  return { ...out, detail: await launchDetail(l.slug, user) };
}

export async function quoteLaunch(slug: string, side: "buy" | "sell", amount: number) {
  const l = await getLaunch(slug);
  const state = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };
  const h = await head();
  if (side === "buy") {
    const q = buyQuote(state, Math.max(0, amount), 50);
    return { out: q.out, spent: q.spent, fee: q.fee, priceAfter: q.priceAfter, impactPct: q.impactPct, usdOut: side === "buy" ? q.out * q.priceAfter * h.hypeUsd : q.out * h.hypeUsd, progress: progressPct({ ...state, sold: q.soldAfter }) };
  }
  const q = sellQuote(state, Math.max(0, amount), 50);
  return { out: q.out, spent: q.spent, fee: q.fee, priceAfter: q.priceAfter, impactPct: q.impactPct, usdOut: q.out * h.hypeUsd, progress: progressPct({ ...state, sold: q.soldAfter }) };
}

/* ------------------------------------------------------------------ *
 * Graduate → bridge → Uniswap pool → HIP-3 → X cashtag
 * ------------------------------------------------------------------ */

export async function advanceLifecycle(user: PublicUser, slug: string, action: "graduate" | "dispatch" | "confirm" | "abort" | "deployPerp" | "listCashtag", args?: { paymentRef?: string; code?: string }) {
  const l = await getLaunch(slug);
  if (action !== "graduate" && l.creatorId !== user.id && user.role !== "admin" && user.role !== "keeper") throw new ApiError("Only the creator or sandbox keeper may operate this settlement ticket.", 403);
  const [actor] = await db.select().from(users).where(eq(users.id, user.id));
  const tx = fakeTx(`${l.id}:${action}:${user.id}`);
  const h = await head();

  if (action === "graduate") {
    if (l.stage !== "frozen" && l.stage !== "trading") throw new ApiError(`Nothing to graduate while stage is ${l.stage}.`, 409);
    if (!isFull({ sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps }))
      throw new ApiError(`Curve is only ${progressPct({ sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype }).toFixed(1)}% absorbed.`, 409);
    await db.update(launches).set({ stage: "graduating", ticket: "open" }).where(eq(launches.id, l.id));
    await pushEvent(l.id, "graduating", "graduate() → Settlement Ticket{Open}", `${l.raisedHype.toFixed(4)} HYPE + 200,000,000 book tokens locked for dispatch`, tx);
    await awardPoints(user.id, 150, "graduate_call");
  }

  if (action === "dispatch") {
    if (l.ticket !== "open") throw new ApiError("No open settlement ticket to dispatch.", 409);
    await db.update(launches).set({ ticket: "dispatched" }).where(eq(launches.id, l.id));
    await pushEvent(
      l.id,
      "graduating",
      "dispatch() → ElysiumBridgeAdapter",
      "tokens: approve(escrow) + Router.outboundTransfer(mirror) · HYPE: ArbSys(0x64).withdrawEth → coreSettler · HyperEVM challenge window started",
      tx,
    );
  }

  if (action === "confirm") {
    if (l.ticket !== "dispatched") throw new ApiError("Dispatch the settlement ticket first.", 409);
    const cost = l.tickerReserve;
    if (actor.hype < cost) throw new ApiError(`Ticker auction budget is ${cost} HYPE — the keeper enforces tickerBudget.`, 402);
    await db.update(users).set({ hype: sql`${users.hype} - ${cost}` }).where(eq(users.id, user.id));
    const seed = poolSeed({ sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps });
    const spotIndex = 100 + (hashInt(l.symbol) % 800);
    await db
      .update(launches)
      .set({
        stage: "graduated",
        ticket: "confirmed",
        graduatedAt: new Date(),
        poolAddress: addressFor(`pool:${l.symbol}`),
        poolLiquidityHype: r6(seed.liquidityHype),
        poolTokens: r6(seed.tokens),
        lpLockedUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 4),
        hypercoreSpotIndex: spotIndex,
      })
      .where(eq(launches.id, l.id));
    await pushEvent(l.id, "graduated", "confirm() → Uniswap V3 pool + HyperCore spot", `Outbox claimed · HIP-1 registerToken2(${spotIndex}) · TOKEN/USDC ladder seeded at ${seed.listPrice.toExponential(3)} HYPE · LP locked 4y`, tx);
    if (l.creatorId) await notify(l.creatorId, "graduation", `${l.symbol} graduated`, `Pool live on Elysium, spot book index ${spotIndex} on HyperCore.`, `/token/${l.slug}`);
  }

  if (action === "abort") {
    if (l.ticket === "confirmed" || !["open", "dispatched"].includes(l.ticket)) throw new ApiError("Ticket already confirmed — the rescue window is closed.", 409);
    await db.update(launches).set({ stage: "trading", ticket: "aborted" }).where(eq(launches.id, l.id));
    await pushEvent(l.id, "aborted", "abort() → LaunchPool.reopen()", "Curve resumes where it stopped; holders can sell again and it may graduate twice.", tx);
  }

  if (action === "deployPerp") {
    if (l.stage !== "graduated") throw new ApiError("Graduate the launch before deploying a HIP-3 venue.", 409);
    const marketId = `hip3_${l.symbol.toLowerCase()}_${hashInt(l.symbol) % 9973}`;
    const indexPrice = seedPerpPrice(l, h.hypeUsd);
    await db.insert(perpMarkets).values({
      id: marketId,
      symbol: l.symbol,
      launchId: l.id,
      venue: "forge-hip3",
      indexPrice,
      markPrice: indexPrice,
      anchorPrice: indexPrice,
      vol: 0.0012,
      open24hPrice: indexPrice,
      high24hPrice: indexPrice * 1.01,
      low24hPrice: indexPrice * 0.99,
      maxLeverage: 20,
      status: "live",
    });
    await db.update(launches).set({ stage: "perp_listed", perpMarketId: marketId, listedAt: new Date() }).where(eq(launches.id, l.id));
    await pushEvent(l.id, "perp_listed", "HIP-3 venue deployed", `${l.symbol}-PERP on the Forge sandbox · no deployer stake charged · isolated margin, 20x max`, tx);
    await awardPoints(user.id, 400, "perp_deploy");
  }

  if (action === "listCashtag") {
    if (l.stage !== "perp_listed") throw new ApiError("Cashtag listing unlocks after the perp market is live.", 409);
    if (l.cashtag) throw new ApiError(`$${l.cashtag} is already listed.`, 409);
    const price = l.poolLiquidityHype / (l.poolTokens || CURVE.bookTokens);
    if (!args?.paymentRef) throw new ApiError("A cashtag payment receipt is required.", 402);
    const settled = await consumeCheckout(args.paymentRef, args.code ?? "", user.id, "cashtag_listing");
    if (settled.launchId !== l.id || settled.cashtag !== l.symbol || settled.amountHype + 1e-8 < 0.75) throw new ApiError("This receipt does not cover this cashtag listing.", 400);
    const handle = settled.xHandle ?? user.xHandle;
    await db.update(launches).set({ cashtag: l.symbol, xHandle: l.xHandle ?? handle }).where(eq(launches.id, l.id));
    await pushEvent(
      l.id,
      "perp_listed",
      "Smart Cashtag listed on X",
      shareText({ symbol: l.symbol, cashtag: l.symbol, priceUsd: price * h.hypeUsd, mcapUsd: price * l.totalSupply * h.hypeUsd, stage: "graduated on Elysium" }),
      tx,
    );
  }

  return { tx, detail: await launchDetail(l.slug, user) };
}

function seedPerpPrice(l: LaunchRow, hypeUsd: number) {
  const price = (l.poolLiquidityHype || l.raisedHype) / (l.poolTokens || CURVE.bookTokens);
  const usd = price * (hypeUsd || 28);
  return Math.max(1e-9, usd * (1 + ((hashInt(l.symbol) % 1000) / 1000 - 0.5) * 0.08));
}

/* ------------------------------------------------------------------ *
 * Browsing
 * ------------------------------------------------------------------ */

export async function listLaunches(user: PublicUser | null, filter?: { stage?: string; sort?: string; q?: string }) {
  const h = await head();
  const where =
    filter?.stage && filter.stage !== "all" ? eq(launches.stage, filter.stage as LaunchStage) : sql`true`;
  const search = filter?.q ? sql`(${launches.name} ilike ${`%${filter.q}%`} or ${launches.symbol} ilike ${`%${filter.q}%`})` : sql`true`;
  const orderBy =
    filter?.sort === "new" ? desc(launches.createdAt) : filter?.sort === "mcap" ? desc(launches.raisedHype) : filter?.sort === "progress" ? desc(launches.soldTokens) : desc(launches.volumeHype);
  const rows = await db.select().from(launches).where(and(where, search)).orderBy(orderBy).limit(48);
  const views = await Promise.all(rows.map((row) => toSummary(row, h.hypeUsd, user?.id)));
  return views.sort((a, b) => {
    if (filter?.sort === "new") return 0;
    if (filter?.sort === "progress") return b.progressPct - a.progressPct;
    if (filter?.sort === "mcap") return b.marketCapHype - a.marketCapHype;
    return b.volumeHype - a.volumeHype;
  });
}

export async function platformStats() {
  const h = await head();
  const [agg] = await db
    .select({
      launches: sql<number>`count(*)::int`,
      raised: sql<number>`coalesce(sum(${launches.raisedHype}),0)::float8`,
      volume: sql<number>`coalesce(sum(${launches.volumeHype}),0)::float8`,
      graduated: sql<number>`count(*) filter (where ${launches.stage} in ('graduated','perp_listed'))::int`,
      live: sql<number>`count(*) filter (where ${launches.stage} = 'trading')::int`,
    })
    .from(launches);
  const [traderAgg] = await db.select({ vol: sql<number>`coalesce(sum(${trades.hypeAmount}),0)::float8`, n: sql<number>`count(*)::int` }).from(trades);
  const [perpAgg] = await db
    .select({
      oi: sql<number>`coalesce(sum(${perpMarkets.openInterestUsd}),0)::float8`,
      vol: sql<number>`coalesce(sum(${perpMarkets.volume24hUsd}),0)::float8`,
      markets: sql<number>`count(*)::int`,
    })
    .from(perpMarkets);
  const [usersAgg] = await db.select({ n: sql<number>`count(*)::int`, stoke: sql<number>`coalesce(sum(${users.stoke}),0)::float8` }).from(users);
  const rngish = rng(Math.floor(Date.now() / 60000));
  return {
    launches: agg?.launches ?? 0,
    raisedHype: agg?.raised ?? 0,
    curveVolumeHype: agg?.volume ?? 0,
    tradeVolumeHype: traderAgg?.vol ?? 0,
    graduated: agg?.graduated ?? 0,
    liveCurves: agg?.live ?? 0,
    perpMarkets: perpAgg?.markets ?? 0,
    perpOiUsd: perpAgg?.oi ?? 0,
    perpVolumeUsd: perpAgg?.vol ?? 0,
    accounts: usersAgg?.n ?? 0,
    stokeCirculating: usersAgg?.stoke ?? 0,
    hypeUsd: h.hypeUsd,
    stokeUsd: h.stokeUsd,
    headBlock: h.headBlock,
    feesHype: h.totalFeesHype,
    stokeBurned: h.stokeBurned,
    blockLatencyMs: 118 + Math.floor(rngish() * 26),
  };
}

export { launchFeeHype, stageLabel };
