/** Read-only Hyperliquid mainnet market data. No wallet, signing, or order execution. */
import type { BookSnapshot } from "@/lib/dto";
import type { Candle } from "@/lib/chart";

export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
export const HYPERLIQUID_COIN_ICON_BASE = "https://app.hyperliquid.xyz/coins";
export const HYPERLIQUID_TIMEOUT_MS = 12_000;

export type HlPerpMarket = {
  id: string;
  coin: string;
  symbol: string;
  dex: string;
  isHip3: boolean;
  markPrice: number;
  oraclePrice: number;
  midPrice: number;
  prevDayPrice: number;
  change24h: number;
  fundingHour: number;
  openInterestUsd: number;
  volume24hUsd: number;
  maxLeverage: number;
  szDecimals: number;
  onlyIsolated: boolean;
};

export type HlSpotMarket = {
  id: string;
  coin: string;
  symbol: string;
  base: string;
  baseFullName: string | null;
  baseTokenId: string | null;
  quote: string;
  markPrice: number;
  midPrice: number;
  prevDayPrice: number;
  change24h: number;
  volume24hUsd: number;
  szDecimals: number;
  isCanonical: boolean;
};

export type HlTrade = { id: string; coin: string; side: "buy" | "sell"; price: number; size: number; time: number };

/**
 * Official Hyperliquid app CDN icon for an asset returned by the live API.
 * This is a URL constructor, not a bundled/static logo map: new listings resolve automatically.
 */
export function hyperliquidCoinIconUrl(asset: string | null | undefined): string | null {
  if (typeof asset !== "string") return null;
  const trimmed = asset.trim();
  if (!trimmed) return null;
  // Hyperliquid's official CDN keeps the full HIP-3 coin id, e.g. coins/xyz:TSLA.svg.
  // Do not strip the DEX prefix and do not guess a different ticker.
  const parts = trimmed.split(":");
  if (parts.length > 2) return null;
  if (!parts.every((part) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(part))) return null;
  return `${HYPERLIQUID_COIN_ICON_BASE}/${parts.map(encodeURIComponent).join(":")}.svg`;
}

/** Spot artwork uses its own CDN namespace. Never substitute a ticker just because it starts with U. */
export function hyperliquidSpotIconCandidates(market: Pick<HlSpotMarket, "base" | "quote" | "baseFullName">, nativeCoins: readonly string[] = []): string[] {
  const { base, quote, baseFullName } = market;
  const keys = [`${base}_spot`, `${base}_${quote}`, base];
  // Unit's documented naming convention: underlying BTC -> L1 UBTC, fullName Unit Bitcoin.
  // Require both issuer metadata and an exact live native-market symbol; no per-token alias map.
  if (/^Unit\s+\S/i.test(baseFullName ?? "") && /^U[A-Z0-9]+$/.test(base) && nativeCoins.includes(base.slice(1))) {
    keys.push(base.slice(1));
  }
  return [...new Set(keys.map(hyperliquidCoinIconUrl).filter((url): url is string => Boolean(url)))];
}

type RawPerpUniverse = { name?: unknown; szDecimals?: unknown; maxLeverage?: unknown; onlyIsolated?: unknown; isDelisted?: unknown; marginMode?: unknown };
type RawPerpCtx = { markPx?: unknown; oraclePx?: unknown; midPx?: unknown; prevDayPx?: unknown; dayNtlVlm?: unknown; openInterest?: unknown; funding?: unknown };
type RawSpotToken = { name?: unknown; index?: unknown; szDecimals?: unknown; fullName?: unknown; tokenId?: unknown };
type RawSpotPair = { name?: unknown; tokens?: unknown; index?: unknown; isCanonical?: unknown };
type RawSpotCtx = { markPx?: unknown; midPx?: unknown; prevDayPx?: unknown; dayNtlVlm?: unknown };
type RawLevel = { px?: unknown; sz?: unknown; n?: unknown };
type RawTrade = { coin?: unknown; side?: unknown; px?: unknown; sz?: unknown; time?: unknown; tid?: unknown };
type RawCandle = { t?: unknown; o?: unknown; h?: unknown; l?: unknown; c?: unknown; v?: unknown };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const pct = (mark: number, prev: number) => (prev > 0 ? ((mark - prev) / prev) * 100 : 0);

/** Public info endpoint. Browser-direct by design; the sandbox server has no outbound access to it. */
export async function hlInfo<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, HYPERLIQUID_TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abort, { once: true });
  }
  try {
    const response = await fetch(HYPERLIQUID_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error(response.status === 429 ? "Hyperliquid API rate limit (429)" : `Hyperliquid API ${response.status}`);
    return (await response.json()) as T;
  } catch (e) {
    if (signal?.aborted) throw e instanceof Error ? e : new Error("Hyperliquid request aborted");
    if (timedOut) throw new Error("Hyperliquid API timeout");
    if (e instanceof SyntaxError) throw new Error("Respons Hyperliquid tidak valid");
    if (e instanceof Error && e.message.startsWith("Hyperliquid API")) throw e;
    throw new Error("Hyperliquid API tidak dapat dijangkau");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function normalizePerpMarkets(raw: unknown): HlPerpMarket[] {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  const meta = raw[0] as { universe?: unknown };
  const ctxs = raw[1];
  if (!Array.isArray(meta?.universe) || !Array.isArray(ctxs)) return [];
  const out: HlPerpMarket[] = [];
  meta.universe.forEach((u: unknown, i: number) => {
    if (!isObj(u) || typeof u.name !== "string" || !u.name) return;
    const c = ctxs[i];
    if (!isObj(c) || u.isDelisted === true) return;
    const ctx = c as RawPerpCtx;
    const mark = num(ctx.markPx);
    if (mark <= 0) return;
    const prev = num(ctx.prevDayPx, mark) || mark;
    const oi = num(ctx.openInterest);
    const dex = u.name.includes(":") ? u.name.slice(0, u.name.indexOf(":")) : "";
    out.push({
      id: `hl:perp:${u.name}`,
      coin: u.name,
      symbol: u.name.includes(":") ? u.name.slice(u.name.indexOf(":") + 1) : u.name,
      dex,
      isHip3: Boolean(dex),
      markPrice: mark,
      oraclePrice: num(ctx.oraclePx, mark) || mark,
      midPrice: num(ctx.midPx, mark) || mark,
      prevDayPrice: prev,
      change24h: pct(mark, prev),
      fundingHour: num(ctx.funding),
      openInterestUsd: oi * mark,
      volume24hUsd: num(ctx.dayNtlVlm),
      maxLeverage: Math.max(1, num(u.maxLeverage, 1)),
      szDecimals: Math.max(0, Math.floor(num(u.szDecimals, 2))),
      onlyIsolated: Boolean(u.onlyIsolated || u.marginMode === "strictIsolated" || u.marginMode === "noCross"),
    });
  });
  return out.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
}

export function normalizeSpotMarkets(raw: unknown): HlSpotMarket[] {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  const meta = raw[0] as { tokens?: unknown; universe?: unknown };
  const ctxs = raw[1];
  if (!Array.isArray(meta?.tokens) || !Array.isArray(meta?.universe) || !Array.isArray(ctxs)) return [];
  const tokens = new Map<number, RawSpotToken>();
  for (const t of meta.tokens) {
    if (isObj(t) && typeof t.index === "number" && typeof t.name === "string") tokens.set(t.index, t as RawSpotToken);
  }
  const contextsByCoin = new Map(ctxs.filter(isObj).filter(c => typeof c.coin === "string").map(c => [c.coin as string, c]));
  const out: HlSpotMarket[] = [];
  meta.universe.forEach((pair: unknown, i: number) => {
    if (!isObj(pair) || typeof pair.name !== "string" || !Array.isArray(pair.tokens) || pair.tokens.length < 2) return;
    const c = contextsByCoin.size ? contextsByCoin.get(pair.name) : ctxs[typeof pair.index === "number" ? pair.index : i];
    if (!isObj(c)) return;
    const baseToken = tokens.get(Number(pair.tokens[0]));
    const quoteToken = tokens.get(Number(pair.tokens[1]));
    if (typeof baseToken?.name !== "string" || typeof quoteToken?.name !== "string") return;
    const ctx = c as RawSpotCtx;
    const mark = num(ctx.markPx);
    if (mark <= 0) return;
    const prev = num(ctx.prevDayPx, mark) || mark;
    out.push({
      id: `hl:spot:${pair.name}`,
      coin: pair.name,
      symbol: `${baseToken.name}/${quoteToken.name}`,
      base: baseToken.name,
      baseFullName: typeof baseToken.fullName === "string" ? baseToken.fullName : null,
      baseTokenId: typeof baseToken.tokenId === "string" ? baseToken.tokenId : null,
      quote: quoteToken.name,
      markPrice: mark,
      midPrice: num(ctx.midPx, mark) || mark,
      prevDayPrice: prev,
      change24h: pct(mark, prev),
      volume24hUsd: num(ctx.dayNtlVlm),
      szDecimals: Math.max(0, Math.floor(num(baseToken.szDecimals, 2))),
      isCanonical: pair.isCanonical === true,
    });
  });
  return out.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
}

export function normalizeBook(raw: unknown): BookSnapshot | null {
  if (!isObj(raw) || !Array.isArray(raw.levels) || raw.levels.length < 2) return null;
  const mapSide = (levels: unknown) => {
    if (!Array.isArray(levels)) return [];
    let total = 0;
    return levels
      .filter(isObj)
      .map((l) => ({ price: num((l as RawLevel).px), size: num((l as RawLevel).sz), total: 0 }))
      .filter((l) => l.price > 0 && l.size > 0)
      .map((l) => { total += l.size; return { ...l, total }; });
  };
  const bids = mapSide(raw.levels[0]).slice(0, 20);
  const asks = mapSide(raw.levels[1]).slice(0, 20);
  if (!bids.length && !asks.length) return null;
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const bidSize = bids.reduce((a, b) => a + b.size, 0);
  const askSize = asks.reduce((a, b) => a + b.size, 0);
  return { bids, asks, mid, spreadBps: bestBid > 0 && bestAsk > 0 ? ((bestAsk - bestBid) / bestBid) * 10_000 : 0, imbalance: bidSize - askSize };
}

export function normalizeTrades(raw: unknown): HlTrade[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isObj)
    .map((t) => ({
      id: `${num(t.time)}:${num(t.tid)}`,
      coin: typeof t.coin === "string" ? t.coin : "",
      side: t.side === "B" ? "buy" as const : "sell" as const,
      price: num(t.px),
      size: num(t.sz),
      time: num(t.time),
    }))
    .filter((t) => t.price > 0 && t.size > 0 && t.time > 0)
    .sort((a, b) => b.time - a.time)
    .slice(0, 40);
}

export function normalizeCandles(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isObj)
    .map((r) => ({ t: num(r.t), o: num(r.o), h: num(r.h), l: num(r.l), c: num(r.c), v: Math.max(0, num(r.v)) }))
    .filter((r) => r.t > 0 && r.o > 0 && r.h > 0 && r.l > 0 && r.c > 0 && r.h >= r.l)
    .sort((a, b) => a.t - b.t);
}

/** Merge independently fetched metaAndAssetCtxs responses; NOT allPerpMetas metadata. */
export function normalizePerpContextBatches(raw: unknown): HlPerpMarket[] {
  if (!Array.isArray(raw)) return [];
  const out: HlPerpMarket[] = [];
  for (const entry of raw) {
    if (Array.isArray(entry)) out.push(...normalizePerpMarkets(entry));
  }
  const seen = new Set<string>();
  return out.filter((m) => (seen.has(m.coin) ? false : (seen.add(m.coin), true))).sort((a, b) => b.volume24hUsd - a.volume24hUsd);
}

// allPerpMetas is metadata, not [metadata, asset-contexts] pairs.
// Prices must come from metaAndAssetCtxs for each discovered perp DEX.
let dexCache: { names: string[]; at: number } | null = null;
export async function loadPerpMarkets(signal?: AbortSignal) {
  const native = normalizePerpMarkets(await hlInfo<unknown>({ type: "metaAndAssetCtxs" }, signal));
  if (!native.length) throw new Error("Hyperliquid native perpetual contexts are empty or invalid.");
  let names: string[] = dexCache && Date.now() - dexCache.at < 300_000 ? dexCache.names : [];
  if (!dexCache || Date.now() - dexCache.at >= 300_000) {
    let raw: unknown;
    try { raw = await hlInfo<unknown>({ type: "perpDexs" }, signal); }
    catch (e) { if (signal?.aborted) throw e; return { markets: native, warning: "HIP-3 DEX discovery failed; native perpetuals remain available." }; }
    if (!Array.isArray(raw)) return { markets: native, warning: "Invalid HIP-3 DEX discovery response; native perpetuals remain available." };
    names = [...new Set(raw.filter(isObj).map(d => d.name).filter((name): name is string => typeof name === "string" && name.length > 0))];
    dexCache = { names, at: Date.now() };
  }
  const markets = [...native];
  const failed: string[] = [];
  // Bound concurrency; do not issue one unbounded burst for every HIP-3 DEX.
  for (let i = 0; i < names.length; i += 3) {
    const dexBatch = names.slice(i, i + 3);
    const batch = await Promise.allSettled(dexBatch.map(async dex => {
      const rows = normalizePerpMarkets(await hlInfo<unknown>({ type: "metaAndAssetCtxs", dex }, signal));
      return rows;
    }));
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    batch.forEach((result, index) => {
      if (result.status === "fulfilled") markets.push(...result.value);
      else failed.push(dexBatch[index]);
    });
  }
  const seen = new Set<string>();
  return { markets: markets.filter(m => !seen.has(m.coin) && Boolean(seen.add(m.coin))).sort((a, b) => b.volume24hUsd - a.volume24hUsd), warning: failed.length ? `HIP-3 feeds unavailable: ${failed.join(", ")}. Native perpetuals remain available.` : null };
}
export async function loadSpotMarkets(signal?: AbortSignal) {
  return normalizeSpotMarkets(await hlInfo<unknown>({ type: "spotMetaAndAssetCtxs" }, signal));
}
export async function loadBook(coin: string, signal?: AbortSignal) {
  return normalizeBook(await hlInfo<unknown>({ type: "l2Book", coin }, signal));
}
export async function loadTrades(coin: string, signal?: AbortSignal) {
  return normalizeTrades(await hlInfo<unknown>({ type: "recentTrades", coin }, signal));
}
export async function loadCandles(coin: string, interval: string, bars: number, signal?: AbortSignal) {
  const ms: Record<string, number> = { "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };
  const step = ms[interval] ?? 900_000;
  const count = Math.max(1, Math.min(5000, Math.floor(bars)));
  const endTime = Date.now();
  const raw = await hlInfo<unknown>({ type: "candleSnapshot", req: { coin, interval, startTime: endTime - count * step, endTime } }, signal);
  return normalizeCandles(raw).slice(-count);
}
