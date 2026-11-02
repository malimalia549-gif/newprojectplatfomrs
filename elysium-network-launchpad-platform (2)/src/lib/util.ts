/* Shared formatting + misc utilities (browser + server safe). */

export const ELYSIUM = {
  name: "Elysium",
  builtBy: "Kinetiq",
  chainId: 99801,
  chainIdHex: "0x185d9",
  gasToken: "HYPE",
  parentChain: "HyperEVM testnet (998)",
  rpc: "https://testnet-rpc.elysium.kinetiq.xyz",
  explorer: "https://elysium.kinetiq.xyz/testnet-explorer",
  faucet: "https://elysium.kinetiq.xyz/testnet-faucet",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  whype: "0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234",
  blockMs: 130,
  targetBlockMs: "100–200ms",
  gasTarget: "300 Mgas/s",
  arbOS: 61,
  rollup: "Arbitrum Orbit · Nitro · BoLD",
  settlement: "HyperEVM",
  da: "AnyTrust committee",
  sequencer: "Conduit G2",
  hip3Stake: "500,000 HYPE",
  mainnet: "2026-11-09",
} as const;

/** Tickers that can never be claimed by a launchpad token (HyperCore reserved). */
export const RESERVED_TICKERS = [
  "HYPE",
  "USDC",
  "USDT",
  "USDE",
  "USDH",
  "BTC",
  "ETH",
  "SOL",
  "UBTC",
  "UETH",
  "USOL",
  "PURR",
  "HFUN",
  "KNTQ",
  "STOKE",
  "X",
  "USD",
];

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function fmtNum(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCompact(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(digits)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(digits)}K`;
  return n.toFixed(abs < 1 ? 2 : digits);
}

/** Prices of launchpad tokens are tiny — show enough decimals to stay readable. */
export function fmtPrice(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(2);
  if (abs >= 1) return n.toFixed(4);
  const zeros = Math.min(9, Math.max(0, -Math.floor(Math.log10(abs))));
  return n.toFixed(zeros + 4);
}

export const fmtUsd = (n: number) => (Number.isFinite(n) ? `$${fmtNum(n, n < 1 ? 4 : 2)}` : "—");
export const fmtHype = (n: number) => (Number.isFinite(n) ? `${fmtNum(n, n < 1 ? 5 : 3)} HYPE` : "—");
export const fmtPct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${fmtNum(n, digits)}%`;
export const fmtTok = (n: number) => fmtCompact(n, 2);

export function shortAddr(addr?: string | null, size = 4) {
  if (!addr) return "—";
  return addr.length > size * 2 + 4 ? `${addr.slice(0, size + 2)}…${addr.slice(-size)}` : addr;
}

export function timeAgo(when: Date | string | number | null | undefined) {
  if (!when) return "—";
  const t = new Date(when).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export const nowIso = () => new Date().toISOString();

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 42);
}

export function normalizeSymbol(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function symbolIssue(symbol: string): string | null {
  if (!/^[A-Z0-9]{2,6}$/.test(symbol)) return "Symbol must be 2–6 chars of A–Z / 0–9 (it becomes the HyperCore ticker).";
  if (RESERVED_TICKERS.includes(symbol)) return `“${symbol}” is a reserved HyperCore ticker and cannot be launched.`;
  if (/^[0-9]/.test(symbol)) return "Symbol cannot start with a digit.";
  return null;
}

/** Deterministic seeded RNG (mulberry32) for reproducible mock books. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashInt(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function gauss(r: () => number) {
  const u = 1 - r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u || 1e-9)) * Math.cos(2 * Math.PI * v);
}

export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function pctChange(a: number, b: number) {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}
