/**
 * Elysium launchpad bonding curve.
 * Mirrors the mechanics live on Elysium testnet (chain 99801): a constant-product
 * curve over *virtual* reserves, 1% fee on the HYPE leg, frozen at 800M tokens sold,
 * then graduated onto a liquidity pool / HyperCore spot book.
 */

export const CURVE = {
  totalSupply: 1_000_000_000,
  sellable: 800_000_000,
  bookTokens: 200_000_000,
  virtualTokens: 1_073_000_000,
  feeBps: 100,
  creatorShareBps: 2_500, // 25% of fees go to the creator (dev share)
  stokeBurnShareBps: 1_000, // 10% of platform net revenue buys + burns STOKE
} as const;

export type CurveState = { sold: number; raised: number; graduationHype: number; feeBps?: number };

export function virtualHype0(graduationHype: number) {
  // Sized so selling exactly 800M raises exactly `graduationHype` net of fees.
  return (graduationHype * 273) / 800;
}

export function reserves(state: CurveState) {
  const h = virtualHype0(state.graduationHype) + state.raised;
  const t = CURVE.virtualTokens - state.sold;
  return { h, t };
}

export function marginalPrice(state: CurveState) {
  const { h, t } = reserves(state);
  return h / t;
}

export function marketCapHype(state: CurveState) {
  return marginalPrice(state) * CURVE.totalSupply;
}

export function progressPct(state: CurveState) {
  return Math.min(100, (state.sold / CURVE.sellable) * 100);
}

export function isFull(state: CurveState) {
  return state.sold >= CURVE.sellable - 1;
}

export type Quote = {
  out: number;
  fee: number;
  net: number;
  priceAfter: number;
  soldAfter: number;
  raisedAfter: number;
  minOut: number;
  impactPct: number;
};

const FEES: Record<string, number> = {};

export function buyQuote(state: CurveState, hypeIn: number, slippageBps = 50): Quote {
  const feeBps = state.feeBps ?? CURVE.feeBps;
  const { h, t } = reserves(state);
  const fee = (hypeIn * feeBps) / 10_000;
  const net = hypeIn - fee;
  const out = t - (h * t) / (h + net);
  const soldAfter = Math.min(CURVE.sellable, state.sold + out);
  const raisedAfter = state.raised + net;
  const priceBefore = marginalPrice(state);
  const priceAfter = marginalPrice({ ...state, sold: soldAfter, raised: raisedAfter });
  return {
    out,
    fee,
    net,
    priceAfter,
    soldAfter,
    raisedAfter,
    minOut: out * (1 - slippageBps / 10_000),
    impactPct: ((priceAfter - priceBefore) / priceBefore) * 100,
  };
}

export function sellQuote(state: CurveState, tokensIn: number, slippageBps = 50): Quote {
  const feeBps = state.feeBps ?? CURVE.feeBps;
  const { h, t } = reserves(state);
  const hype = h - (h * t) / (t + tokensIn);
  const fee = (hype * feeBps) / 10_000;
  const net = hype - fee;
  const soldAfter = Math.max(0, state.sold - tokensIn);
  const raisedAfter = Math.max(0, state.raised + net);
  const priceBefore = marginalPrice(state);
  const priceAfter = marginalPrice({ ...state, sold: soldAfter, raised: raisedAfter });
  return {
    out: net,
    fee,
    net,
    priceAfter,
    soldAfter,
    raisedAfter,
    minOut: net * (1 - slippageBps / 10_000),
    impactPct: ((priceAfter - priceBefore) / priceBefore) * 100,
  };
}

/** Post-graduation: raised HYPE + book tokens seed the Uniswap V3 / PropAMM pool. */
export function poolSeed(state: CurveState) {
  const raised = Math.max(state.raised, 0);
  const tokens = CURVE.bookTokens;
  return {
    liquidityHype: raised,
    tokens,
    listPrice: raised / tokens,
    curveFinalPrice: marginalPrice({ ...state, sold: CURVE.sellable, raised }),
  };
}

export function feeSplit(feeHype: number) {
  const creator = (feeHype * CURVE.creatorShareBps) / 10_000;
  const treasury = feeHype - creator;
  const stokeBuyback = (treasury * CURVE.stokeBurnShareBps) / 10_000;
  return { creator, treasury, stokeBuyback };
}

/** Points ledger: launchpad activity feeds the STOKE airdrop. */
export function pointsForTrade(hype: number) {
  return Math.max(1, Math.round(hype * 120));
}
export function pointsForVolume(usd: number) {
  return Math.max(1, Math.round(usd / 12));
}

export const quoteCache = FEES;
