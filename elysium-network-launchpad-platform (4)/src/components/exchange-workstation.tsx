"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Zap } from "lucide-react";
import { api, useForge, useLive } from "@/components/providers";
import { MarketChart } from "@/components/market-chart";
import { Badge, Btn, Delta, EmptyState, Input, Modal, Skeleton, TokenGlyph } from "@/components/ui";
import { ELYSIUM, cn, fmtCompact, fmtNum, fmtPrice, fmtUsd, hashInt, shortAddr, timeAgo } from "@/lib/util";
import type { BookSnapshot, PerpMarket, PerpPosition } from "@/lib/dto";
import type { RecentSwapRow, SwapAsset, SwapQuote } from "@/lib/swap";

type Mode = "spot" | "perp";
type SwapState = {
  prices: { hypeUsd: number; stokeUsd: number; headBlock: number };
  assets: SwapAsset[];
  recentSwaps: RecentSwapRow[];
};
type PerpPanel = {
  market: PerpMarket | null;
  book: BookSnapshot;
  tape: Array<{ id: string; side: "buy" | "sell"; price: number; size: number; at: number }>;
  launch: { slug: string; symbol: string; stage: string; cashtag: string | null; holders: number } | null;
  fills: Array<{ id: string; action: string; side: string; size: number; price: number; pnlUsd: number; traderName: string | null; txHash: string; createdAt: string; mine: boolean }>;
  markets: PerpMarket[];
  positions?: PerpPosition[];
  restingOrders?: Array<{ id: string; symbol: string; side: string; kind: string; size: number; limitPrice: number | null; leverage: number; status: string }>;
};
type Network = {
  network: { headBlock: number; blockMs: number };
  prices: { hypeUsd: number; stokeUsd: number };
  stats: { launches: number; perpMarkets: number; perpVolumeUsd: number; perpOiUsd: number };
};
type RailItem = {
  id: string;
  kind: Mode;
  symbol: string;
  name: string;
  venue: string;
  glyph: string;
  accent: string;
  priceUsd: number;
  change: number;
  swappable: boolean;
  marketId?: string;
};
type SwapExec = {
  txHash: string;
  amountIn: number;
  amountOut: number;
  fromSymbol: string;
  toSymbol: string;
  route: string[];
  venues: string[];
  state: SwapState;
};

function fmtPx(v: number) {
  if (!Number.isFinite(v) || v === 0) return "$0.00";
  if (v >= 100) return `$${fmtNum(v, 2)}`;
  if (v >= 1) return `$${fmtNum(v, 4)}`;
  if (v >= 0.001) return `$${v.toFixed(5)}`;
  return `$${fmtPrice(v)}`;
}
function fmtQty(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1_000_000) return fmtCompact(n, 3);
  if (a >= 100) return fmtNum(n, 2);
  if (a >= 1) return fmtNum(n, 4);
  return fmtPrice(n);
}
function pct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function syntheticBook(asset: SwapAsset | null): BookSnapshot | null {
  if (!asset || asset.priceUsd <= 0) return null;
  const mark = asset.priceUsd;
  const step = Math.max(mark * 0.00035, Number(mark.toPrecision(2)) * 0.0001, 1e-11);
  const seed = hashInt(asset.symbol);
  const asks: Array<{ price: number; size: number; total: number }> = [];
  const bids: Array<{ price: number; size: number; total: number }> = [];
  let at = 0;
  let bt = 0;
  for (let i = 9; i >= 1; i--) {
    const size = (18 + ((seed + i * 37) % 84)) * Math.max(1, Math.round(asset.liquidityUsd / 2_000_000));
    at += size;
    asks.push({ price: Number((mark + i * step).toPrecision(10)), size, total: at });
  }
  for (let i = 1; i <= 9; i++) {
    const size = (20 + ((seed + i * 53) % 91)) * Math.max(1, Math.round(asset.liquidityUsd / 2_000_000));
    bt += size;
    bids.push({ price: Number(Math.max(step * 0.5, mark - i * step).toPrecision(10)), size, total: bt });
  }
  const bestBid = bids[0]?.price ?? mark;
  const bestAsk = asks[0]?.price ?? mark;
  return { bids, asks, mid: (bestBid + bestAsk) / 2, spreadBps: bestBid ? ((bestAsk - bestBid) / bestBid) * 10_000 : 0, imbalance: bt - at };
}

export function ExchangeWorkstation() {
  const sp = useSearchParams();
  const { user, push, refresh, setAuthModal } = useForge();

  const initialMode: Mode = sp.get("mode") === "perp" || Boolean(sp.get("m")) ? "perp" : "spot";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fromSym, setFromSym] = useState((sp.get("from") || "HYPE").toUpperCase());
  const [toSym, setToSym] = useState((sp.get("to") || "ORBT").toUpperCase());
  const [marketId, setMarketId] = useState<string | null>(sp.get("m"));

  useEffect(() => {
    const qMode = sp.get("mode");
    const qMarket = sp.get("m");
    const qFrom = sp.get("from");
    const qTo = sp.get("to");
    if (qMarket) setMarketId(qMarket);
    if (qFrom) setFromSym(qFrom.toUpperCase());
    if (qTo) setToSym(qTo.toUpperCase());
    if (qMode === "perp" || qMarket) setMode("perp");
    else if (qMode === "swap" || qMode === "spot" || qFrom || qTo) setMode("spot");
  }, [sp]);

  const swap = useLive<SwapState>("/api/swap", 6000);
  const perps = useLive<{ markets: PerpMarket[] }>(mode === "perp" ? "/api/perp" : null, 5000);
  const net = useLive<Network>("/api/network", 8000);
  const activeMarketId = marketId ?? perps.data?.markets?.[0]?.id ?? null;
  const panel = useLive<PerpPanel>(mode === "perp" && activeMarketId ? `/api/perp/${activeMarketId}` : null, 3200);

  const assets = useMemo(() => swap.data?.assets ?? [], [swap.data]);
  const swappable = useMemo(() => assets.filter((a) => a.swappable), [assets]);
  const perpMarkets = useMemo(() => perps.data?.markets ?? panel.data?.markets ?? [], [perps.data, panel.data]);
  const perp = useMemo(
    () => panel.data?.market ?? perpMarkets.find((m) => m.id === activeMarketId) ?? null,
    [panel.data, perpMarkets, activeMarketId],
  );

  useEffect(() => {
    if (!swappable.length) return;
    if (!swappable.some((a) => a.symbol === fromSym)) setFromSym("HYPE");
    if (!swappable.some((a) => a.symbol === toSym) || toSym === fromSym) {
      const fallback = swappable.find((a) => a.symbol !== fromSym && a.symbol !== "USDC");
      if (fallback) setToSym(fallback.symbol);
    }
  }, [swappable, fromSym, toSym]);

  const fromAsset = useMemo(() => assets.find((a) => a.symbol === fromSym) ?? null, [assets, fromSym]);
  const toAsset = useMemo(() => assets.find((a) => a.symbol === toSym) ?? null, [assets, toSym]);
  const focusAsset = useMemo(() => {
    if (toAsset && toAsset.symbol !== "USDC") return toAsset;
    if (fromAsset && fromAsset.symbol !== "USDC") return fromAsset;
    return toAsset ?? fromAsset ?? null;
  }, [fromAsset, toAsset]);
  const focusSymbol = focusAsset?.symbol ?? toSym;

  const hypeUsd = swap.data?.prices.hypeUsd ?? net.data?.prices.hypeUsd ?? 28.4;
  const stokeUsd = swap.data?.prices.stokeUsd ?? net.data?.prices.stokeUsd ?? 0.0412;
  const equity = user ? user.hype * hypeUsd + user.usdc + user.stoke * stokeUsd : 0;

  const priceUsd = mode === "perp" ? (perp?.markPrice ?? 0) : (focusAsset?.priceUsd ?? 0);
  const change = mode === "perp" ? (perp?.change24h ?? 0) : (focusAsset?.change24h ?? 0);
  const trail = useMemo(() => {
    const raw = mode === "perp" ? (perp?.trail ?? []) : (focusAsset?.trail ?? []);
    if (raw.length >= 2) return raw;
    return [priceUsd * 0.985, priceUsd * 0.995, priceUsd, priceUsd * 1.008, priceUsd * 1.015].filter((v) => Number.isFinite(v) && v > 0);
  }, [mode, perp, focusAsset, priceUsd]);
  const high = trail.length ? Math.max(...trail) : priceUsd * 1.04;
  const low = trail.length ? Math.min(...trail) : priceUsd * 0.96;

  const spotBook = useMemo(() => syntheticBook(focusAsset), [focusAsset]);
  const activeBook = mode === "perp" ? panel.data?.book : spotBook;

  const positions = panel.data?.positions ?? [];
  const orders = panel.data?.restingOrders ?? [];
  const fills = panel.data?.fills ?? [];
  const recentSwaps = swap.data?.recentSwaps ?? [];

  /* ---------------------------------------------------------------- state */
  const [railFilter, setRailFilter] = useState<"all" | "coins" | "tokens" | "perps">("all");
  const [railSearch, setRailSearch] = useState("");
  const [starred, setStarred] = useState<string[]>([]);
  const [chartView, setChartView] = useState<"price" | "depth" | "info">("price");
  const [bookTab, setBookTab] = useState<"book" | "trades">("book");
  const [blotterTab, setBlotterTab] = useState<"balances" | "positions" | "orders" | "fills" | "swaps" | "info">("balances");

  const [amountIn, setAmountIn] = useState("1");
  const [slippageBps, setSlippageBps] = useState(50);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [invertRate, setInvertRate] = useState(false);
  const [pickerSide, setPickerSide] = useState<null | "from" | "to">(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState<"all" | "coin" | "spot" | "curve">("all");

  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(10);
  const [sizeMode, setSizeMode] = useState<"usdc" | "tokens">("usdc");
  const [sizeAmount, setSizeAmount] = useState("500");
  const [limitPrice, setLimitPrice] = useState("");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const maxLev = perp?.maxLeverage ?? 20;
  useEffect(() => { if (leverage > maxLev) setLeverage(maxLev); }, [maxLev, leverage]);

  /* ---------------------------------------------------------------- quote */
  useEffect(() => {
    const n = Number(amountIn);
    if (mode !== "spot" || fromSym === toSym || !Number.isFinite(n) || n <= 0) {
      setQuote(null); setQuoteErr(null); setQuoting(false);
      return;
    }
    let alive = true;
    setQuoting(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await api<{ quote: SwapQuote }>("/api/swap", {
          json: { action: "quote", from: fromSym, to: toSym, amount: n, slippageBps },
        });
        if (!alive) return;
        setQuote(res.quote); setQuoteErr(null);
      } catch (e) {
        if (!alive) return;
        setQuote(null); setQuoteErr((e as Error).message);
      } finally {
        if (alive) setQuoting(false);
      }
    }, 220);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [mode, fromSym, toSym, amountIn, slippageBps, swap.data?.prices.headBlock]);

  const est = useMemo(() => {
    const mark = perp?.markPrice ?? 0;
    const ref = orderType === "limit" && Number(limitPrice) > 0 ? Number(limitPrice) : mark;
    const qty = Number(sizeAmount) || 0;
    const notional = sizeMode === "usdc" ? qty : qty * ref;
    const size = ref > 0 ? notional / ref : 0;
    const margin = notional / Math.max(1, leverage);
    const feeBps = orderType === "limit" ? (perp?.makerFeeBps ?? 1) : (perp?.takerFeeBps ?? 4.5);
    const fee = notional * (feeBps / 10_000);
    const liq = ref > 0 ? (side === "long" ? ref * (1 - 1 / leverage + 0.005) : ref * (1 + 1 / leverage - 0.005)) : 0;
    return { ref, notional, size, margin, fee, liq };
  }, [perp, orderType, limitPrice, sizeAmount, sizeMode, leverage, side]);

  /* ---------------------------------------------------------------- actions */
  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === "perp" && !marketId && perpMarkets[0]) setMarketId(perpMarkets[0].id);
  };
  const selectSpotAsset = (symbol: string) => {
    if (symbol === "USDC") { setFromSym("HYPE"); setToSym("USDC"); }
    else if (symbol === "HYPE") { setFromSym("USDC"); setToSym("HYPE"); }
    else { setFromSym("HYPE"); setToSym(symbol); }
    setMode("spot");
  };
  const selectPerp = (id: string) => { setMarketId(id); setMode("perp"); };
  const switchToPerpFor = (symbol: string) => {
    const found = perpMarkets.find((m) => m.symbol === symbol);
    if (found) setMarketId(found.id);
    setMode("perp");
  };
  const switchToSpotFor = (symbol: string) => { selectSpotAsset(symbol); };
  const flipPair = () => {
    const oldFrom = fromSym;
    setFromSym(toSym);
    setToSym(oldFrom);
    if (quote && Number.isFinite(quote.amountOut) && quote.amountOut > 0) {
      const out = quote.amountOut;
      setAmountIn(out >= 100 ? out.toFixed(2) : out >= 1 ? out.toFixed(4) : Number(out.toPrecision(5)).toString());
    }
  };
  const applyPct = (p: number) => {
    const bal = fromAsset?.balance ?? 0;
    if (bal <= 0) return;
    const usable = fromSym === "HYPE" && p === 100 ? Math.max(0, bal - 0.01) : (bal * p) / 100;
    setAmountIn(usable >= 100 ? usable.toFixed(2) : usable >= 1 ? usable.toFixed(4) : Number(usable.toPrecision(5)).toString());
  };
  const executeSwapOrder = async () => {
    if (!user) return setAuthModal("login");
    const n = Number(amountIn);
    if (!Number.isFinite(n) || n <= 0 || !quote) return push({ kind: "error", title: "Enter a valid swap amount" });
    setBusy(true);
    try {
      const res = await api<SwapExec>("/api/swap", {
        json: { action: "execute", from: fromSym, to: toSym, amount: n, slippageBps },
      });
      swap.setData(res.state);
      push({
        kind: "tx",
        title: `Swapped ${fmtQty(res.amountIn)} ${res.fromSymbol} → ${fmtQty(res.amountOut)} ${res.toSymbol}`,
        body: `${res.venues.join(" → ")} · ${shortAddr(res.txHash, 6)}`,
      });
      await refresh();
      await swap.reload();
    } catch (e) {
      push({ kind: "error", title: "Swap declined", body: (e as Error).message });
    } finally { setBusy(false); }
  };

  const placePerp = async () => {
    if (!user) return setAuthModal("login");
    if (!perp) return;
    setBusy(true);
    try {
      await api("/api/perp", {
        json: {
          action: orderType === "market" ? "open" : "limit",
          marketId: perp.id,
          side: orderType === "market" ? side : side === "long" ? "buy" : "sell",
          size: orderType === "limit" ? est.size : sizeMode === "tokens" ? Number(sizeAmount) || 0 : 0,
          notionalUsd: orderType === "market" && sizeMode === "usdc" ? Number(sizeAmount) || 0 : 0,
          leverage,
          limitPrice: orderType === "limit" ? Number(limitPrice) || 0 : 0,
          tpPct: tp ? Number(tp) : 0,
          slPct: sl ? Number(sl) : 0,
        },
      });
      push({
        kind: "success",
        title: orderType === "market" ? `${side === "long" ? "Long" : "Short"} ${perp.symbol} opened` : `${perp.symbol} limit order placed`,
        body: `${fmtUsd(est.notional)} notional · ${leverage}x · liquidation ${fmtPx(est.liq)}`,
      });
      await panel.reload();
      await refresh();
      await swap.reload();
    } catch (e) {
      push({ kind: "error", title: "Order rejected", body: (e as Error).message });
    } finally { setBusy(false); }
  };
  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      push({ kind: "success", title: label });
      await panel.reload(); await refresh(); await swap.reload();
    } catch (e) { push({ kind: "error", title: `${label} failed`, body: (e as Error).message }); }
    finally { setBusy(false); }
  };
  const onBookPrice = (price: number) => {
    if (mode !== "perp") return;
    setOrderType("limit");
    setLimitPrice(price < 0.001 ? price.toFixed(10) : price.toPrecision(6));
  };

  /* ---------------------------------------------------------------- derived */
  const railItems = useMemo<RailItem[]>(() => {
    const spot: RailItem[] = assets.map((a) => ({
      id: `spot:${a.symbol}`, kind: "spot" as Mode, symbol: a.symbol, name: a.name, venue: a.venue,
      glyph: a.glyph, accent: a.accent, priceUsd: a.priceUsd, change: a.change24h,
      swappable: a.swappable, marketId: a.perpMarketId ?? undefined,
    }));
    const perpItems: RailItem[] = perpMarkets.map((m) => ({
      id: `perp:${m.id}`, kind: "perp" as Mode, symbol: m.symbol, name: `${m.symbol} perpetual`, venue: `${m.maxLeverage}x · HIP-3`,
      glyph: m.symbol.slice(0, 1), accent: "#1d472f", priceUsd: m.markPrice, change: m.change24h,
      swappable: true, marketId: m.id,
    }));
    return [...spot, ...perpItems];
  }, [assets, perpMarkets]);
  const visibleRail = useMemo(() => {
    const q = railSearch.trim().toLowerCase();
    return railItems
      .filter((i) => {
        if (railFilter === "coins" && !(i.kind === "spot" && (i.symbol === "HYPE" || i.symbol === "USDC" || i.symbol === "STOKE"))) return false;
        if (railFilter === "tokens" && !(i.kind === "spot" && i.symbol !== "HYPE" && i.symbol !== "USDC" && i.symbol !== "STOKE")) return false;
        if (railFilter === "perps" && i.kind !== "perp") return false;
        return !q || i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.venue.toLowerCase().includes(q);
      })
      .sort((a, b) => Number(starred.includes(b.id)) - Number(starred.includes(a.id)) || b.priceUsd * 0 - a.priceUsd * 0);
  }, [railItems, railFilter, railSearch, starred]);
  const activeRailId = mode === "spot" ? `spot:${focusSymbol}` : `perp:${activeMarketId ?? ""}`;

  const pickerAssets = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return swappable.filter((a) => {
      if (pickerFilter === "coin" && a.kind !== "coin") return false;
      if (pickerFilter === "spot" && !(a.stage === "graduated" || a.stage === "perp_listed")) return false;
      if (pickerFilter === "curve" && !(a.stage === "trading" || a.stage === "created")) return false;
      return !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    });
  }, [swappable, pickerSearch, pickerFilter]);
  const pickerActive = pickerSide === "from" ? fromSym : toSym;

  const heldAssets = useMemo(() => assets.filter((a) => a.balance > 0.00001), [assets]);
  const popularPairs = useMemo(() => {
    const set = new Set(swappable.map((a) => a.symbol));
    return [["HYPE", "USDC"], ["USDC", "HYPE"], ["HYPE", "STOKE"], ["HYPE", "LAVA"], ["USDC", "ORBT"]].filter(([a, b]) => set.has(a!) && set.has(b!));
  }, [swappable]);
  const insufficientBalance = Boolean(user && fromAsset && Number(amountIn) > fromAsset.balance + 1e-8);
  const maxNotional = Math.max(0, (user?.usdc ?? 0) * leverage);
  const levPresets = useMemo(() => Array.from(new Set([2, 5, 10, maxLev].filter((v) => v >= 1 && v <= maxLev))).slice(0, 4), [maxLev]);

  const tape = useMemo(() => {
    const core = [
      { id: "spot:HYPE", label: "HYPE/USD", price: hypeUsd, change: 2.84, symbol: "HYPE" },
      { id: "spot:STOKE", label: "STOKE/USD", price: stokeUsd, change: 4.62, symbol: "STOKE" },
    ];
    const spotTokens = swappable.filter((a) => a.kind === "token").slice(0, 3).map((a) => ({ id: `spot:${a.symbol}`, label: `${a.symbol}/USD`, price: a.priceUsd, change: a.change24h, symbol: a.symbol }));
    const perpItems = perpMarkets.slice(0, 3).map((m) => ({ id: `perp:${m.id}`, label: `${m.symbol}-PERP`, price: m.markPrice, change: m.change24h, symbol: m.symbol }));
    return [...core, ...spotTokens, ...perpItems];
  }, [hypeUsd, stokeUsd, swappable, perpMarkets]);

  const stats = mode === "perp"
    ? [
        { label: "24h High", value: fmtPx(perp?.high24h ?? high) },
        { label: "24h Low", value: fmtPx(perp?.low24h ?? low) },
        { label: "24h Volume", value: fmtUsd(perp?.volume24hUsd ?? 0) },
        { label: "Open Interest", value: fmtUsd(perp?.openInterestUsd ?? 0) },
        { label: "Funding / 1h", value: `${((perp?.fundingHour ?? 0) * 100).toFixed(4)}%` },
        { label: "Max Leverage", value: `${maxLev}x` },
      ]
    : [
        { label: "24h High", value: fmtPx(high) },
        { label: "24h Low", value: fmtPx(low) },
        { label: "Liquidity", value: fmtUsd(focusAsset?.liquidityUsd ?? 0) },
        { label: "Market Cap", value: fmtUsd(focusAsset?.marketCapUsd ?? 0) },
        { label: "Venue Fee", value: `${((focusAsset?.feeBps ?? 30) / 100).toFixed(2)}%` },
        { label: "Your Balance", value: `${fmtQty(focusAsset?.balance ?? 0)} ${focusSymbol}` },
      ];

  return (
    <div className="exchange-page min-w-0">
      {/* Compact Exchange Header */}
      <div className="ex-top">
        <div className="ex-title-wrap">
          <div>
            <h1 className="ex-title">Trade & Markets</h1>
            <div className="ex-subtitle">Elysium spot router · HyperCore HIP-3 · Cross-venue settlement</div>
          </div>
          <div className="ex-status-chip"><span className="live-dot h-1.5 w-1.5 rounded-full bg-up" />TESTNET {ELYSIUM.chainId}</div>
          <div className="ex-status-chip">HYPE {fmtPx(hypeUsd)}</div>
          <div className="ex-status-chip">BLOCK #{fmtNum(net.data?.network.headBlock ?? swap.data?.prices.headBlock ?? 0, 0)}</div>
        </div>

        <div className="ex-top-actions">
          <div className="ex-mode-switch" role="tablist" aria-label="Trading venue">
            <button type="button" role="tab" aria-selected={mode === "spot"} data-active={mode === "spot"} onClick={() => switchMode("spot")}><ArrowLeftRight size={15} />Spot & Swap</button>
            <button type="button" role="tab" aria-selected={mode === "perp"} data-active={mode === "perp"} onClick={() => switchMode("perp")}><Zap size={14} />Perpetuals</button>
          </div>
          {user ? (
            <div className="ex-equity">
              <span>EQUITY</span><strong>{fmtUsd(equity)}</strong><span className="sep">|</span>
              <span>{fmtNum(user.hype, 2)} HYPE</span><span className="sep">·</span><span>{fmtUsd(user.usdc)}</span>
            </div>
          ) : (
            <Btn size="sm" onClick={() => setAuthModal("login")}>Sign in</Btn>
          )}
          <Btn size="sm" variant="outline" onClick={() => setHelp(true)}>Guide</Btn>
          <Btn size="sm" variant="ghost" href="/dashboard">Portfolio ↗</Btn>
        </div>
      </div>

      {/* Global Market Tape */}
      <div className="ex-tape ex-scroll">
        <div className="ex-tape-inner">
          <div className="ex-tape-label"><span className="live-dot h-1.5 w-1.5 rounded-full bg-up" />Market tape</div>
          {tape.map((t) => (
            <button
              key={t.id}
              type="button"
              className="ex-tape-item"
              data-active={t.id === activeRailId}
              onClick={() => t.id.startsWith("perp:") ? selectPerp(t.id.slice(5)) : selectSpotAsset(t.symbol)}
            >
              <span className="sym">{t.label}</span>
              <span className="px">{fmtPx(t.price)}</span>
              <span className={t.change >= 0 ? "text-up" : "text-down"}>{pct(t.change)}</span>
            </button>
          ))}
          <div className="ex-tape-end">
            <span>24h volume {fmtUsd(net.data?.stats.perpVolumeUsd ?? 0)}</span>
            <span>Block time ~{net.data?.network.blockMs ?? ELYSIUM.blockMs}ms</span>
          </div>
        </div>
      </div>

      {/* The Exchange Grid */}
      <div className="ex-shell">
        {/* Left Market Rail */}
        <aside className="surface ex-panel ex-rail" aria-label="Market list">
          <div className="ex-rail-head">
            <h2>Markets</h2>
            <Input className="ex-search" value={railSearch} onChange={setRailSearch} placeholder="Search symbol…" />
          </div>
          <div className="ex-rail-tabs">
            {([["all", "All"], ["coins", "Coins"], ["tokens", "Tokens"], ["perps", "Perps"]] as const).map(([id, label]) => (
              <button key={id} type="button" className="ex-rail-tab" data-active={railFilter === id} onClick={() => setRailFilter(id)}>{label}</button>
            ))}
          </div>
          <div className="ex-rail-body">
            {!railItems.length ? (
              <div className="p-3 space-y-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
            ) : visibleRail.map((item) => (
              <div key={item.id} className="ex-market-row" data-active={item.id === activeRailId}>
                <button
                  type="button"
                  className="ex-market-main"
                  onClick={() => item.kind === "perp" && item.marketId ? selectPerp(item.marketId) : selectSpotAsset(item.symbol)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <TokenGlyph glyph={item.glyph} accent={item.accent} size={26} />
                    <div className="min-w-0">
                      <div className="ex-market-sym">{item.kind === "perp" ? `${item.symbol}-PERP` : item.symbol}</div>
                      <div className="ex-market-venue">{item.venue}</div>
                    </div>
                  </div>
                  <div className="ex-market-num">
                    <div className="ex-market-px">{fmtPx(item.priceUsd)}</div>
                    <div className={cn("text-[10px] font-semibold", item.change >= 0 ? "text-up" : "text-down")}>{pct(item.change)}</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="ex-star"
                  data-on={starred.includes(item.id)}
                  aria-label={starred.includes(item.id) ? `Unstar ${item.symbol}` : `Star ${item.symbol}`}
                  onClick={() => setStarred((prev) => prev.includes(item.id) ? prev.filter((s) => s !== item.id) : [...prev, item.id])}
                >
                  {starred.includes(item.id) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
          <div className="ex-rail-foot">
            <div><span>Network</span><strong>Elysium {ELYSIUM.chainId}</strong></div>
            <div><span>Settlement</span><strong>HyperEVM</strong></div>
            <div><span>Venues</span><strong>{assets.length + perpMarkets.length}</strong></div>
          </div>
        </aside>

        {/* Center Chart Surface */}
        <section className="surface ex-panel ex-chart-panel" aria-label="Market chart">
          <div className="ex-instrument">
            <div className="ex-instrument-id">
              <TokenGlyph glyph={mode === "perp" ? (perp?.symbol.slice(0, 1) ?? "P") : (focusAsset?.glyph ?? "◆")} accent={mode === "perp" ? "#1d472f" : (focusAsset?.accent ?? "#6a9744")} size={40} />
              <div className="min-w-0">
                <div className="ex-pair">{mode === "perp" ? (perp?.symbol ?? "—") : toSym}<span>{mode === "perp" ? "-PERP" : ` / ${fromSym}`}</span></div>
                <div className="ex-instrument-meta">
                  <Badge tone={mode === "perp" ? "ice" : "up"}>{mode === "perp" ? "HIP-3 Perpetual" : (focusAsset?.venue ?? "Spot")}</Badge>
                  {mode === "spot" && focusAsset?.slug ? <Link href={`/token/${focusAsset.slug}`} className="text-[10px] font-semibold text-[#1a7248] hover:underline">Token page ↗</Link> : null}
                  {mode === "perp" && panel.data?.launch?.slug ? <Link href={`/token/${panel.data.launch.slug}`} className="text-[10px] font-semibold text-[#1a7248] hover:underline">Spot origin ↗</Link> : null}
                </div>
              </div>
            </div>
            <div className="ex-price-block">
              <div className="ex-price">{fmtPx(priceUsd)}</div>
              <div className="ex-price-sub"><Delta pct={change} className="font-semibold" /><span>24h</span><span>·</span><span>{mode === "perp" ? "Mark" : "Spot"}</span></div>
            </div>
            <div className="ex-stat-grid">
              {stats.map((s) => <div className="ex-stat" key={s.label}><div className="ex-stat-label">{s.label}</div><div className="ex-stat-value">{s.value}</div></div>)}
            </div>
            <select
              className="ex-mobile-select"
              aria-label="Select market"
              value={mode === "perp" ? `perp:${activeMarketId ?? ""}` : `spot:${focusSymbol}`}
              onChange={(e) => { const [kind, value] = e.target.value.split(":"); if (kind === "perp") selectPerp(value!); else selectSpotAsset(value!); }}
            >
              <optgroup label="Spot & Swap">
                {swappable.map((a) => <option key={`spot:${a.symbol}`} value={`spot:${a.symbol}`}>{a.symbol} · {a.venue}</option>)}
              </optgroup>
              <optgroup label="Perpetuals">
                {perpMarkets.map((m) => <option key={`perp:${m.id}`} value={`perp:${m.id}`}>{m.symbol}-PERP · {m.maxLeverage}x</option>)}
              </optgroup>
            </select>
          </div>

          <div className="ex-chart-toolbar">
            <div className="ex-view-tabs">
              {([["price", "Price chart"], ["depth", "Depth"], ["info", "Market info"]] as const).map(([id, label]) => (
                <button key={id} type="button" className="ex-view-tab" data-active={chartView === id} onClick={() => setChartView(id)}>{label}</button>
              ))}
            </div>
            <div className="ex-chart-meta">
              <span><span className="live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-up" />Live feed</span>
              <span>{trail.length} prints</span>
              <span>{mode === "perp" ? (perp?.venue ?? "forge-hip3") : (focusAsset?.venue ?? "Elysium")}</span>
            </div>
          </div>

          <div className="ex-chart-body">
            {chartView === "price" ? (
              <MarketChart data={trail} symbol={mode === "perp" ? `${perp?.symbol ?? "MARKET"}-PERP` : `${focusSymbol}/USD`} height={460} />
            ) : chartView === "depth" ? (
              <DepthView book={activeBook} />
            ) : (
              <div className="ex-info-grid">
                {(mode === "perp"
                  ? [
                      ["Venue", perp?.venue ?? "forge-hip3"], ["Contract type", "HIP-3 isolated perpetual"],
                      ["Max leverage", `${maxLev}x`], ["Maintenance margin", "0.50%"],
                      ["Maker fee", `${((perp?.makerFeeBps ?? 1) / 100).toFixed(3)}%`], ["Taker fee", `${((perp?.takerFeeBps ?? 4.5) / 100).toFixed(3)}%`],
                    ]
                  : [
                      ["Asset", focusAsset?.name ?? focusSymbol], ["Liquidity venue", focusAsset?.venue ?? "Elysium"],
                      ["Fixed supply", "1,000,000,000"], ["Circulating price", fmtPx(priceUsd)],
                      ["Pool / reserve", fmtUsd(focusAsset?.liquidityUsd ?? 0)], ["Venue fee", `${((focusAsset?.feeBps ?? 30) / 100).toFixed(2)}%`],
                    ]
                ).map(([k, v]) => <div className="ex-info-cell" key={k}><span>{k}</span><strong>{v}</strong></div>)}
              </div>
            )}
          </div>

          <div className="ex-chart-foot">
            <div><span>Execution route</span><strong>{mode === "perp" ? "HyperCore CLOB → isolated margin" : (quote?.route.join(" → ") ?? `${fromSym} → ${toSym}`)}</strong></div>
            <div><span>Venue / settlement</span><strong>{mode === "perp" ? `${perp?.venue ?? "forge-hip3"} · HyperCore` : (focusAsset?.venue ?? "Elysium")}</strong></div>
            <div><span>Last print</span><strong>{fmtPx(trail[trail.length - 1] ?? priceUsd)} · live</strong></div>
            <div><span>Risk / fee</span><strong>{mode === "perp" ? `0.50% MMR · ${((perp?.takerFeeBps ?? 4.5) / 100).toFixed(3)}% taker` : `${((focusAsset?.feeBps ?? 30) / 100).toFixed(2)}% venue fee`}</strong></div>
          </div>
        </section>

        {/* Order Book Surface */}
        <section className="surface ex-panel ex-book" aria-label="Order book">
          <div className="ex-book-head">
            <h2>{mode === "perp" ? "HyperCore book" : "Spot depth"}</h2>
            <span className="text-[10px] text-[#6e8165]">{(activeBook?.spreadBps ?? 0).toFixed(1)} bps</span>
          </div>
          <div className="ex-book-tabs">
            <button type="button" className="ex-book-tab" data-active={bookTab === "book"} onClick={() => setBookTab("book")}>Order book</button>
            <button type="button" className="ex-book-tab" data-active={bookTab === "trades"} onClick={() => setBookTab("trades")}>Recent trades</button>
          </div>
          {bookTab === "book" ? (
            !activeBook ? (
              <div className="p-4 space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
            ) : (
              <div className="pb-2">
                <div className="ex-book-columns"><span>Price (USD)</span><span>Size</span><span>Total</span></div>
                <div className="mt-1">
                  {[...activeBook.asks].reverse().slice(0, 7).map((a, i) => {
                    const max = Math.max(...activeBook.asks.map((x) => x.total), ...activeBook.bids.map((x) => x.total), 1);
                    return (
                      <button key={`a${i}`} type="button" className="ex-book-row" onClick={mode === "perp" ? () => onBookPrice(a.price) : undefined} title={mode === "perp" ? "Prefill limit price" : undefined}>
                        <span className="ex-book-fill ask" style={{ width: `${Math.min(100, (a.total / max) * 100)}%` }} />
                        <span className="font-semibold text-down">{fmtPx(a.price)}</span><span>{fmtCompact(a.size, 1)}</span><span>{fmtCompact(a.total, 1)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="ex-book-mid"><strong>{fmtPx(activeBook.mid || priceUsd)}</strong><span>{mode === "perp" ? "Mark / mid" : "Mid price"}</span></div>
                <div>
                  {activeBook.bids.slice(0, 7).map((b, i) => {
                    const max = Math.max(...activeBook.asks.map((x) => x.total), ...activeBook.bids.map((x) => x.total), 1);
                    return (
                      <button key={`b${i}`} type="button" className="ex-book-row" onClick={mode === "perp" ? () => onBookPrice(b.price) : undefined} title={mode === "perp" ? "Prefill limit price" : undefined}>
                        <span className="ex-book-fill bid" style={{ width: `${Math.min(100, (b.total / max) * 100)}%` }} />
                        <span className="font-semibold text-up">{fmtPx(b.price)}</span><span>{fmtCompact(b.size, 1)}</span><span>{fmtCompact(b.total, 1)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div>
              {mode === "perp"
                ? (fills.length ? fills.slice(0, 16) : panel.data?.tape ?? []).map((f) => (
                    <div key={f.id} className="ex-trade-row">
                      <span className={f.side === "long" || f.side === "buy" ? "font-semibold text-up" : "font-semibold text-down"}>
                        {f.side === "long" || f.side === "buy" ? "Buy" : "Sell"}
                      </span>
                      <span>{fmtCompact(f.size, 1)} @ {fmtPx(f.price)}</span>
                      <span className="text-[#7a8d70]">{timeAgo("createdAt" in f ? f.createdAt : f.at)}</span>
                    </div>
                  ))
                : recentSwaps.slice(0, 16).map((s) => (
                    <div key={s.id} className="ex-trade-row">
                      <span className={s.side === "buy" ? "font-semibold text-up" : "font-semibold text-down"}>{s.side === "buy" ? `→ ${s.symbol}` : `${s.symbol} →`}</span>
                      <span>{fmtCompact(s.tokenAmount, 1)} @ {fmtPx(s.priceUsd)}</span>
                      <span className="text-[#7a8d70]">{timeAgo(s.createdAt)}</span>
                    </div>
                  ))}
            </div>
          )}
          <div className="ex-book-foot">{mode === "perp" ? "Click a price level to prefill a limit order." : "Indicative depth from the active Elysium liquidity venue."}</div>
        </section>

        {/* Order Ticket Surface */}
        <section className="surface ex-panel ex-ticket" aria-label="Order ticket">
          <div className="ex-ticket-head">
            <h2>{mode === "spot" ? "Swap tokens & coins" : "Perpetual order"}</h2>
            <Badge tone={mode === "perp" ? "ice" : "up"}>{mode === "perp" ? "Isolated" : "Instant"}</Badge>
          </div>
          <div className="ex-ticket-tabs">
            {mode === "spot" ? (
              <div className="ex-ticket-tab" data-active="true">Instant spot swap</div>
            ) : (["market", "limit"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className="ex-ticket-tab"
                data-active={orderType === type}
                onClick={() => setOrderType(type)}
              >
                {type === "market" ? "Market order" : "Limit order"}
              </button>
            ))}
          </div>

          <div className="ex-ticket-body">
            {mode === "spot" ? (
              <>
                <div className="ex-side-switch">
                  <button type="button" data-side="buy" data-active="true" onClick={() => { setFromSym("HYPE"); setToSym(focusSymbol === "HYPE" ? "USDC" : focusSymbol); }}>Buy {focusSymbol}</button>
                  <button type="button" data-side="sell" onClick={() => { if (focusSymbol !== "HYPE" && focusSymbol !== "USDC" && focusSymbol !== "STOKE") { setFromSym(focusSymbol); setToSym("USDC"); } else { flipPair(); } }}>Sell {focusSymbol}</button>
                </div>

                <div className="ex-asset-box">
                  <div className="ex-asset-box-head">
                    <span>You pay</span>
                    <div className="flex items-center gap-1">
                      <span>Bal {fmtQty(fromAsset?.balance ?? 0)}</span>
                      {user && (fromAsset?.balance ?? 0) > 0 ? [25, 50, 100].map((p) => <button key={p} type="button" className="ml-1 rounded border border-[#dce6d4] bg-white px-1 py-0.5 text-[9px] font-semibold text-[#335b2f]" onClick={() => applyPct(p)}>{p === 100 ? "Max" : `${p}%`}</button>) : null}
                    </div>
                  </div>
                  <div className="ex-asset-row">
                    <input aria-label="You pay amount" className="ex-asset-amount" type="number" step="any" min="0" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} placeholder="0.00" />
                    <button type="button" className="ex-asset-select" onClick={() => { setPickerSearch(""); setPickerFilter("all"); setPickerSide("from"); }}><TokenGlyph glyph={fromAsset?.glyph ?? "◆"} accent={fromAsset?.accent ?? "#1d472f"} size={20} />{fromSym}<span>▾</span></button>
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-[#6e8165]"><span>≈ {fmtUsd(Number(amountIn || 0) * (fromAsset?.priceUsd ?? 0))}</span><span>{fromAsset?.venue ?? "—"}</span></div>
                </div>

                <div className="ex-flip-row"><button type="button" className="ex-flip" aria-label="Invert pair" onClick={flipPair}>⇅</button></div>

                <div className="ex-asset-box">
                  <div className="ex-asset-box-head"><span>You receive (estimated)</span><span>Bal {fmtQty(toAsset?.balance ?? 0)} · Slippage {(slippageBps / 100).toFixed(2)}%</span></div>
                  <div className="ex-asset-row">
                    <div className="min-w-0 flex-1 truncate font-mono text-[20px] font-bold text-[#1d472f]">{quoting ? <Skeleton className="h-7 w-24" /> : (quote ? fmtQty(quote.amountOut) : "0.00")}</div>
                    <button type="button" className="ex-asset-select" onClick={() => { setPickerSearch(""); setPickerFilter("all"); setPickerSide("to"); }}><TokenGlyph glyph={toAsset?.glyph ?? "◆"} accent={toAsset?.accent ?? "#1d472f"} size={20} />{toSym}<span>▾</span></button>
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-[#6e8165]"><span>≈ {fmtUsd(quote?.amountOutUsd ?? 0)}</span><span>{toAsset?.venue ?? "—"}</span></div>
                </div>

                <div className="ex-preset-row">
                  {[50, 100, 250].map((bps) => <button key={bps} type="button" className="ex-preset" data-active={slippageBps === bps} onClick={() => setSlippageBps(bps)}>Slip {(bps / 100).toFixed(2)}%</button>)}
                </div>

                {quoteErr ? <div className="mt-3 rounded-md border border-[#e7c4ca] bg-[#f9e7e9] px-3 py-2 text-[10px] font-medium text-down">{quoteErr}</div> : null}

                <div className="ex-summary">
                  <div className="ex-summary-row"><span>Exchange rate</span><button type="button" className="font-mono text-[10px] font-semibold text-[#1d472f]" onClick={() => setInvertRate((v) => !v)}>{quote ? (invertRate ? `1 ${toSym} = ${fmtQty(1 / Math.max(quote.rate, 1e-18))} ${fromSym}` : `1 ${fromSym} = ${fmtQty(quote.rate)} ${toSym}`) : "—"} ⇄</button></div>
                  <div className="ex-summary-row"><span>Smart route</span><strong className="max-w-[170px]">{quote?.route.join(" → ") ?? "—"}</strong></div>
                  <div className="ex-summary-row"><span>Minimum received</span><strong>{quote ? `${fmtQty(quote.minOut)} ${toSym}` : "—"}</strong></div>
                  <div className="ex-summary-row"><span>Impact · Network fee</span><strong>{quote ? `${quote.priceImpactPct < 0.01 ? "<0.01%" : `${quote.priceImpactPct.toFixed(2)}%`} · ${fmtUsd(quote.feeUsd)}` : "—"}</strong></div>
                  <div className="ex-summary-row"><span>Settlement venues</span><strong className="max-w-[170px]">{quote?.venues.join(" / ") ?? "—"}</strong></div>
                </div>

                <div className="ex-ticket-cta">
                  {user ? (
                    <Btn full size="lg" loading={busy} disabled={!quote || quoting || insufficientBalance} variant={insufficientBalance ? "danger" : "primary"} onClick={executeSwapOrder}>
                      {insufficientBalance ? `Insufficient ${fromSym}` : `Swap ${fromSym} → ${toSym}`}
                    </Btn>
                  ) : <Btn full size="lg" onClick={() => setAuthModal("login")}>Sign in to swap</Btn>}
                </div>
                <div className="ex-route-note"><span>Multi-hop settlement in PostgreSQL</span><button type="button" className="font-semibold text-[#1a7248] hover:underline" onClick={() => switchMode("perp")}>Trade perps →</button></div>
                <div className="ex-popular">{popularPairs.map(([a, b]) => <button key={`${a}-${b}`} type="button" onClick={() => { setFromSym(a!); setToSym(b!); }}>{a} → {b}</button>)}</div>
              </>
            ) : (
              <>
                <div className="ex-side-switch">
                  <button type="button" data-side="long" data-active={side === "long"} onClick={() => setSide("long")}>Buy / Long</button>
                  <button type="button" data-side="short" data-active={side === "short"} onClick={() => setSide("short")}>Sell / Short</button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]"><span className="font-medium text-[#53684d]">Leverage</span><span className="rounded bg-[#e8f0e2] px-2 py-0.5 font-mono text-xs font-bold text-[#1d472f]">{leverage}x</span></div>
                <input type="range" aria-label="Leverage" min={1} max={maxLev} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="mt-2 w-full" />
                <div className="ex-preset-row">{levPresets.map((lv) => <button key={lv} type="button" className="ex-preset" onClick={() => setLeverage(lv)}>{lv}x</button>)}</div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-[#53684d]">Order size</span>
                  <div className="inline-flex rounded-md border border-[#dce5d3] bg-[#eef3e8] p-0.5">
                    {(["usdc", "tokens"] as const).map((m) => <button key={m} type="button" className={cn("rounded px-2 py-1 text-[10px] font-semibold", sizeMode === m ? "bg-[#1d472f] text-white" : "text-[#5c7054]")} onClick={() => setSizeMode(m)}>{m === "usdc" ? "USDC" : perp?.symbol ?? "Units"}</button>)}
                  </div>
                </div>
                <Input className="mt-2" value={sizeAmount} onChange={setSizeAmount} type="number" step="any" suffix={sizeMode === "usdc" ? "USDC" : perp?.symbol} />
                <div className="ex-preset-row">
                  {[25, 50, 75, 100].map((p) => <button key={p} type="button" className="ex-preset" onClick={() => { const notional = (maxNotional * p) / 100; setSizeAmount(sizeMode === "tokens" && perp?.markPrice ? (notional / perp.markPrice).toFixed(2) : notional.toFixed(2)); }}>{p}%</button>)}
                </div>

                {orderType === "limit" ? (
                  <div className="mt-3"><div className="mb-1.5 flex justify-between text-[11px]"><span className="font-medium text-[#53684d]">Limit price</span><button type="button" className="text-[10px] font-semibold text-[#1a7248] hover:underline" onClick={() => setLimitPrice(String(perp?.markPrice ?? 0))}>Use mark</button></div><Input value={limitPrice} onChange={setLimitPrice} type="number" step="any" suffix="USD" placeholder={String(perp?.markPrice ?? 0)} /></div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Input value={tp} onChange={setTp} type="number" step="any" suffix="% TP" placeholder="Take profit" />
                  <Input value={sl} onChange={setSl} type="number" step="any" suffix="% SL" placeholder="Stop loss" />
                </div>

                <div className="ex-summary">
                  <div className="ex-summary-row"><span>Notional value</span><strong>{fmtUsd(est.notional)}</strong></div>
                  <div className="ex-summary-row"><span>Position size</span><strong>{fmtCompact(est.size, 2)} {perp?.symbol ?? ""}</strong></div>
                  <div className="ex-summary-row"><span>Required margin</span><strong>{fmtUsd(est.margin)}</strong></div>
                  <div className="ex-summary-row"><span>Est. liquidation</span><strong>{fmtPx(est.liq)}</strong></div>
                  <div className="ex-summary-row"><span>Est. taker fee</span><strong>{fmtUsd(est.fee)}</strong></div>
                </div>

                <div className="ex-ticket-cta">
                  {user ? (
                    <Btn full size="lg" loading={busy} disabled={!perp || (perp.status !== "live" && orderType === "market")} variant={side === "long" ? "primary" : "danger"} onClick={placePerp}>
                      {perp?.status !== "live" && orderType === "market" ? "Market paused" : `${orderType === "limit" ? "Place limit" : side === "long" ? "Long" : "Short"} ${perp?.symbol ?? ""}`}
                    </Btn>
                  ) : <Btn full size="lg" onClick={() => setAuthModal("login")}>Sign in to trade</Btn>}
                </div>
                <div className="ex-route-note"><span>Available margin {fmtUsd(user?.usdc ?? 0)}</span><button type="button" className="font-semibold text-[#1a7248] hover:underline" onClick={() => { setFromSym("HYPE"); setToSym("USDC"); switchMode("spot"); }}>Swap to USDC →</button></div>
              </>
            )}
          </div>
        </section>

        {/* Full-width Account Blotter */}
        <section className="surface ex-panel ex-blotter" aria-label="Account blotter">
          <div className="ex-blotter-head">
            <div className="ex-blotter-tabs">
              {([
                ["balances", `Balances (${heldAssets.length})`],
                ["positions", `Positions (${positions.length})`],
                ["orders", `Open orders (${orders.length})`],
                ["fills", `Perp fills (${fills.length})`],
                ["swaps", `Swap history (${recentSwaps.length})`],
                ["info", "Venue specs"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className="ex-blotter-tab" data-active={blotterTab === id} onClick={() => setBlotterTab(id)}>{label}</button>
              ))}
            </div>
            <div className="ex-blotter-note">Testnet simulation · All values recorded in PostgreSQL</div>
          </div>

          <div className="ex-blotter-body">
            {!user && (blotterTab === "balances" || blotterTab === "positions" || blotterTab === "orders") ? (
              <EmptyState title="Sign in to view your account blotter" body="Balances, open perpetual positions, resting limit orders, and your full execution history appear here." action={<Btn size="sm" onClick={() => setAuthModal("login")}>Sign in</Btn>} />
            ) : blotterTab === "balances" ? (
              !heldAssets.length ? <div className="ex-empty">No balances yet. Claim testnet funds from the faucet in the top navigation.</div> : (
                <div className="ex-scroll"><table className="ex-table"><thead><tr><th>Asset</th><th>Venue</th><th className="text-right">Balance</th><th className="text-right">Spot price</th><th className="text-right">USD value</th><th className="text-right">Action</th></tr></thead><tbody>
                  {heldAssets.map((a) => <tr key={a.symbol}>
                    <td><span className="inline-flex items-center gap-2"><TokenGlyph glyph={a.glyph} accent={a.accent} size={24} /><strong>{a.symbol}</strong><span className="text-[#75886b]">{a.name}</span></span></td>
                    <td>{a.venue}</td><td className="mono text-right">{fmtQty(a.balance)}</td><td className="mono text-right">{fmtPx(a.priceUsd)}</td><td className="mono text-right font-semibold">{fmtUsd(a.balance * a.priceUsd)}</td>
                    <td className="text-right"><Btn size="sm" variant="outline" onClick={() => selectSpotAsset(a.symbol)}>Trade</Btn></td>
                  </tr>)}
                </tbody></table></div>
              )
            ) : blotterTab === "positions" ? (
              !positions.length ? <div className="ex-empty">No open perpetual positions. Use the order ticket to open a long or short.</div> : (
                <div className="ex-scroll"><table className="ex-table"><thead><tr><th>Market</th><th>Side</th><th className="text-right">Size</th><th className="text-right">Entry</th><th className="text-right">Mark</th><th className="text-right">Liq.</th><th className="text-right">Margin</th><th className="text-right">Unrealized PnL</th><th className="text-right">Actions</th></tr></thead><tbody>
                  {positions.map((p) => <tr key={p.id}>
                    <td><strong>{p.marketSymbol}-PERP</strong></td><td className={p.side === "long" ? "text-up" : "text-down"}>{p.side.toUpperCase()} {p.leverage}x</td>
                    <td className="mono text-right">{fmtCompact(p.size, 2)}</td><td className="mono text-right">{fmtPx(p.entryPrice)}</td><td className="mono text-right">{fmtPx(p.markPrice)}</td><td className="mono text-right text-down">{fmtPx(p.liqPrice)}</td><td className="mono text-right">{fmtUsd(p.margin)}</td>
                    <td className={cn("mono text-right font-semibold", p.unrealized >= 0 ? "text-up" : "text-down")}>{fmtUsd(p.unrealized)} <span className="text-[#75886b]">({p.roe.toFixed(2)}%)</span></td>
                    <td className="text-right"><span className="inline-flex gap-1"><Btn size="sm" variant="outline" loading={busy} onClick={() => act(`Reduced ${p.marketSymbol} by 50%`, () => api("/api/perp", { json: { action: "close", positionId: p.id, fraction: 0.5 } }))}>50%</Btn><Btn size="sm" variant="danger" loading={busy} onClick={() => act(`Closed ${p.marketSymbol}`, () => api("/api/perp", { json: { action: "close", positionId: p.id, fraction: 1 } }))}>Close</Btn></span></td>
                  </tr>)}
                </tbody></table></div>
              )
            ) : blotterTab === "orders" ? (
              !orders.length ? <div className="ex-empty">No resting limit orders on the HyperCore book.</div> : (
                <div className="ex-scroll"><table className="ex-table"><thead><tr><th>Market</th><th>Side</th><th className="text-right">Size</th><th className="text-right">Limit price</th><th className="text-right">Leverage</th><th>Status</th><th className="text-right">Action</th></tr></thead><tbody>
                  {orders.map((o) => <tr key={o.id}><td><strong>{o.symbol}-PERP</strong></td><td className={o.side === "buy" ? "text-up" : "text-down"}>{o.side.toUpperCase()}</td><td className="mono text-right">{fmtCompact(o.size, 2)}</td><td className="mono text-right">{fmtPx(o.limitPrice ?? 0)}</td><td className="mono text-right">{o.leverage}x</td><td>{o.status}</td><td className="text-right"><Btn size="sm" variant="outline" loading={busy} onClick={() => act("Order cancelled", () => api("/api/perp", { json: { action: "cancel", orderId: o.id } }))}>Cancel</Btn></td></tr>)}
                </tbody></table></div>
              )
            ) : blotterTab === "fills" ? (
              !fills.length ? <div className="ex-empty">No perpetual executions recorded on this market yet.</div> : (
                <div className="ex-scroll"><table className="ex-table"><thead><tr><th>Action</th><th>Side</th><th className="text-right">Size</th><th className="text-right">Price</th><th className="text-right">Realized PnL</th><th>Trader</th><th className="text-right">Time</th></tr></thead><tbody>
                  {fills.slice(0, 18).map((f) => <tr key={f.id}><td className="capitalize">{f.action}</td><td className={f.side === "long" ? "text-up" : "text-down"}>{f.side}</td><td className="mono text-right">{fmtCompact(f.size, 2)}</td><td className="mono text-right">{fmtPx(f.price)}</td><td className={cn("mono text-right", f.pnlUsd > 0 ? "text-up" : f.pnlUsd < 0 ? "text-down" : "")}>{f.pnlUsd ? fmtUsd(f.pnlUsd) : "—"}</td><td>{f.traderName ?? "Pool"}</td><td className="text-right text-[#75886b]">{timeAgo(f.createdAt)}</td></tr>)}
                </tbody></table></div>
              )
            ) : blotterTab === "swaps" ? (
              !recentSwaps.length ? <div className="ex-empty">No spot swap executions recorded yet.</div> : (
                <div className="ex-scroll"><table className="ex-table"><thead><tr><th>Swap</th><th>Venue</th><th className="text-right">Token amount</th><th className="text-right">HYPE value</th><th className="text-right">USD value</th><th className="text-right">Time</th></tr></thead><tbody>
                  {recentSwaps.slice(0, 18).map((s) => <tr key={s.id}><td><span className={s.side === "buy" ? "font-semibold text-up" : "font-semibold text-down"}>{s.side === "buy" ? `HYPE → ${s.symbol}` : `${s.symbol} → HYPE`}</span></td><td>{s.venue}</td><td className="mono text-right">{fmtCompact(s.tokenAmount, 2)} {s.symbol}</td><td className="mono text-right">{fmtNum(s.hypeAmount, 3)}</td><td className="mono text-right">{fmtUsd(s.usdAmount)}</td><td className="text-right text-[#75886b]">{timeAgo(s.createdAt)}</td></tr>)}
                </tbody></table></div>
              )
            ) : (
              <div className="ex-info-grid" style={{ padding: 0 }}>
                <div className="ex-info-cell"><span>Execution layer</span><strong>Elysium {ELYSIUM.chainId} · HyperEVM</strong></div>
                <div className="ex-info-cell"><span>Block cadence</span><strong>~{net.data?.network.blockMs ?? ELYSIUM.blockMs}ms</strong></div>
                <div className="ex-info-cell"><span>Perp framework</span><strong>HIP-3 isolated margin</strong></div>
                <div className="ex-info-cell"><span>Spot venues</span><strong>Curve · UniV3 · HyperCore</strong></div>
                <div className="ex-info-cell"><span>Settlement asset</span><strong>Native HYPE + USDC</strong></div>
                <div className="ex-info-cell"><span>Data source</span><strong>PostgreSQL / Drizzle ORM</strong></div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Asset Picker */}
      <Modal
        open={Boolean(pickerSide)}
        onClose={() => setPickerSide(null)}
        title={pickerSide === "from" ? "Select asset to pay" : "Select asset to receive"}
        wide
      >
        <div className="space-y-3">
          <Input value={pickerSearch} onChange={setPickerSearch} placeholder="Search by symbol or asset name…" />
          <div className="flex flex-wrap gap-1.5">
            {([["all", "All assets"], ["coin", "Coins"], ["spot", "Pool / Spot"], ["curve", "Bonding curve"]] as const).map(([id, label]) => (
              <button key={id} type="button" className={cn("rounded-md px-2.5 py-1 text-[11px] font-semibold", pickerFilter === id ? "bg-[#1d472f] text-white" : "bg-[#eef3e8] text-[#5e7257]")} onClick={() => setPickerFilter(id)}>{label}</button>
            ))}
          </div>
          <div className="ex-picker-list">
            {pickerAssets.map((a) => (
              <button key={a.symbol} type="button" className="ex-picker-row" data-active={a.symbol === pickerActive} onClick={() => {
                if (pickerSide === "from") { if (a.symbol === toSym) setToSym(fromSym); setFromSym(a.symbol); }
                else { if (a.symbol === fromSym) setFromSym(toSym); setToSym(a.symbol); }
                setPickerSide(null);
              }}>
                <span className="flex min-w-0 items-center gap-2.5"><TokenGlyph glyph={a.glyph} accent={a.accent} size={30} /><span className="min-w-0"><strong className="block">{a.symbol}</strong><small className="truncate">{a.name} · {a.venue}</small></span></span>
                <span className="shrink-0 text-right"><strong className="block mono text-[11px]">{fmtQty(a.balance)}</strong><small className="mono">{fmtPx(a.priceUsd)}</small></span>
              </button>
            ))}
            {!pickerAssets.length ? <div className="p-8 text-center text-xs text-[#6c7e64]">No swappable assets match your search.</div> : null}
          </div>
        </div>
      </Modal>

      <Modal open={help} onClose={() => setHelp(false)} title="Trade & Markets guide" wide>
        <div className="space-y-3 text-sm leading-relaxed text-[#4f644a]">
          <p><strong className="text-[#183225]">Spot & Swap.</strong> Route coins and tokens across HYPE/USDC/STOKE reserves, Elysium bonding curves, graduated Uniswap V3 pools, and HyperCore spot books. Every leg updates balances, holders, pool reserves, and trade history in PostgreSQL.</p>
          <p><strong className="text-[#183225]">Perpetuals.</strong> HIP-3 markets use isolated USDC margin, hourly funding, configurable leverage, maker/taker fees, liquidation thresholds, limit orders, and TP/SL triggers.</p>
          <p><strong className="text-[#183225]">Cross-venue.</strong> Use the market rail or tape to switch instruments. Click a book price to prefill a perp limit order; use the ticket shortcuts to swap collateral into USDC or graduate into the leveraged market.</p>
          <p className="text-xs text-[#75886b]">This is a testnet simulation. No real funds or on-chain transactions are involved.</p>
        </div>
      </Modal>
    </div>
  );
}

function DepthView({ book }: { book?: BookSnapshot | null }) {
  if (!book) return <div className="ex-empty">Depth data is loading…</div>;
  const asks = [...book.asks].reverse().slice(0, 10);
  const bids = book.bids.slice(0, 10);
  const max = Math.max(...asks.map((a) => a.total), ...bids.map((b) => b.total), 1);
  return (
    <div className="ex-depth-view">
      <div>
        <h4>Bid depth</h4>
        {bids.map((b, i) => <div key={i} className="ex-depth-bar bid" style={{ backgroundSize: `${Math.min(100, (b.total / max) * 100)}% 100%` }}><span>{fmtPx(b.price)}</span><span>{fmtCompact(b.total, 1)}</span></div>)}
      </div>
      <div>
        <h4>Ask depth</h4>
        {asks.map((a, i) => <div key={i} className="ex-depth-bar ask" style={{ backgroundSize: `${Math.min(100, (a.total / max) * 100)}% 100%` }}><span>{fmtPx(a.price)}</span><span>{fmtCompact(a.total, 1)}</span></div>)}
      </div>
    </div>
  );
}
