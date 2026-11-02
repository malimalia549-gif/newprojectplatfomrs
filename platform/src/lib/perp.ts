/**
 * HyperCore-flavoured perp engine used by the HIP-3 venue:
 * deterministic price walk, synthetic depth ladders, isolated margin,
 * funding accrual and liquidation maths.
 */

import { gauss, rng, hashInt, clamp } from "@/lib/util";

export type Mark = {
  indexPrice: number;
  anchorPrice: number;
  markPrice: number;
  vol: number;
  fundingHour: number;
  lastTickAt: number;
};

export const MAINT_MARGIN_BPS = 0.005;

export function nextMark(m: Mark, seed: number, netImbalance = 0): Mark {
  const now = Date.now();
  const dtSec = clamp((now - m.lastTickAt) / 1000, 0.2, 45);
  const steps = Math.max(1, Math.round(dtSec / 0.26));
  const r = rng(seed ^ Math.floor(now / 50));
  let anchor = m.anchorPrice;
  for (let i = 0; i < steps; i++) {
    const step = m.vol * Math.sqrt(0.26);
    anchor *= Math.exp(step * gauss(() => r()));
    // slow mean reversion keeps a demo market from running to zero / infinity
    anchor += (m.indexPrice - anchor) * 0.0008;
  }
  anchor = Math.max(m.indexPrice * 0.25, Math.min(m.indexPrice * 4, anchor));
  const walk = m.indexPrice * (1 + (anchor / m.indexPrice - 1) * 0.55 + (r() - 0.5) * m.vol * 2);
  const fundingHour = clamp(m.fundingHour * 0.9 + netImbalance * 0.00042 + (r() - 0.5) * 0.00008, -0.0075, 0.0075);
  return {
    indexPrice: walk,
    anchorPrice: anchor,
    markPrice: walk * (1 + clamp(netImbalance * 0.00002, -0.0009, 0.0009)),
    vol: m.vol,
    fundingHour,
    lastTickAt: now,
  };
}

export function liqPrice(entry: number, leverage: number, side: "long" | "short") {
  const mmr = MAINT_MARGIN_BPS;
  return side === "long" ? entry * (1 - 1 / leverage + mmr) : entry * (1 + 1 / leverage - mmr);
}

export function unrealizedPnl(pos: { side: "long" | "short"; entryPrice: number; size: number }, price: number) {
  const diff = pos.side === "long" ? price - pos.entryPrice : pos.entryPrice - price;
  return diff * pos.size;
}

export function marginUsed(notional: number, leverage: number) {
  return notional / leverage;
}

export function buildBook(symbol: string, mark: number, tick: number, bucket: number) {
  const r = rng(hashInt(symbol) + bucket);
  const bids: Array<{ price: number; size: number; total: number }> = [];
  const asks: Array<{ price: number; size: number; total: number }> = [];
  let bidTotal = 0;
  let askTotal = 0;
  for (let i = 0; i < 11; i++) {
    const spreadSteps = 1 + i;
    const bidPrice = Math.max(tick, mark - spreadSteps * tick * (1.6 + r()));
    const askPrice = mark + spreadSteps * tick * (1.6 + r());
    const bidSize = Math.round((4000 + r() * 180_000) / 1000) * 1000;
    const askSize = Math.round((4000 + r() * 180_000) / 1000) * 1000;
    bidTotal += bidSize;
    askTotal += askSize;
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });
    asks.push({ price: askPrice, size: askSize, total: askTotal });
  }
  return { bids, asks, imbalanced: askTotal - bidTotal };
}

export function fundingForHour(hour: number, elapsedHours: number) {
  return hour * elapsedHours;
}

/** Deterministic "trade tape" so the terminal never looks dead between user fills. */
export function recentTape(symbol: string, mark: number, size = 18) {
  const bucket = Math.floor(Date.now() / 2200);
  const r = rng(hashInt(symbol) * (bucket + 7));
  return Array.from({ length: size }, (_, i) => {
    const side = r() > 0.5 ? "buy" : "sell";
    const px = mark * (1 + (r() - 0.5) * 0.0025);
    return {
      id: `${symbol}-tape-${bucket}-${i}`,
      side: side as "buy" | "sell",
      price: px,
      size: Math.round((500 + r() * 90_000) / 500) * 500,
      at: Date.now() - i * 2300 - Math.floor(r() * 900),
    };
  });
}
