export type MarketKind = "crypto" | "equity" | "commodity" | "builder";

export type Market = {
  sym: string;
  name: string;
  px: number;
  chg: number;
  kind: MarketKind;
  vol: number;
};

export const MARKETS: Market[] = [
  { sym: "HYPE", name: "Hyperliquid", px: 27.41, chg: 4.82, kind: "crypto", vol: 184.2 },
  { sym: "BTC", name: "Bitcoin", px: 68214, chg: 1.24, kind: "crypto", vol: 942.7 },
  { sym: "ETH", name: "Ethereum", px: 3418.6, chg: -0.83, kind: "crypto", vol: 511.4 },
  { sym: "SOL", name: "Solana", px: 171.22, chg: 3.41, kind: "crypto", vol: 208.9 },
  { sym: "NVDA", name: "NVIDIA Equity", px: 118.4, chg: 2.16, kind: "equity", vol: 44.1 },
  { sym: "TSLA", name: "Tesla Equity", px: 246.1, chg: -1.72, kind: "equity", vol: 38.6 },
  { sym: "XAU", name: "Gold Spot", px: 2641.8, chg: 0.44, kind: "commodity", vol: 61.3 },
  { sym: "BRENT", name: "Brent Crude", px: 74.31, chg: -0.62, kind: "commodity", vol: 22.8 },
  { sym: "KMOD", name: "Builder Market", px: 3.842, chg: 18.4, kind: "builder", vol: 12.4 },
  { sym: "VELO", name: "Builder Market", px: 0.917, chg: 9.11, kind: "builder", vol: 8.2 },
  { sym: "AERO", name: "Builder Market", px: 22.06, chg: -4.28, kind: "builder", vol: 15.7 },
  { sym: "NORD", name: "Builder Market", px: 1.284, chg: 6.9, kind: "builder", vol: 5.1 },
];

export const SUGGESTED_TICKERS = ["KMOD", "VELO", "AERO", "NORD", "ZEPH", "ORCA", "LUMEN"];

export const COLLATERAL = [
  { id: "usdc", label: "USDC", note: "Stable · paling likuid" },
  { id: "hype", label: "HYPE", note: "Native · fee discount" },
  { id: "eth", label: "wETH", note: "Volatile · hedge mode" },
];

/* deterministic-ish pseudo random with seed */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sparkPath(seed: number, w = 120, h = 34, points = 26) {
  const r = mulberry(seed);
  let v = 0.5;
  const vals: number[] = [];
  for (let i = 0; i < points; i++) {
    v += (r() - 0.48) * 0.22;
    v = Math.max(0.08, Math.min(0.92, v));
    vals.push(v);
  }
  const trend = (r() - 0.35) * 0.4;
  return vals
    .map((val, i) => {
      const x = (i / (points - 1)) * w;
      const y = h - (val + (i / points) * trend) * h * 0.86 - h * 0.07;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${Math.max(2, Math.min(h - 2, y)).toFixed(1)}`;
    })
    .join(" ");
}

export const fmtUsd = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export const fmtPrice = (n: number) => {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (n >= 10) return n.toFixed(2);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
};

export const shortAddr = () => {
  const hex = "0123456789abcdef";
  const r = mulberry(Math.floor(Math.random() * 1e9));
  let s = "";
  for (let i = 0; i < 4; i++) s += hex[Math.floor(r() * 16)];
  let e = "";
  for (let i = 0; i < 4; i++) e += hex[Math.floor(r() * 16)];
  return `0x${s}…${e}`;
};

export const txHash = () => {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 10; i++) s += hex[Math.floor(Math.random() * 16)];
  return `0x${s}`;
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type Candle = { o: number; h: number; l: number; c: number; v: number };

export function seedCandles(start: number, n = 34, seed = 7): Candle[] {
  const r = mulberry(seed);
  const out: Candle[] = [];
  let px = start;
  for (let i = 0; i < n; i++) {
    const o = px;
    const drift = (r() - 0.42) * 0.05;
    const c = o * (1 + drift);
    const h = Math.max(o, c) * (1 + r() * 0.018);
    const l = Math.min(o, c) * (1 - r() * 0.018);
    out.push({ o, h, l, c, v: 0.4 + r() });
    px = c;
  }
  return out;
}

export type BookLevel = { px: number; size: number; total: number };

export function makeBook(mid: number, tickPct = 0.0016, rows = 11, seed = 4242) {
  const r = mulberry(seed);
  const bids: BookLevel[] = [];
  const asks: BookLevel[] = [];
  let bt = 0;
  let at = 0;
  for (let i = 0; i < rows; i++) {
    const bSize = (0.6 + r() * 4.2 + i * 0.28) * (0.86 + Math.random() * 0.28);
    const aSize = (0.6 + r() * 4.2 + i * 0.28) * (0.86 + Math.random() * 0.28);
    bt += bSize;
    at += aSize;
    bids.push({ px: mid * (1 - tickPct * (i + 1)), size: bSize, total: bt });
    asks.push({ px: mid * (1 + tickPct * (i + 1)), size: aSize, total: at });
  }
  return { bids, asks };
}
