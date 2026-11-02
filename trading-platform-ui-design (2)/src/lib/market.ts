export type AssetStatus = "bonding" | "graduated";

export type LaunchAsset = {
  symbol: string;
  name: string;
  description: string;
  category: string;
  color: string;
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  progress: number;
  graduationTarget?: number;
  holders: number;
  status: AssetStatus;
  created: string;
  seed: number;
  custom?: boolean;
};

export type PerpMarket = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: number;
  openInterest: number;
  funding: number;
  leverage: number;
  seed: number;
  color: string;
  category: "Core" | "Builder";
};

// Fixture data powers the product preview. It is not a live market feed.
export const BASE_ASSETS: LaunchAsset[] = [
  { symbol: "ATLS", name: "Atlas Network", description: "An open coordination layer for autonomous agents and the people who build with them.", category: "Infrastructure", color: "#b7dcb3", price: 0.0842, change: 18.42, volume: 148200, marketCap: 842000, progress: 88, holders: 1248, status: "bonding", created: "2h ago", seed: 11 },
  { symbol: "NOVA", name: "Nova Finance", description: "Modular tools for onchain capital formation and new internet-native markets.", category: "DeFi", color: "#ddc2a9", price: 0.0364, change: 8.16, volume: 94300, marketCap: 364000, progress: 67, holders: 826, status: "bonding", created: "5h ago", seed: 23 },
  { symbol: "KITE", name: "Kite Protocol", description: "Programmable ownership for a more connected creator economy.", category: "Social", color: "#b6c9e3", price: 0.0128, change: -3.21, volume: 52100, marketCap: 128000, progress: 43, holders: 592, status: "bonding", created: "8h ago", seed: 31 },
  { symbol: "MESA", name: "Mesa Markets", description: "New rails for community-owned markets with transparent liquidity.", category: "DeFi", color: "#d7d1a5", price: 0.0097, change: 12.84, volume: 78200, marketCap: 97000, progress: 32, holders: 467, status: "bonding", created: "1d ago", seed: 47 },
  { symbol: "ORBT", name: "Orbit Collective", description: "A home for collaborative research and public goods onchain.", category: "Community", color: "#c0bddf", price: 0.0063, change: 5.64, volume: 31100, marketCap: 63000, progress: 21, holders: 315, status: "bonding", created: "2d ago", seed: 59 },
  { symbol: "VLTA", name: "Volta Energy", description: "A community experiment in renewable energy coordination.", category: "RWA", color: "#e4b6a8", price: 0.1234, change: 24.09, volume: 226000, marketCap: 1234000, progress: 100, holders: 2194, status: "graduated", created: "3d ago", seed: 71 },
  { symbol: "WAVE", name: "Waveform", description: "Music, media, and the people moving culture forward.", category: "Culture", color: "#b7d8d6", price: 0.0786, change: 6.31, volume: 184000, marketCap: 786000, progress: 100, holders: 1603, status: "graduated", created: "6d ago", seed: 89 },
  { symbol: "PRSM", name: "Prism Labs", description: "A public workspace for data, models, and open experimentation.", category: "Infrastructure", color: "#d4bdd8", price: 0.0521, change: -1.86, volume: 116000, marketCap: 521000, progress: 100, holders: 1147, status: "graduated", created: "9d ago", seed: 97 },
];

export const BASE_PERPS: PerpMarket[] = [
  { symbol: "BTC", name: "Bitcoin", price: 97842.5, change: 2.34, volume: 982400000, openInterest: 823000000, funding: 0.0102, leverage: 40, seed: 103, color: "#e1bf87", category: "Core" },
  { symbol: "ETH", name: "Ethereum", price: 3248.62, change: 1.87, volume: 526100000, openInterest: 419000000, funding: 0.0084, leverage: 40, seed: 121, color: "#b2bce0", category: "Core" },
  { symbol: "SOL", name: "Solana", price: 184.38, change: -0.82, volume: 212800000, openInterest: 168000000, funding: -0.0038, leverage: 20, seed: 137, color: "#b8d8b3", category: "Core" },
  { symbol: "HYPE", name: "Hyperliquid", price: 32.14, change: 4.21, volume: 98400000, openInterest: 71400000, funding: 0.0126, leverage: 20, seed: 149, color: "#a8dfc3", category: "Core" },
  { symbol: "VLTA", name: "Volta Energy", price: 0.1241, change: 7.82, volume: 6840000, openInterest: 4210000, funding: 0.0131, leverage: 10, seed: 71, color: "#e4b6a8", category: "Builder" },
  { symbol: "WAVE", name: "Waveform", price: 0.0791, change: -2.41, volume: 3920000, openInterest: 2780000, funding: -0.0054, leverage: 10, seed: 89, color: "#b7d8d6", category: "Builder" },
  { symbol: "PRSM", name: "Prism Labs", price: 0.0524, change: 11.24, volume: 2180000, openInterest: 1490000, funding: 0.0092, leverage: 10, seed: 97, color: "#d4bdd8", category: "Builder" },
];

export type Candle = { open: number; high: number; low: number; close: number; volume: number };

export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCandles(price: number, seed: number, count = 56): Candle[] {
  const r = random(seed);
  const series: Candle[] = [];
  let current = 0.76;
  for (let i = 0; i < count; i++) {
    const open = current;
    const cycle = Math.sin(i * 0.33 + seed) * 0.009;
    const drift = (r() - 0.45) * 0.039 + cycle;
    const close = Math.max(0.3, open * (1 + drift));
    const high = Math.max(open, close) * (1 + r() * 0.017);
    const low = Math.min(open, close) * (1 - r() * 0.017);
    series.push({ open, high, low, close, volume: 0.25 + r() * 0.75 });
    current = close;
  }
  const multiplier = price / series[series.length - 1].close;
  return series.map((c) => ({ open: c.open * multiplier, high: c.high * multiplier, low: c.low * multiplier, close: c.close * multiplier, volume: c.volume }));
}

export function makeBook(price: number, seed: number, count = 12) {
  const r = random(seed);
  const spread = price < 1 ? 0.003 : price < 100 ? 0.0007 : 0.00014;
  return {
    asks: Array.from({ length: count }, (_, i) => ({
      price: price * (1 + spread * (i + 1)),
      size: (0.6 + r() * 7.4) * (price > 1000 ? 0.18 : price > 10 ? 1.2 : 120),
      depth: 14 + r() * 78,
    })),
    bids: Array.from({ length: count }, (_, i) => ({
      price: price * (1 - spread * (i + 1)),
      size: (0.6 + r() * 7.4) * (price > 1000 ? 0.18 : price > 10 ? 1.2 : 120),
      depth: 14 + r() * 78,
    })),
  };
}

export function money(value: number, max = 2) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: max })}`;
}

export function priceFormat(value: number) {
  const decimals = value >= 1000 ? 2 : value >= 1 ? 3 : value >= 0.01 ? 4 : 6;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function compact(value: number) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return money(value);
}

export function percent(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`; }
export function bound(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }