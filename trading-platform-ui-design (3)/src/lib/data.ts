/* ── deterministic mock market data ─────────────────────────────
   Seeded so numbers are stable between renders but still organic. */

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export function makeCandles(seed: number, n = 72, start = 0.00195, vol = 0.028): Candle[] {
  const r = lcg(seed);
  let p = start;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const drift = (r() - 0.47) * vol * p;
    const o = p;
    const c = Math.max(p * 0.6, o + drift);
    const h = Math.max(o, c) * (1 + r() * vol * 0.5);
    const l = Math.min(o, c) * (1 - r() * vol * 0.5);
    out.push({ t: i, o, h, l, c, v: 40 + r() * 100 + Math.abs(drift / p) * 900 });
    p = c;
  }
  return out;
}

export function makeSpark(seed: number, n = 28, base = 100, vol = 0.05): number[] {
  const r = lcg(seed);
  let v = base;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    v = Math.max(base * 0.55, v * (1 + (r() - 0.48) * vol));
    out.push(v);
  }
  return out;
}

export type Kind = "PERP" | "SPOT";
export type Market = {
  pair: string;
  dex: string;
  name: string;
  kind: Kind;
  sector: "EKUITAS" | "KOMODITAS" | "FX" | "INDEKS" | "KRIPTO" | "LAUNCHPAD";
  price: number;
  change: number;
  vol: number;
  oi: number;
  funding: number;
  lev: number;
  status: "LIVE" | "HALTED" | "SOON";
  spark: number[];
};

export const MARKETS: Market[] = [
  { pair: "grvd:KUDA", dex: "grvd", name: "Kuda Laut Digital", kind: "SPOT", sector: "LAUNCHPAD", price: 0.0028411, change: 18.42, vol: 1_392_400, oi: 0, funding: 0.0112, lev: 0, status: "LIVE", spark: makeSpark(11, 28, 100, 0.09) },
  { pair: "hip3:NVDA", dex: "hip3", name: "NVIDIA Corp", kind: "PERP", sector: "EKUITAS", price: 184.22, change: 2.14, vol: 284_900_000, oi: 96_400_000, funding: 0.0081, lev: 20, status: "LIVE", spark: makeSpark(23, 28, 100, 0.03) },
  { pair: "hip3:XAU", dex: "hip3", name: "Emas Spot", kind: "PERP", sector: "KOMODITAS", price: 2412.6, change: -0.42, vol: 196_400_000, oi: 71_200_000, funding: 0.0042, lev: 20, status: "LIVE", spark: makeSpark(31, 28, 100, 0.02) },
  { pair: "hip3:TSLA", dex: "hip3", name: "Tesla Inc", kind: "PERP", sector: "EKUITAS", price: 248.9, change: -3.18, vol: 161_700_000, oi: 44_800_000, funding: 0.0156, lev: 15, status: "LIVE", spark: makeSpark(47, 28, 100, 0.06) },
  { pair: "hip3:CL", dex: "hip3", name: "Minyak WTI", kind: "PERP", sector: "KOMODITAS", price: 78.41, change: 1.24, vol: 88_100_000, oi: 31_900_000, funding: -0.0035, lev: 15, status: "LIVE", spark: makeSpark(53, 28, 100, 0.04) },
  { pair: "hip3:SPX", dex: "hip3", name: "S&P 500", kind: "PERP", sector: "INDEKS", price: 5612.8, change: 0.62, vol: 74_300_000, oi: 28_400_000, funding: 0.0019, lev: 10, status: "LIVE", spark: makeSpark(61, 28, 100, 0.015) },
  { pair: "hip3:EURUSD", dex: "hip3", name: "Euro / Dolar", kind: "PERP", sector: "FX", price: 1.0842, change: 0.21, vol: 42_800_000, oi: 12_100_000, funding: 0.0008, lev: 25, status: "LIVE", spark: makeSpark(71, 28, 100, 0.008) },
  { pair: "unit:BTC", dex: "unit", name: "Bitcoin — builder venue", kind: "PERP", sector: "KRIPTO", price: 97_412.5, change: 1.08, vol: 38_200_000, oi: 19_600_000, funding: 0.0094, lev: 25, status: "LIVE", spark: makeSpark(83, 28, 100, 0.03) },
  { pair: "hip3:GOLD", dex: "hip3", name: "Emas / Perak Rasio", kind: "PERP", sector: "KOMODITAS", price: 84.12, change: 0.44, vol: 12_400_000, oi: 4_800_000, funding: 0.0021, lev: 10, status: "SOON", spark: makeSpark(97, 28, 100, 0.02) },
  { pair: "flex:AAPL", dex: "flex", name: "Apple Inc", kind: "PERP", sector: "EKUITAS", price: 231.07, change: -0.86, vol: 9_900_000, oi: 3_200_000, funding: 0.0033, lev: 15, status: "LIVE", spark: makeSpark(101, 28, 100, 0.025) },
  { pair: "flex:GBPJPY", dex: "flex", name: "Pound / Yen", kind: "PERP", sector: "FX", price: 198.44, change: 0.34, vol: 6_100_000, oi: 2_400_000, funding: -0.0012, lev: 20, status: "HALTED", spark: makeSpark(113, 28, 100, 0.02) },
  { pair: "grvd:SOL", dex: "grvd", name: "Solana — graduated", kind: "SPOT", sector: "KRIPTO", price: 186.04, change: 4.12, vol: 4_800_000, oi: 0, funding: 0.0061, lev: 0, status: "LIVE", spark: makeSpark(127, 28, 100, 0.05) },
];

export type Launch = {
  ticker: string;
  name: string;
  raised: number;
  target: number;
  mcap: number;
  holders: number;
  ageMin: number;
  price: number;
  creator: string;
  status: "CURVE" | "GRADUATED";
  spark: number[];
};

const T = 8531;
export const LAUNCHES: Launch[] = [
  { ticker: "KUDA", name: "Kuda Laut Digital", raised: 8531, target: T, mcap: 2_841_100, holders: 4_182, ageMin: 11, price: 0.0028411, creator: "0x7a4f…91c2", status: "GRADUATED", spark: makeSpark(7, 24, 100, 0.1) },
  { ticker: "AYAM", name: "Ayam Geprek Chain", raised: 7_902, target: T, mcap: 2_402_000, holders: 3_140, ageMin: 26, price: 0.002402, creator: "0x118b…4de7", status: "CURVE", spark: makeSpark(13, 24, 100, 0.09) },
  { ticker: "NASI", name: "Nasi Goreng Protocol", raised: 6_418, target: T, mcap: 1_604_500, holders: 2_288, ageMin: 41, price: 0.0016045, creator: "0x90aa…1274", status: "CURVE", spark: makeSpark(19, 24, 100, 0.08) },
  { ticker: "KOPI", name: "Kopi Tubruk DAO", raised: 4_120, target: T, mcap: 742_900, holders: 1_406, ageMin: 58, price: 0.0007429, creator: "0x3f21…8b0a", status: "CURVE", spark: makeSpark(29, 24, 100, 0.07) },
  { ticker: "BATK", name: "Batik Fraktal", raised: 2_384, target: T, mcap: 268_400, holders: 812, ageMin: 74, price: 0.0002684, creator: "0xc07d…5511", status: "CURVE", spark: makeSpark(37, 24, 100, 0.07) },
  { ticker: "OJOL", name: "Ojol Pool Syndicate", raised: 1_102, target: T, mcap: 71_600, holders: 402, ageMin: 96, price: 0.0000716, creator: "0x6b12…aa90", status: "CURVE", spark: makeSpark(43, 24, 100, 0.06) },
  { ticker: "DURI", name: "Durian Futures Club", raised: 402, target: T, mcap: 12_800, holders: 148, ageMin: 112, price: 0.0000128, creator: "0x2e88…0f4c", status: "CURVE", spark: makeSpark(59, 24, 100, 0.05) },
  { ticker: "GAMN", name: "Gamlang Gamelan NFT", raised: 8531, target: T, mcap: 2_841_100, holders: 3_960, ageMin: 8, price: 0.0028411, creator: "0x5541…c3b8", status: "GRADUATED", spark: makeSpark(67, 24, 100, 0.11) },
];

export type Fill = { t: string; side: "BUY" | "SELL"; pair: string; price: number; size: number };
export function makeFills(seed: number, n = 14): Fill[] {
  const r = lcg(seed);
  const now = Date.now();
  const picks = MARKETS.slice(0, 6);
  return Array.from({ length: n }).map((_, i) => {
    const m = picks[Math.floor(r() * picks.length)];
    const secs = i * 3 + Math.floor(r() * 4);
    return {
      t: new Date(now - secs * 1000).toLocaleTimeString("id-ID", { hour12: false }),
      side: (r() < 0.5 ? "BUY" : "SELL") as Fill["side"],
      pair: m.pair,
      price: m.price * (1 + (r() - 0.5) * 0.0015),
      size: 200 + r() * 24_000,
    };
  });
}

export type Position = {
  pair: string;
  side: "LONG" | "SHORT";
  size: number;
  entry: number;
  mark: number;
  lev: number;
  margin: number;
};

export const POSITIONS: Position[] = [
  { pair: "hip3:NVDA", side: "LONG", size: 14_200, entry: 181.4, mark: 184.22, lev: 10, margin: 1_420 },
  { pair: "hip3:XAU", side: "SHORT", size: 8_600, entry: 2_424.1, mark: 2_412.6, lev: 5, margin: 1_720 },
  { pair: "grvd:KUDA", side: "LONG", size: 1_180, entry: 0.00219, mark: 0.0028411, lev: 3, margin: 393 },
  { pair: "hip3:CL", side: "SHORT", size: 4_240, entry: 77.02, mark: 78.41, lev: 8, margin: 530 },
];

export const EQUITY = makeSpark(131, 64, 100, 0.022);
export const TAPE_SEED = 137;
