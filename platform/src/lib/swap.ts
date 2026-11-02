import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { holders, launches, perpMarkets, trades, users } from "@/db/schema";
import { ApiError, fakeTx, toPublicUser, type PublicUser } from "@/lib/auth";
import { addFees, head, type Head } from "@/lib/chain";
import { CURVE, buyQuote, feeSplit, marginalPrice, sellQuote } from "@/lib/curve";
import { awardPoints, notify, pushEvent } from "@/lib/forge";
import { hashInt, normalizeSymbol } from "@/lib/util";

export type SwapAsset = {
  symbol: string;
  name: string;
  kind: "coin" | "token";
  venue: string;
  stage: string;
  swappable: boolean;
  glyph: string;
  accent: string;
  slug: string | null;
  perpMarketId: string | null;
  priceHype: number;
  priceUsd: number;
  change24h: number;
  liquidityUsd: number;
  marketCapUsd: number;
  volumeUsd: number;
  feeBps: number;
  balance: number;
  trail: number[];
};

export type SwapQuote = {
  fromSymbol: string;
  toSymbol: string;
  amountIn: number;
  amountOut: number;
  minOut: number;
  amountInUsd: number;
  amountOutUsd: number;
  rate: number;
  priceImpactPct: number;
  feeHype: number;
  feeUsd: number;
  slippageBps: number;
  route: string[];
  venues: string[];
};

export type RecentSwapRow = {
  id: string;
  symbol: string;
  name: string;
  slug: string;
  glyph: string;
  accent: string;
  side: "buy" | "sell";
  venue: string;
  hypeAmount: number;
  usdAmount: number;
  tokenAmount: number;
  priceUsd: number;
  traderName: string | null;
  txHash: string;
  createdAt: string;
  mine: boolean;
};

const CORE_COINS = ["HYPE", "USDC", "STOKE"] as const;
type CoreCoin = (typeof CORE_COINS)[number];

function isCoreCoin(sym: string): sym is CoreCoin {
  return (CORE_COINS as readonly string[]).includes(sym);
}

const r8 = (n: number) => (Number.isFinite(n) ? Number(n.toPrecision(12)) : 0);

function coinPriceUsd(sym: CoreCoin, h: Head) {
  if (sym === "HYPE") return h.hypeUsd;
  if (sym === "USDC") return 1;
  return h.stokeUsd;
}

function syntheticTrail(anchorUsd: number, seedStr: string, points = 48) {
  const seed = hashInt(seedStr);
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const wave = Math.sin(i * 0.34 + (seed % 11)) * 0.018 + Math.cos(i * 0.17 + (seed % 7)) * 0.011;
    const drift = (t - 1) * 0.035;
    return Number((anchorUsd * Math.max(0.2, 1 + drift + wave)).toPrecision(8));
  });
}

function poolReserves(l: typeof launches.$inferSelect) {
  const poolH = Math.max(0.5, l.poolLiquidityHype || l.raisedHype || l.graduationHype);
  const poolT = Math.max(10_000, l.poolTokens || CURVE.bookTokens);
  return { poolH, poolT };
}

function quoteBuyTokenWithHype(l: typeof launches.$inferSelect, hypeIn: number) {
  if (hypeIn <= 0) return { tokensOut: 0, feeHype: 0, impactPct: 0, venue: "Spot", priceAfterHype: 0 };

  if (l.stage === "trading" || l.stage === "created") {
    const state = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };
    const remainingTokens = Math.max(0, CURVE.sellable - l.soldTokens);
    if (remainingTokens <= 1) throw new ApiError(`${l.symbol} bonding curve is full — trigger graduation first.`, 409);
    const q = buyQuote(state, hypeIn, 50);
    if (q.spent + 1e-9 < hypeIn) throw new ApiError("Amount exceeds the remaining bonding-curve capacity.", 400);
    return {
      tokensOut: Math.min(remainingTokens, q.out),
      feeHype: q.fee,
      impactPct: Math.abs(q.impactPct),
      venue: "Elysium Bonding Curve",
      priceAfterHype: q.priceAfter,
    };
  }

  if (l.stage === "graduated" || l.stage === "perp_listed") {
    const { poolH, poolT } = poolReserves(l);
    const feeBps = 30; // 0.30% Uniswap V3 / HyperCore spot pool fee
    const feeHype = (hypeIn * feeBps) / 10_000;
    const netHype = hypeIn - feeHype;
    const priceBefore = poolH / poolT;
    const newH = poolH + netHype;
    const newT = (poolH * poolT) / newH;
    const tokensOut = Math.max(0, poolT - newT);
    const priceAfter = newH / Math.max(1, newT);
    const impactPct = priceBefore > 0 ? Math.abs(((priceAfter - priceBefore) / priceBefore) * 100) : 0;
    return {
      tokensOut,
      feeHype,
      impactPct,
      venue: l.hypercoreSpotIndex ? `HyperCore Spot #${l.hypercoreSpotIndex} · UniV3` : "Uniswap V3 Locked Pool",
      priceAfterHype: priceAfter,
    };
  }

  throw new ApiError(`${l.symbol} is currently ${l.stage} (settlement bridge in flight).`, 409);
}

function quoteSellTokenForHype(l: typeof launches.$inferSelect, tokensIn: number) {
  if (tokensIn <= 0) return { hypeOut: 0, feeHype: 0, impactPct: 0, venue: "Spot", priceAfterHype: 0 };

  if (l.stage === "trading" || l.stage === "created") {
    const state = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };
    const q = sellQuote(state, tokensIn, 50);
    return {
      hypeOut: q.out,
      feeHype: q.fee,
      impactPct: Math.abs(q.impactPct),
      venue: "Elysium Bonding Curve",
      priceAfterHype: q.priceAfter,
    };
  }

  if (l.stage === "graduated" || l.stage === "perp_listed") {
    const { poolH, poolT } = poolReserves(l);
    const feeBps = 30;
    const priceBefore = poolH / poolT;
    const newT = poolT + tokensIn;
    const newH = (poolH * poolT) / newT;
    const grossHype = Math.max(0, poolH - newH);
    const feeHype = (grossHype * feeBps) / 10_000;
    const hypeOut = Math.max(0, grossHype - feeHype);
    const priceAfter = newH / newT;
    const impactPct = priceBefore > 0 ? Math.abs(((priceBefore - priceAfter) / priceBefore) * 100) : 0;
    return {
      hypeOut,
      feeHype,
      impactPct,
      venue: l.hypercoreSpotIndex ? `HyperCore Spot #${l.hypercoreSpotIndex} · UniV3` : "Uniswap V3 Locked Pool",
      priceAfterHype: priceAfter,
    };
  }

  throw new ApiError(`${l.symbol} is currently ${l.stage} (settlement bridge in flight).`, 409);
}

/** Lists all swappable coins & ecosystem tokens with live prices, trails, and user balances. */
export async function listSwapState(user: PublicUser | null) {
  const h = await head();
  const [launchRows, userRow, bagRows, recentTradeRows] = await Promise.all([
    db.select().from(launches).orderBy(desc(launches.volumeHype), desc(launches.createdAt)),
    user ? db.select().from(users).where(eq(users.id, user.id)).limit(1) : Promise.resolve([]),
    user ? db.select().from(holders).where(eq(holders.userId, user.id)) : Promise.resolve([]),
    db
      .select({
        id: trades.id,
        side: trades.side,
        hypeAmount: trades.hypeAmount,
        tokenAmount: trades.tokenAmount,
        priceAfter: trades.priceAfter,
        traderName: trades.traderName,
        userId: trades.userId,
        txHash: trades.txHash,
        createdAt: trades.createdAt,
        symbol: launches.symbol,
        name: launches.name,
        slug: launches.slug,
        glyph: launches.glyph,
        accent: launches.accent,
        stage: launches.stage,
        spotIdx: launches.hypercoreSpotIndex,
      })
      .from(trades)
      .innerJoin(launches, eq(launches.id, trades.launchId))
      .orderBy(desc(trades.createdAt))
      .limit(24),
  ]);

  const me = userRow[0];
  const bagMap = new Map<string, number>();
  for (const b of bagRows) bagMap.set(b.launchId, Number(b.amount));

  const coins: SwapAsset[] = [
    {
      symbol: "HYPE",
      name: "Hyperliquid · Elysium Gas",
      kind: "coin",
      venue: "Native Reserve",
      stage: "native",
      swappable: true,
      glyph: "◈",
      accent: "#1d472f",
      slug: null,
      perpMarketId: null,
      priceHype: 1,
      priceUsd: h.hypeUsd,
      change24h: 2.84,
      liquidityUsd: 48_500_000,
      marketCapUsd: 9_450_000_000,
      volumeUsd: 142_000_000,
      feeBps: 10,
      balance: me?.hype ?? 0,
      trail: syntheticTrail(h.hypeUsd, "HYPE"),
    },
    {
      symbol: "USDC",
      name: "USD Coin (HyperCore)",
      kind: "coin",
      venue: "Native Reserve",
      stage: "native",
      swappable: true,
      glyph: "$",
      accent: "#2d6a82",
      slug: null,
      perpMarketId: null,
      priceHype: 1 / h.hypeUsd,
      priceUsd: 1,
      change24h: 0.01,
      liquidityUsd: 86_000_000,
      marketCapUsd: 34_000_000_000,
      volumeUsd: 215_000_000,
      feeBps: 5,
      balance: me?.usdc ?? 0,
      trail: Array.from({ length: 48 }, (_, i) => Number((1 + Math.sin(i * 0.4) * 0.0003).toFixed(5))),
    },
    {
      symbol: "STOKE",
      name: "Forge Platform Token",
      kind: "coin",
      venue: "Forge Native Pool",
      stage: "native",
      swappable: true,
      glyph: "⬢",
      accent: "#a57e28",
      slug: null,
      perpMarketId: "hip3_stoke_seed",
      priceHype: h.stokeUsd / h.hypeUsd,
      priceUsd: h.stokeUsd,
      change24h: 4.62,
      liquidityUsd: 3_650_000,
      marketCapUsd: h.stokeUsd * 1_000_000_000,
      volumeUsd: 1_840_000,
      feeBps: 20,
      balance: me?.stoke ?? 0,
      trail: syntheticTrail(h.stokeUsd, "STOKE"),
    },
  ];

  // Fetch recent price points per launch for clean chart trails
  const allTradesAsc = await db
    .select({ launchId: trades.launchId, price: trades.priceAfter })
    .from(trades)
    .orderBy(asc(trades.createdAt))
    .limit(400);
  const trailByLaunch = new Map<string, number[]>();
  for (const t of allTradesAsc) {
    const arr = trailByLaunch.get(t.launchId) ?? [];
    arr.push(Number(t.price) * h.hypeUsd);
    trailByLaunch.set(t.launchId, arr);
  }

  const tokenAssets: SwapAsset[] = launchRows.map((l) => {
    const isGrad = l.stage === "graduated" || l.stage === "perp_listed";
    const swappable = l.stage === "trading" || l.stage === "created" || isGrad;
    const { poolH, poolT } = poolReserves(l);
    const curveState = { sold: l.soldTokens, raised: l.raisedHype, graduationHype: l.graduationHype, feeBps: l.feeBps };
    const priceHype = isGrad ? poolH / poolT : marginalPrice(curveState);
    const priceUsd = priceHype * h.hypeUsd;
    const recordedTrail = trailByLaunch.get(l.id) ?? [];
    const trail = recordedTrail.length >= 6 ? recordedTrail.slice(-48) : syntheticTrail(priceUsd, l.symbol);
    const openPx = trail[0] || priceUsd;
    const change24h = openPx > 0 ? ((priceUsd - openPx) / openPx) * 100 : 0;

    return {
      symbol: l.symbol,
      name: l.name,
      kind: "token",
      venue: isGrad
        ? l.hypercoreSpotIndex
          ? `HyperCore Spot #${l.hypercoreSpotIndex}`
          : "Uniswap V3 Pool"
        : l.stage === "trading" || l.stage === "created"
          ? "Bonding Curve"
          : "Graduating",
      stage: l.stage,
      swappable,
      glyph: l.glyph,
      accent: l.accent,
      slug: l.slug,
      perpMarketId: l.perpMarketId,
      priceHype,
      priceUsd,
      change24h,
      liquidityUsd: (isGrad ? poolH * 2 : l.raisedHype + (l.graduationHype * 273) / 800) * h.hypeUsd,
      marketCapUsd: priceUsd * l.totalSupply,
      volumeUsd: l.volumeHype * h.hypeUsd,
      feeBps: isGrad ? 30 : l.feeBps,
      balance: bagMap.get(l.id) ?? 0,
      trail,
    };
  });

  const recentSwaps: RecentSwapRow[] = recentTradeRows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    slug: r.slug,
    glyph: r.glyph,
    accent: r.accent,
    side: r.side,
    venue:
      r.stage === "graduated" || r.stage === "perp_listed"
        ? r.spotIdx
          ? `HyperCore Spot #${r.spotIdx}`
          : "Uniswap V3 Pool"
        : "Bonding Curve",
    hypeAmount: r.hypeAmount,
    usdAmount: r.hypeAmount * h.hypeUsd,
    tokenAmount: r.tokenAmount,
    priceUsd: r.priceAfter * h.hypeUsd,
    traderName: r.traderName,
    txHash: r.txHash,
    createdAt: r.createdAt.toISOString(),
    mine: Boolean(user && r.userId === user.id),
  }));

  return {
    prices: { hypeUsd: h.hypeUsd, stokeUsd: h.stokeUsd, headBlock: h.headBlock },
    assets: [...coins, ...tokenAssets],
    recentSwaps,
  };
}

/** Computes a universal multi-hop swap quote between any two coins or tokens. */
export async function quoteSwap(rawFrom: string, rawTo: string, amountIn: number, slippageBps = 50): Promise<SwapQuote> {
  const fromSymbol = normalizeSymbol(rawFrom);
  const toSymbol = normalizeSymbol(rawTo);
  if (!fromSymbol || !toSymbol) throw new ApiError("Select both input and output assets.");
  if (fromSymbol === toSymbol) throw new ApiError("Input and output assets must be different.");
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 2500) throw new ApiError("Invalid slippage tolerance.");
  if (!Number.isFinite(amountIn) || amountIn <= 0 || amountIn > 1e12) throw new ApiError("Enter an amount greater than zero.");

  const h = await head();
  const fromIsCoin = isCoreCoin(fromSymbol);
  const toIsCoin = isCoreCoin(toSymbol);

  const [fromLaunch, toLaunch] = await Promise.all([
    fromIsCoin ? Promise.resolve(null) : db.select().from(launches).where(eq(launches.symbol, fromSymbol)).limit(1).then((r) => r[0] ?? null),
    toIsCoin ? Promise.resolve(null) : db.select().from(launches).where(eq(launches.symbol, toSymbol)).limit(1).then((r) => r[0] ?? null),
  ]);

  if (!fromIsCoin && !fromLaunch) throw new ApiError(`Token ${fromSymbol} not found.`, 404);
  if (!toIsCoin && !toLaunch) throw new ApiError(`Token ${toSymbol} not found.`, 404);

  // Case 1: Core Coin -> Core Coin
  if (fromIsCoin && toIsCoin) {
    const inPxUsd = coinPriceUsd(fromSymbol, h);
    const outPxUsd = coinPriceUsd(toSymbol, h);
    const amountInUsd = amountIn * inPxUsd;
    const feeBps = (fromSymbol === "HYPE" && toSymbol === "USDC") || (fromSymbol === "USDC" && toSymbol === "HYPE") ? 5 : 20;
    const feeUsd = (amountInUsd * feeBps) / 10_000;
    const depthUsd = fromSymbol === "STOKE" || toSymbol === "STOKE" ? 3_650_000 : 65_000_000;
    const impactPct = Math.min(4.5, (amountInUsd / depthUsd) * 100);
    const netUsd = (amountInUsd - feeUsd) * (1 - impactPct / 200);
    const amountOut = Math.max(0, netUsd / outPxUsd);
    return {
      fromSymbol,
      toSymbol,
      amountIn,
      amountOut,
      minOut: amountOut * (1 - slippageBps / 10_000),
      amountInUsd,
      amountOutUsd: amountOut * outPxUsd,
      rate: amountOut / amountIn,
      priceImpactPct: Number(impactPct.toFixed(3)),
      feeHype: feeUsd / h.hypeUsd,
      feeUsd,
      slippageBps,
      route: fromSymbol === "HYPE" || toSymbol === "HYPE" ? [fromSymbol, toSymbol] : [fromSymbol, "HYPE", toSymbol],
      venues: [fromSymbol === "STOKE" || toSymbol === "STOKE" ? "Forge Native Pool" : "HyperCore Native Reserve"],
    };
  }

  // Case 2: Core Coin -> Ecosystem Token
  if (fromIsCoin && toLaunch) {
    const inPxUsd = coinPriceUsd(fromSymbol, h);
    const amountInUsd = amountIn * inPxUsd;
    let hypeIntoToken = amountIn;
    let hopFeeHype = 0;
    const route: string[] = [fromSymbol];
    const venues: string[] = [];

    if (fromSymbol !== "HYPE") {
      const grossHype = amountInUsd / h.hypeUsd;
      hopFeeHype = (grossHype * 10) / 10_000; // 0.10% router hop
      hypeIntoToken = Math.max(0, grossHype - hopFeeHype);
      route.push("HYPE");
      venues.push("Forge Native Router");
    }

    const leg = quoteBuyTokenWithHype(toLaunch, hypeIntoToken);
    route.push(toSymbol);
    venues.push(leg.venue);

    const totalFeeHype = hopFeeHype + leg.feeHype;
    const outUsd = leg.tokensOut * leg.priceAfterHype * h.hypeUsd;

    return {
      fromSymbol,
      toSymbol,
      amountIn,
      amountOut: leg.tokensOut,
      minOut: leg.tokensOut * (1 - slippageBps / 10_000),
      amountInUsd,
      amountOutUsd: outUsd,
      rate: leg.tokensOut / amountIn,
      priceImpactPct: Number(leg.impactPct.toFixed(2)),
      feeHype: totalFeeHype,
      feeUsd: totalFeeHype * h.hypeUsd,
      slippageBps,
      route,
      venues,
    };
  }

  // Case 3: Ecosystem Token -> Core Coin
  if (fromLaunch && toIsCoin) {
    const leg = quoteSellTokenForHype(fromLaunch, amountIn);
    const isGrad = fromLaunch.stage === "graduated" || fromLaunch.stage === "perp_listed";
    const { poolH, poolT } = poolReserves(fromLaunch);
    const inPriceHype = isGrad
      ? poolH / poolT
      : marginalPrice({
          sold: fromLaunch.soldTokens,
          raised: fromLaunch.raisedHype,
          graduationHype: fromLaunch.graduationHype,
          feeBps: fromLaunch.feeBps,
        });
    const amountInUsd = amountIn * inPriceHype * h.hypeUsd;

    const route = [fromSymbol, "HYPE"];
    const venues = [leg.venue];
    let amountOut = leg.hypeOut;
    let hopFeeHype = 0;

    if (toSymbol !== "HYPE") {
      hopFeeHype = (leg.hypeOut * 10) / 10_000;
      const netHype = Math.max(0, leg.hypeOut - hopFeeHype);
      const outPxUsd = coinPriceUsd(toSymbol, h);
      amountOut = (netHype * h.hypeUsd) / outPxUsd;
      route.push(toSymbol);
      venues.push("Forge Native Router");
    }

    const totalFeeHype = leg.feeHype + hopFeeHype;
    const outPxUsd = coinPriceUsd(toSymbol as CoreCoin, h);

    return {
      fromSymbol,
      toSymbol,
      amountIn,
      amountOut,
      minOut: amountOut * (1 - slippageBps / 10_000),
      amountInUsd,
      amountOutUsd: amountOut * outPxUsd,
      rate: amountOut / amountIn,
      priceImpactPct: Number(leg.impactPct.toFixed(2)),
      feeHype: totalFeeHype,
      feeUsd: totalFeeHype * h.hypeUsd,
      slippageBps,
      route,
      venues,
    };
  }

  // Case 4: Ecosystem Token A -> Ecosystem Token B (Multi-hop via HYPE)
  if (fromLaunch && toLaunch) {
    const leg1 = quoteSellTokenForHype(fromLaunch, amountIn);
    const leg2 = quoteBuyTokenWithHype(toLaunch, leg1.hypeOut);
    const isGrad1 = fromLaunch.stage === "graduated" || fromLaunch.stage === "perp_listed";
    const { poolH, poolT } = poolReserves(fromLaunch);
    const inPriceHype = isGrad1
      ? poolH / poolT
      : marginalPrice({
          sold: fromLaunch.soldTokens,
          raised: fromLaunch.raisedHype,
          graduationHype: fromLaunch.graduationHype,
          feeBps: fromLaunch.feeBps,
        });
    const amountInUsd = amountIn * inPriceHype * h.hypeUsd;
    const totalFeeHype = leg1.feeHype + leg2.feeHype;

    return {
      fromSymbol,
      toSymbol,
      amountIn,
      amountOut: leg2.tokensOut,
      minOut: leg2.tokensOut * (1 - slippageBps / 10_000),
      amountInUsd,
      amountOutUsd: leg2.tokensOut * leg2.priceAfterHype * h.hypeUsd,
      rate: leg2.tokensOut / amountIn,
      priceImpactPct: Number((leg1.impactPct + leg2.impactPct).toFixed(2)),
      feeHype: totalFeeHype,
      feeUsd: totalFeeHype * h.hypeUsd,
      slippageBps,
      route: [fromSymbol, "HYPE", toSymbol],
      venues: Array.from(new Set([leg1.venue, leg2.venue])),
    };
  }

  throw new ApiError("Unsupported swap pair.");
}

async function applyTokenSellLeg(user: PublicUser, l: typeof launches.$inferSelect, tokensIn: number, h: Head, txHash: string) {
  const held = await db
    .select()
    .from(holders)
    .where(and(eq(holders.launchId, l.id), eq(holders.userId, user.id)))
    .limit(1);
  const bag = held[0]?.amount ?? 0;
  if (bag + 1e-6 < tokensIn) {
    throw new ApiError(`Insufficient ${l.symbol} balance (holding ${bag.toFixed(2)}).`, 402);
  }
  const actualIn = Math.min(bag, tokensIn);
  const leg = quoteSellTokenForHype(l, actualIn);

  await db
    .update(holders)
    .set({ amount: sql`greatest(0, ${holders.amount} - ${r8(actualIn)})`, updatedAt: new Date() })
    .where(and(eq(holders.launchId, l.id), eq(holders.userId, user.id)));

  const split = feeSplit(leg.feeHype);

  if (l.stage === "trading" || l.stage === "created") {
    const newSold = Math.max(0, l.soldTokens - actualIn);
    const newRaised = Math.max(0, l.raisedHype - (leg.hypeOut + leg.feeHype));
    await db
      .update(launches)
      .set({
        soldTokens: r8(newSold),
        raisedHype: r8(newRaised),
        volumeHype: sql`${launches.volumeHype} + ${r8(leg.hypeOut)}`,
        treasuryHype: sql`${launches.treasuryHype} + ${r8(split.treasury)}`,
        creatorHype: sql`${launches.creatorHype} + ${r8(split.creator)}`,
        tradesCount: sql`${launches.tradesCount} + 1`,
      })
      .where(eq(launches.id, l.id));
  } else {
    const { poolH, poolT } = poolReserves(l);
    const newT = poolT + actualIn;
    const newH = Math.max(0.1, poolH - leg.hypeOut - leg.feeHype);
    await db
      .update(launches)
      .set({
        poolLiquidityHype: r8(newH),
        poolTokens: r8(newT),
        volumeHype: sql`${launches.volumeHype} + ${r8(leg.hypeOut)}`,
        treasuryHype: sql`${launches.treasuryHype} + ${r8(split.treasury)}`,
        creatorHype: sql`${launches.creatorHype} + ${r8(split.creator)}`,
        tradesCount: sql`${launches.tradesCount} + 1`,
      })
      .where(eq(launches.id, l.id));

    if (l.perpMarketId) {
      const spotUsd = (newH / newT) * h.hypeUsd;
      await db.update(perpMarkets).set({ indexPrice: r8(spotUsd), anchorPrice: r8(spotUsd) }).where(eq(perpMarkets.id, l.perpMarketId));
    }
  }

  const countRow = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(holders)
    .where(and(eq(holders.launchId, l.id), sql`${holders.amount} > 0.0001`));
  await db.update(launches).set({ holdersCount: countRow[0]?.n ?? 0 }).where(eq(launches.id, l.id));

  await db.insert(trades).values({
    id: `trd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    launchId: l.id,
    userId: user.id,
    traderName: user.name,
    traderWallet: user.wallet,
    side: "sell",
    hypeAmount: r8(leg.hypeOut),
    tokenAmount: r8(actualIn),
    feeHype: r8(leg.feeHype),
    priceAfter: r8(leg.priceAfterHype),
    txHash,
    blockNumber: h.headBlock,
    createdAt: new Date(),
  });

  await addFees(split.treasury, split.stokeBuyback / (h.stokeUsd || 0.0412));
  return leg;
}

async function applyTokenBuyLeg(user: PublicUser, l: typeof launches.$inferSelect, hypeIn: number, h: Head, txHash: string) {
  const leg = quoteBuyTokenWithHype(l, hypeIn);
  const split = feeSplit(leg.feeHype);

  if (l.stage === "trading" || l.stage === "created") {
    const newSold = Math.min(CURVE.sellable, l.soldTokens + leg.tokensOut);
    const newRaised = l.raisedHype + (hypeIn - leg.feeHype);
    const frozen = newSold >= CURVE.sellable - 1;
    await db
      .update(launches)
      .set({
        soldTokens: r8(newSold),
        raisedHype: r8(newRaised),
        volumeHype: sql`${launches.volumeHype} + ${r8(hypeIn)}`,
        treasuryHype: sql`${launches.treasuryHype} + ${r8(split.treasury)}`,
        creatorHype: sql`${launches.creatorHype} + ${r8(split.creator)}`,
        tradesCount: sql`${launches.tradesCount} + 1`,
        stage: frozen ? "frozen" : "trading",
      })
      .where(eq(launches.id, l.id));

    if (frozen) {
      await pushEvent(l.id, "frozen", "Curve sold out — 800M absorbed", "Pool frozen via swap router. Anyone can now call graduate().", txHash);
    }
  } else {
    const { poolH, poolT } = poolReserves(l);
    const newH = poolH + (hypeIn - leg.feeHype);
    const newT = Math.max(1000, poolT - leg.tokensOut);
    await db
      .update(launches)
      .set({
        poolLiquidityHype: r8(newH),
        poolTokens: r8(newT),
        volumeHype: sql`${launches.volumeHype} + ${r8(hypeIn)}`,
        treasuryHype: sql`${launches.treasuryHype} + ${r8(split.treasury)}`,
        creatorHype: sql`${launches.creatorHype} + ${r8(split.creator)}`,
        tradesCount: sql`${launches.tradesCount} + 1`,
      })
      .where(eq(launches.id, l.id));

    if (l.perpMarketId) {
      const spotUsd = (newH / newT) * h.hypeUsd;
      await db.update(perpMarkets).set({ indexPrice: r8(spotUsd), anchorPrice: r8(spotUsd) }).where(eq(perpMarkets.id, l.perpMarketId));
    }
  }

  await db
    .insert(holders)
    .values({
      id: `hld_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      launchId: l.id,
      userId: user.id,
      wallet: user.wallet,
      amount: r8(leg.tokensOut),
    })
    .onConflictDoUpdate({
      target: [holders.launchId, holders.userId],
      set: { amount: sql`${holders.amount} + ${r8(leg.tokensOut)}`, updatedAt: new Date() },
    });

  const countRow = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(holders)
    .where(and(eq(holders.launchId, l.id), sql`${holders.amount} > 0.0001`));
  await db.update(launches).set({ holdersCount: countRow[0]?.n ?? 0 }).where(eq(launches.id, l.id));

  await db.insert(trades).values({
    id: `trd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    launchId: l.id,
    userId: user.id,
    traderName: user.name,
    traderWallet: user.wallet,
    side: "buy",
    hypeAmount: r8(hypeIn),
    tokenAmount: r8(leg.tokensOut),
    feeHype: r8(leg.feeHype),
    priceAfter: r8(leg.priceAfterHype),
    txHash,
    blockNumber: h.headBlock,
    createdAt: new Date(),
  });

  await addFees(split.treasury, split.stokeBuyback / (h.stokeUsd || 0.0412));
  return leg;
}

/** Executes a persisted swap across coins and/or launchpad & graduated pool tokens. */
export async function executeSwap(user: PublicUser, rawFrom: string, rawTo: string, amountIn: number, slippageBps = 50, expectedOut?: number) {
  const quote = await quoteSwap(rawFrom, rawTo, amountIn, slippageBps);
  if (expectedOut !== undefined && (!Number.isFinite(expectedOut) || expectedOut < 0 || quote.amountOut + 1e-8 < expectedOut * (1 - slippageBps / 10000))) throw new ApiError("Price moved beyond your quoted minimum. Refresh the quote.", 409);
  const h = await head();
  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!me) throw new ApiError("Account not found.", 404);

  const fromIsCoin = isCoreCoin(quote.fromSymbol);
  const toIsCoin = isCoreCoin(quote.toSymbol);
  const txHash = fakeTx(`swap:${user.id}:${quote.fromSymbol}:${quote.toSymbol}:${Date.now()}`);

  // 1. Validate & Debit Coin Input if From is a Core Coin
  if (fromIsCoin) {
    const col = quote.fromSymbol === "HYPE" ? me.hype : quote.fromSymbol === "USDC" ? me.usdc : me.stoke;
    if (col + 1e-8 < amountIn) {
      throw new ApiError(`Insufficient ${quote.fromSymbol} balance (${col.toFixed(4)} available).`, 402);
    }
    const patch =
      quote.fromSymbol === "HYPE"
        ? { hype: Math.max(0, me.hype - amountIn) }
        : quote.fromSymbol === "USDC"
          ? { usdc: Math.max(0, me.usdc - amountIn) }
          : { stoke: Math.max(0, me.stoke - amountIn) };
    await db.update(users).set(patch).where(eq(users.id, user.id));
  }

  let amountOut = quote.amountOut;

  // 2. Execute Legs
  if (fromIsCoin && toIsCoin) {
    // Credit output coin
    const patch =
      quote.toSymbol === "HYPE"
        ? { hype: sql`${users.hype} + ${r8(amountOut)}` }
        : quote.toSymbol === "USDC"
          ? { usdc: sql`${users.usdc} + ${r8(amountOut)}` }
          : { stoke: sql`${users.stoke} + ${r8(amountOut)}` };
    await db.update(users).set(patch).where(eq(users.id, user.id));
    await addFees(quote.feeHype, (quote.feeHype * 0.1 * h.hypeUsd) / (h.stokeUsd || 0.0412));
  } else if (fromIsCoin && !toIsCoin) {
    const [toLaunch] = await db.select().from(launches).where(eq(launches.symbol, quote.toSymbol)).limit(1);
    if (!toLaunch) throw new ApiError(`Token ${quote.toSymbol} not found.`, 404);
    const inPxUsd = coinPriceUsd(quote.fromSymbol as CoreCoin, h);
    const hypeIntoToken =
      quote.fromSymbol === "HYPE" ? amountIn : ((amountIn * inPxUsd) / h.hypeUsd) * (1 - 10 / 10_000);
    const leg = await applyTokenBuyLeg(user, toLaunch, hypeIntoToken, h, txHash);
    amountOut = leg.tokensOut;
  } else if (!fromIsCoin && toIsCoin) {
    const [fromLaunch] = await db.select().from(launches).where(eq(launches.symbol, quote.fromSymbol)).limit(1);
    if (!fromLaunch) throw new ApiError(`Token ${quote.fromSymbol} not found.`, 404);
    const leg = await applyTokenSellLeg(user, fromLaunch, amountIn, h, txHash);
    if (quote.toSymbol === "HYPE") {
      amountOut = leg.hypeOut;
      await db.update(users).set({ hype: sql`${users.hype} + ${r8(amountOut)}` }).where(eq(users.id, user.id));
    } else {
      const netHype = leg.hypeOut * (1 - 10 / 10_000);
      const outPxUsd = coinPriceUsd(quote.toSymbol as CoreCoin, h);
      amountOut = (netHype * h.hypeUsd) / outPxUsd;
      const patch =
        quote.toSymbol === "USDC"
          ? { usdc: sql`${users.usdc} + ${r8(amountOut)}` }
          : { stoke: sql`${users.stoke} + ${r8(amountOut)}` };
      await db.update(users).set(patch).where(eq(users.id, user.id));
    }
  } else {
    const [fromLaunch] = await db.select().from(launches).where(eq(launches.symbol, quote.fromSymbol)).limit(1);
    const [toLaunch] = await db.select().from(launches).where(eq(launches.symbol, quote.toSymbol)).limit(1);
    if (!fromLaunch || !toLaunch) throw new ApiError("Swap token not found.", 404);
    const leg1 = await applyTokenSellLeg(user, fromLaunch, amountIn, h, txHash);
    const leg2 = await applyTokenBuyLeg(user, toLaunch, leg1.hypeOut, h, txHash);
    amountOut = leg2.tokensOut;
  }

  if (amountOut + 1e-8 < quote.minOut) {
    throw new ApiError("Price moved beyond your slippage tolerance — try increasing max slippage.", 409);
  }

  const pts = Math.max(3, Math.min(400, Math.round(quote.amountInUsd * 1.5)));
  await awardPoints(user.id, pts, `swap_${quote.fromSymbol.toLowerCase()}_${quote.toSymbol.toLowerCase()}`);
  await notify(
    user.id,
    "fill",
    `Swapped ${quote.fromSymbol} → ${quote.toSymbol}`,
    `Swapped ${amountIn} ${quote.fromSymbol} for ${Number(amountOut.toPrecision(6))} ${quote.toSymbol} via ${quote.venues.join(" → ")}.`,
    "/trade?mode=swap",
  );

  const [freshUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  return {
    ok: true,
    txHash,
    fromSymbol: quote.fromSymbol,
    toSymbol: quote.toSymbol,
    amountIn,
    amountOut,
    route: quote.route,
    venues: quote.venues,
    pointsEarned: pts,
    user: freshUser ? toPublicUser(freshUser) : user,
  };
}
