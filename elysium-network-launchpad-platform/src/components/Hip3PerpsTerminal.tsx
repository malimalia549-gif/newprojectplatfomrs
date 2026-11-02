"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Check,
  Edit3,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import type {
  PerpPositionRecord,
  PlatformToken,
  UserProfile,
} from "@/types/platform";

interface Hip3PerpsTerminalProps {
  tokens: PlatformToken[];
  selectedMarketTokenId: number | null;
  onSelectMarketTokenId: (id: number) => void;
  user: UserProfile | null;
  positions: PerpPositionRecord[];
  hypePriceUsd: number;
  onOpenPerpOrder: (payload: {
    tokenId: number;
    side: "LONG" | "SHORT";
    marginMode: "CROSS" | "ISOLATED";
    orderType: "MARKET" | "LIMIT";
    collateralSource: "USDC" | "HYPE" | "X_MONEY";
    collateralUsd: number;
    leverage: number;
    clientMarkPrice: number;
    limitPrice?: number | null;
    takeProfitPrice?: number | null;
    stopLossPrice?: number | null;
  }) => Promise<void>;
  onClosePerpPosition: (params: {
    positionId: number;
    clientMarkPrice: number;
  }) => Promise<void>;
  onUpdateTpSl: (params: {
    positionId: number;
    takeProfitPrice: number | null;
    stopLossPrice: number | null;
  }) => Promise<void>;
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export function Hip3PerpsTerminal({
  tokens,
  selectedMarketTokenId,
  onSelectMarketTokenId,
  user,
  positions,
  hypePriceUsd,
  onOpenPerpOrder,
  onClosePerpPosition,
  onUpdateTpSl,
}: Hip3PerpsTerminalProps) {
  const perpMarkets = useMemo(
    () => tokens.filter((t) => t.stage === "HIP3_PERP_LIVE"),
    [tokens]
  );

  const activeMarket = useMemo(() => {
    if (!perpMarkets.length) return null;
    return (
      perpMarkets.find((m) => m.id === selectedMarketTokenId) || perpMarkets[0]
    );
  }, [perpMarkets, selectedMarketTokenId]);

  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1H" | "4H">(
    "5m"
  );
  const [liveJitterMap, setLiveJitterMap] = useState<Record<number, number>>({});

  // Order Ticket State
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [marginMode, setMarginMode] = useState<"CROSS" | "ISOLATED">("CROSS");
  const [collateralSource, setCollateralSource] = useState<
    "USDC" | "HYPE" | "X_MONEY"
  >("USDC");
  const [collateralInput, setCollateralInput] = useState("500");
  const [leverage, setLeverage] = useState(10);
  const [limitPriceInput, setLimitPriceInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [slInput, setSlInput] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Bottom Table Tabs & Actions
  const [bottomTab, setBottomTab] = useState<"OPEN" | "LIMITS" | "HISTORY">(
    "OPEN"
  );
  const [closingId, setClosingId] = useState<number | null>(null);
  const [editingPos, setEditingPos] = useState<PerpPositionRecord | null>(null);
  const [editTp, setEditTp] = useState("");
  const [editSl, setEditSl] = useState("");
  const [savingTpSl, setSavingTpSl] = useState(false);

  // Sub-second HyperCore ~70ms CLOB mark price ticker breath
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveJitterMap((prev) => {
        const next: Record<number, number> = { ...prev };
        for (const m of perpMarkets) {
          const cur = prev[m.id] ?? 0;
          const step = (Math.random() - 0.492) * 0.0022;
          next[m.id] = Math.max(-0.025, Math.min(0.025, cur + step));
        }
        return next;
      });
    }, 850);
    return () => clearInterval(interval);
  }, [perpMarkets]);

  // Clamp leverage when switching markets
  useEffect(() => {
    if (activeMarket && leverage > activeMarket.maxLeverage) {
      setLeverage(activeMarket.maxLeverage);
    }
  }, [activeMarket, leverage]);

  const getLiveMarkPrice = (m: PlatformToken) => {
    const jitter = liveJitterMap[m.id] ?? 0;
    return Number((m.priceUsd * (1 + jitter)).toFixed(m.priceUsd < 5 ? 4 : 2));
  };

  const liveMark = activeMarket ? getLiveMarkPrice(activeMarket) : 100;
  const oraclePrice = activeMarket
    ? Number((liveMark * 0.9996).toFixed(activeMarket.priceUsd < 5 ? 4 : 2))
    : 100;

  // Generate realistic OHLC candles for SVG chart
  const candles: Candle[] = useMemo(() => {
    if (!activeMarket) return [];
    const count = 38;
    const tfScale =
      timeframe === "1m"
        ? 0.004
        : timeframe === "5m"
        ? 0.008
        : timeframe === "15m"
        ? 0.013
        : timeframe === "1H"
        ? 0.02
        : 0.032;

    const list: Candle[] = [];
    let prevClose = activeMarket.priceUsd * 0.94;
    const seed = activeMarket.id * 31 + timeframe.charCodeAt(0);

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const drift =
        Math.sin(i * 0.48 + seed) * tfScale +
        Math.cos(i * 0.21 + seed) * (tfScale * 0.65) +
        (0.06 / count);
      const open = prevClose;
      const close = isLast ? liveMark : open * (1 + drift);
      const wickUp = Math.abs(Math.sin(i * 1.7 + seed)) * tfScale * 0.85;
      const wickDown = Math.abs(Math.cos(i * 1.3 + seed)) * tfScale * 0.85;
      const high = Math.max(open, close) * (1 + wickUp);
      const low = Math.min(open, close) * (1 - wickDown);
      const vol = 30 + Math.abs(Math.sin(i * 0.9 + seed)) * 70;
      list.push({ open, high, low, close, vol });
      prevClose = close;
    }
    return list;
  }, [activeMarket, timeframe, liveMark]);

  // L2 HyperCore Orderbook Levels
  const orderbook = useMemo(() => {
    const tick = liveMark < 5 ? 0.0025 : liveMark < 100 ? 0.05 : 0.15;
    const asks = Array.from({ length: 7 }, (_, idx) => {
      const level = 7 - idx;
      const price = Number(
        (liveMark + level * tick).toFixed(liveMark < 5 ? 4 : 2)
      );
      const size = Number(
        (18 + ((level * 37 + (activeMarket?.id || 1) * 13) % 95)).toFixed(1)
      );
      return { price, size, total: Number((price * size).toFixed(0)) };
    });

    const bids = Array.from({ length: 7 }, (_, idx) => {
      const level = idx + 1;
      const price = Number(
        Math.max(0.0001, liveMark - level * tick).toFixed(liveMark < 5 ? 4 : 2)
      );
      const size = Number(
        (22 + ((level * 41 + (activeMarket?.id || 1) * 19) % 105)).toFixed(1)
      );
      return { price, size, total: Number((price * size).toFixed(0)) };
    });

    return { asks, bids };
  }, [liveMark, activeMarket]);

  if (!activeMarket) {
    return (
      <div className="terminal-panel p-10 text-center text-slate-300">
        No HIP-3 Perpetual markets deployed yet. Graduate a token in the
        Lifecycle Pipeline to launch a HIP-3 Perp!
      </div>
    );
  }

  const collateralUsd = Math.max(0, Number(collateralInput) || 0);
  const effectiveEntry =
    orderType === "LIMIT" && Number(limitPriceInput) > 0
      ? Number(limitPriceInput)
      : liveMark;
  const notionalUsd = collateralUsd * leverage;
  const sizeUnits = effectiveEntry > 0 ? notionalUsd / effectiveEntry : 0;
  const maintBuffer = 0.9 / leverage;
  const estLiqPrice =
    side === "LONG"
      ? Math.max(0.0001, effectiveEntry * (1 - maintBuffer))
      : effectiveEntry * (1 + maintBuffer);
  const builderFeeUsd = notionalUsd * 0.00025;

  const openPositions = positions.filter((p) => p.status === "OPEN");
  const pendingLimitOrders = positions.filter(
    (p) => p.status === "LIMIT_PENDING"
  );
  const closedPositions = positions.filter((p) => p.status === "CLOSED");

  // Chart scaling
  const minLow = Math.min(...candles.map((c) => c.low)) * 0.998;
  const maxHigh = Math.max(...candles.map((c) => c.high)) * 1.002;
  const priceSpan = Math.max(0.0001, maxHigh - minLow);
  const priceToY = (p: number) =>
    225 - ((p - minLow) / priceSpan) * 195;

  const activeSymbolPos = openPositions.find(
    (p) => p.tokenId === activeMarket.id
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collateralUsd < 10) return;
    setSubmittingOrder(true);
    try {
      await onOpenPerpOrder({
        tokenId: activeMarket.id,
        side,
        marginMode,
        orderType,
        collateralSource,
        collateralUsd,
        leverage,
        clientMarkPrice: liveMark,
        limitPrice:
          orderType === "LIMIT" && Number(limitPriceInput) > 0
            ? Number(limitPriceInput)
            : null,
        takeProfitPrice: Number(tpInput) > 0 ? Number(tpInput) : null,
        stopLossPrice: Number(slInput) > 0 ? Number(slInput) : null,
      });
      setTpInput("");
      setSlInput("");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCloseClick = async (pos: PerpPositionRecord) => {
    const mkt = tokens.find((t) => t.id === pos.tokenId);
    const mark = mkt ? getLiveMarkPrice(mkt) : pos.entryPrice;
    setClosingId(pos.id);
    try {
      await onClosePerpPosition({
        positionId: pos.id,
        clientMarkPrice: mark,
      });
    } finally {
      setClosingId(null);
    }
  };

  const handleSaveTpSl = async () => {
    if (!editingPos) return;
    setSavingTpSl(true);
    try {
      await onUpdateTpSl({
        positionId: editingPos.id,
        takeProfitPrice: Number(editTp) > 0 ? Number(editTp) : null,
        stopLossPrice: Number(editSl) > 0 ? Number(editSl) : null,
      });
      setEditingPos(null);
    } finally {
      setSavingTpSl(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Market Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {perpMarkets.map((m) => {
          const selected = m.id === activeMarket.id;
          const mMark = getLiveMarkPrice(m);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMarketTokenId(m.id)}
              className={`px-3.5 py-2 rounded-xl border text-left transition shrink-0 flex items-center gap-2.5 ${
                selected
                  ? "border-emerald-400 bg-emerald-500/15 shadow-md shadow-emerald-500/10"
                  : "border-slate-800 bg-[#071018] hover:border-slate-700"
              }`}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-slate-950 text-[11px]"
                style={{ backgroundColor: m.logoColor }}
              >
                {m.ticker.slice(0, 3)}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {m.hip3PerpSymbol || `${m.ticker}-PERP`}
                  </span>
                  <span className="text-[10px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300">
                    {m.maxLeverage}x
                  </span>
                  {m.isStockToken && (
                    <span className="text-[10px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300">
                      xStock
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-200">${mMark}</span>
                  <span
                    className={
                      m.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {m.change24h >= 0 ? "+" : ""}
                    {m.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Market Institutional Header Bar */}
      <div className="terminal-panel flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white">
                {activeMarket.hip3PerpSymbol || `${activeMarket.ticker}-PERP`}
              </h1>
              {activeMarket.isStockToken && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {activeMarket.underlyingTicker} · {activeMarket.underlyingExchange}
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              HyperCore HIP-3 Orderbook · ElysiumCoreWriter Fast-Lane
            </div>
          </div>

          <div className="font-mono">
            <div className="text-[10px] text-slate-400">Mark Price</div>
            <div className="text-lg font-bold text-emerald-300">${liveMark}</div>
          </div>

          <div className="font-mono">
            <div className="text-[10px] text-slate-400">Oracle Index</div>
            <div className="text-sm font-semibold text-slate-200">
              ${oraclePrice}
            </div>
          </div>

          <div className="font-mono">
            <div className="text-[10px] text-slate-400">24h Change</div>
            <div
              className={`text-sm font-semibold ${
                activeMarket.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {activeMarket.change24h >= 0 ? "+" : ""}
              {activeMarket.change24h.toFixed(2)}%
            </div>
          </div>

          <div className="font-mono hidden sm:block">
            <div className="text-[10px] text-slate-400">24h Volume</div>
            <div className="text-sm font-semibold text-white">
              ${(activeMarket.volume24hUsd / 1000000).toFixed(2)}M
            </div>
          </div>

          <div className="font-mono hidden md:block">
            <div className="text-[10px] text-slate-400">Open Interest</div>
            <div className="text-sm font-semibold text-cyan-300">
              ${(activeMarket.openInterestUsd / 1000000).toFixed(2)}M
            </div>
          </div>

          <div className="font-mono hidden lg:block">
            <div className="text-[10px] text-slate-400">1h Funding</div>
            <div className="text-sm font-semibold text-emerald-300">
              +{(activeMarket.fundingRateHourly * 100).toFixed(4)}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {(activeMarket.hip3StakedHype / 1000).toFixed(0)}K HYPE HIP-3 Bond
            </span>
          </span>
        </div>
      </div>

      {/* Main 3-Column Trading Workspace: Chart (6) + L2 Orderbook (3) + Order Ticket (3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Candlestick Chart (6 cols) */}
        <div className="terminal-panel flex flex-col justify-between p-4 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-1">
              {(["1m", "5m", "15m", "1H", "4H"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                    timeframe === tf
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Oracle: {activeMarket.oracleProvider || "HyperCore CLOB"}</span>
            </div>
          </div>

          <div className="relative my-3">
            <svg
              viewBox="0 0 620 265"
              className="w-full h-[300px] sm:h-[340px]"
              preserveAspectRatio="none"
            >
              {/* Horizontal Grid Lines */}
              {[0.15, 0.38, 0.62, 0.85].map((ratio, idx) => {
                const y = 25 + ratio * 200;
                const priceLabel = (maxHigh - ratio * priceSpan).toFixed(
                  liveMark < 5 ? 3 : 2
                );
                return (
                  <g key={idx}>
                    <line
                      x1={0}
                      y1={y}
                      x2={565}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <text
                      x={572}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      ${priceLabel}
                    </text>
                  </g>
                );
              })}

              {/* OHLC Candles & Bottom Volume Bars */}
              {candles.map((c, idx) => {
                const stepW = 555 / candles.length;
                const cx = idx * stepW + stepW * 0.5;
                const isUp = c.close >= c.open;
                const color = isUp ? "#10b981" : "#f43f5e";
                const yHigh = priceToY(c.high);
                const yLow = priceToY(c.low);
                const yTop = priceToY(Math.max(c.open, c.close));
                const yBot = priceToY(Math.min(c.open, c.close));
                const bodyH = Math.max(2.5, yBot - yTop);
                const volH = (c.vol / 100) * 28;

                return (
                  <g key={idx}>
                    <rect
                      x={cx - stepW * 0.3}
                      y={262 - volH}
                      width={stepW * 0.6}
                      height={volH}
                      fill={color}
                      opacity={0.18}
                    />
                    <line
                      x1={cx}
                      y1={yHigh}
                      x2={cx}
                      y2={yLow}
                      stroke={color}
                      strokeWidth={1.3}
                    />
                    <rect
                      x={cx - stepW * 0.32}
                      y={yTop}
                      width={stepW * 0.64}
                      height={bodyH}
                      fill={color}
                      rx={1}
                    />
                  </g>
                );
              })}

              {/* Live Mark Dashed Line */}
              <line
                x1={0}
                y1={priceToY(liveMark)}
                x2={565}
                y2={priceToY(liveMark)}
                stroke="#22d3ee"
                strokeDasharray="4 3"
                strokeWidth={1.2}
              />

              {/* Active Position Entry Line Overlay */}
              {activeSymbolPos &&
                activeSymbolPos.entryPrice >= minLow &&
                activeSymbolPos.entryPrice <= maxHigh && (
                  <g>
                    <line
                      x1={0}
                      y1={priceToY(activeSymbolPos.entryPrice)}
                      x2={565}
                      y2={priceToY(activeSymbolPos.entryPrice)}
                      stroke="#fbbf24"
                      strokeWidth={1.2}
                    />
                    <text
                      x={8}
                      y={priceToY(activeSymbolPos.entryPrice) - 4}
                      fill="#fbbf24"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {activeSymbolPos.side} ENTRY ${activeSymbolPos.entryPrice}
                    </text>
                  </g>
                )}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
            <span>HyperCore Matching Latency: ~70ms</span>
            <span className="text-cyan-300">
              Click any orderbook price to auto-fill Limit Order
            </span>
          </div>
        </div>

        {/* Column 2: HyperCore L2 Orderbook (3 cols) */}
        <div className="terminal-panel flex flex-col justify-between p-3.5 lg:col-span-3">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white">
                HyperCore Orderbook
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                ● CLOB LIVE
              </span>
            </div>

            <div className="grid grid-cols-3 text-[10px] font-mono text-slate-500 pb-1.5">
              <span>Price (USD)</span>
              <span className="text-right">Size ({activeMarket.ticker})</span>
              <span className="text-right">Total ($)</span>
            </div>

            {/* Asks */}
            <div className="space-y-1">
              {orderbook.asks.map((ask, idx) => {
                const depthPct = Math.min(100, (ask.size / 120) * 100);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOrderType("LIMIT");
                      setLimitPriceInput(String(ask.price));
                    }}
                    className="relative w-full grid grid-cols-3 text-[11px] font-mono py-1 px-1.5 rounded hover:bg-slate-800/60 overflow-hidden"
                  >
                    <span
                      className="absolute inset-y-0 right-0 bg-rose-500/12 pointer-events-none"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-rose-400 text-left relative z-10">
                      {ask.price}
                    </span>
                    <span className="text-slate-300 text-right relative z-10">
                      {ask.size}
                    </span>
                    <span className="text-slate-400 text-right relative z-10">
                      {ask.total.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Spread Center Bar */}
            <div className="my-2 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between font-mono">
              <span className="text-sm font-bold text-white">${liveMark}</span>
              <span className="text-[10px] text-slate-400">
                Oracle ${oraclePrice}
              </span>
            </div>

            {/* Bids */}
            <div className="space-y-1">
              {orderbook.bids.map((bid, idx) => {
                const depthPct = Math.min(100, (bid.size / 120) * 100);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOrderType("LIMIT");
                      setLimitPriceInput(String(bid.price));
                    }}
                    className="relative w-full grid grid-cols-3 text-[11px] font-mono py-1 px-1.5 rounded hover:bg-slate-800/60 overflow-hidden"
                  >
                    <span
                      className="absolute inset-y-0 right-0 bg-emerald-500/12 pointer-events-none"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-emerald-400 text-left relative z-10">
                      {bid.price}
                    </span>
                    <span className="text-slate-300 text-right relative z-10">
                      {bid.size}
                    </span>
                    <span className="text-slate-400 text-right relative z-10">
                      {bid.total.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex justify-between">
            <span>Builder Fee: 0.025%</span>
            <span className="text-emerald-300">MEV-Neutral</span>
          </div>
        </div>

        {/* Column 3: HIP-3 Perpetual Order Execution Ticket (3 cols) */}
        <form
          onSubmit={handleSubmitOrder}
          className="terminal-panel space-y-3.5 rounded-2xl p-4 lg:col-span-3"
        >
          {/* Margin Mode & Order Type */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setMarginMode("CROSS")}
                className={`px-2.5 py-1 rounded-md ${
                  marginMode === "CROSS"
                    ? "bg-slate-700 text-white font-semibold"
                    : "text-slate-400"
                }`}
              >
                Cross
              </button>
              <button
                type="button"
                onClick={() => setMarginMode("ISOLATED")}
                className={`px-2.5 py-1 rounded-md ${
                  marginMode === "ISOLATED"
                    ? "bg-slate-700 text-white font-semibold"
                    : "text-slate-400"
                }`}
              >
                Isolated
              </button>
            </div>

            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setOrderType("MARKET")}
                className={`px-2.5 py-1 rounded-md ${
                  orderType === "MARKET"
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-slate-400"
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("LIMIT");
                  if (!limitPriceInput) setLimitPriceInput(String(liveMark));
                }}
                className={`px-2.5 py-1 rounded-md ${
                  orderType === "LIMIT"
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400"
                }`}
              >
                Limit
              </button>
            </div>
          </div>

          {/* Long / Short Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setSide("LONG")}
              className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                side === "LONG"
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>LONG / BUY</span>
            </button>
            <button
              type="button"
              onClick={() => setSide("SHORT")}
              className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition ${
                side === "SHORT"
                  ? "bg-rose-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SHORT / SELL</span>
            </button>
          </div>

          {/* Collateral Funding Source */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Margin Collateral Rail</span>
              {user && (
                <span className="font-mono text-slate-300">
                  {collateralSource === "USDC"
                    ? `$${user.usdcBalance.toLocaleString()}`
                    : collateralSource === "HYPE"
                    ? `${user.hypeBalance.toFixed(1)} HYPE`
                    : `𝕏 $${user.xMoneyBalanceUsd.toLocaleString()}`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "USDC", label: "USDC" },
                  { id: "HYPE", label: "HYPE" },
                  { id: "X_MONEY", label: "𝕏 Money" },
                ] as const
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setCollateralSource(src.id)}
                  className={`py-1.5 rounded-lg text-[11px] font-mono border transition ${
                    collateralSource === src.id
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          {/* Limit Price if LIMIT */}
          {orderType === "LIMIT" && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Limit Trigger Price (USD)
              </label>
              <input
                type="number"
                step="any"
                required
                value={limitPriceInput}
                onChange={(e) => setLimitPriceInput(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-cyan-500/40 px-3 py-2 text-xs font-mono text-white"
              />
            </div>
          )}

          {/* Margin Collateral USD Input */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Collateral Amount (USD Equivalent)
            </label>
            <input
              type="number"
              min={10}
              step="any"
              value={collateralInput}
              onChange={(e) => setCollateralInput(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
            />
            <div className="flex gap-1.5 mt-1.5">
              {[100, 500, 1500, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCollateralInput(String(preset))}
                  className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Leverage</span>
              <span className="text-emerald-300 font-bold">
                {leverage}x (Max {activeMarket.maxLeverage}x)
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={activeMarket.maxLeverage}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Optional TP / SL */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                Take Profit ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                value={tpInput}
                onChange={(e) => setTpInput(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-mono text-emerald-300"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                Stop Loss ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Optional"
                value={slInput}
                onChange={(e) => setSlInput(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-mono text-rose-300"
              />
            </div>
          </div>

          {/* Order Telemetry Summary */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Position Size</span>
              <span className="text-white font-bold">
                ${notionalUsd.toLocaleString()} ({sizeUnits.toFixed(2)}{" "}
                {activeMarket.ticker})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Entry Price</span>
              <span className="text-slate-200">${effectiveEntry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Est. Liquidation</span>
              <span className="text-amber-300">
                ${estLiqPrice.toFixed(liveMark < 5 ? 4 : 2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">HIP-3 Builder Fee</span>
              <span className="text-slate-300">${builderFeeUsd.toFixed(2)}</span>
            </div>
            {collateralSource === "HYPE" && (
              <div className="flex justify-between text-emerald-300">
                <span>HYPE Needed</span>
                <span>{(collateralUsd / hypePriceUsd).toFixed(2)} HYPE</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submittingOrder || collateralUsd < 10}
            className={`w-full py-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 ${
              side === "LONG"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
            }`}
          >
            {submittingOrder ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span>
              {submittingOrder
                ? "Routing via ElysiumCoreWriter..."
                : `${side} ${activeMarket.ticker}-PERP (${leverage}x)`}
            </span>
          </button>
        </form>
      </div>

      {/* Bottom Positions, Pending Limits, & Realized History Panel */}
      <div className="terminal-panel animate-fade-up rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {(
              [
                {
                  id: "OPEN",
                  label: `Open Positions (${openPositions.length})`,
                },
                {
                  id: "LIMITS",
                  label: `Limit Orders (${pendingLimitOrders.length})`,
                },
                {
                  id: "HISTORY",
                  label: `Closed PnL (${closedPositions.length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBottomTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  bottomTab === tab.id
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!user && (
            <span className="text-xs text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>
                Click &quot;1-Click Demo Whale&quot; in top bar to view &amp; trade live
                positions immediately!
              </span>
            </span>
          )}
        </div>

        {bottomTab === "OPEN" && (
          <div className="overflow-x-auto">
            {openPositions.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                No active HIP-3 perpetual positions open. Submit a Long or Short
                order above to start trading immediately!
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Market</th>
                    <th className="py-2 pr-3">Side / Lev</th>
                    <th className="py-2 pr-3">Notional Size</th>
                    <th className="py-2 pr-3">Collateral</th>
                    <th className="py-2 pr-3">Entry Price</th>
                    <th className="py-2 pr-3">Mark Price</th>
                    <th className="py-2 pr-3">Liq. Price</th>
                    <th className="py-2 pr-3">TP / SL</th>
                    <th className="py-2 pr-3">Unrealized PnL (ROE)</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {openPositions.map((pos) => {
                    const mkt = tokens.find((t) => t.id === pos.tokenId);
                    const curMark = mkt ? getLiveMarkPrice(mkt) : pos.entryPrice;
                    const diff =
                      pos.side === "LONG"
                        ? curMark - pos.entryPrice
                        : pos.entryPrice - curMark;
                    const uPnl = diff * pos.sizeUnits;
                    const roePct =
                      pos.collateralUsd > 0
                        ? (uPnl / pos.collateralUsd) * 100
                        : 0;

                    return (
                      <tr key={pos.id} className="text-slate-200">
                        <td className="py-3 pr-3 font-bold text-white">
                          {pos.symbol}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              pos.side === "LONG"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {pos.side} {pos.leverage}x
                          </span>{" "}
                          <span className="text-[10px] text-slate-500">
                            {pos.marginMode}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          ${pos.sizeUsd.toLocaleString()} ({pos.sizeUnits})
                        </td>
                        <td className="py-3 pr-3">
                          ${pos.collateralUsd.toLocaleString()}
                        </td>
                        <td className="py-3 pr-3">${pos.entryPrice}</td>
                        <td className="py-3 pr-3 text-cyan-300">${curMark}</td>
                        <td className="py-3 pr-3 text-amber-300">
                          ${pos.liquidationPrice}
                        </td>
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPos(pos);
                              setEditTp(
                                pos.takeProfitPrice
                                  ? String(pos.takeProfitPrice)
                                  : ""
                              );
                              setEditSl(
                                pos.stopLossPrice
                                  ? String(pos.stopLossPrice)
                                  : ""
                              );
                            }}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <span>
                              {pos.takeProfitPrice || "--"} /{" "}
                              {pos.stopLossPrice || "--"}
                            </span>
                            <Edit3 className="w-3 h-3 text-cyan-400" />
                          </button>
                        </td>
                        <td
                          className={`py-3 pr-3 font-bold ${
                            uPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {uPnl >= 0 ? "+" : ""}${uPnl.toFixed(2)} (
                          {roePct >= 0 ? "+" : ""}
                          {roePct.toFixed(2)}%)
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            disabled={closingId === pos.id}
                            onClick={() => handleCloseClick(pos)}
                            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 font-semibold transition disabled:opacity-50"
                          >
                            {closingId === pos.id ? "Closing..." : "Market Close"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {bottomTab === "LIMITS" && (
          <div className="overflow-x-auto">
            {pendingLimitOrders.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                No pending limit orders on HyperCore CLOB.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Side</th>
                    <th className="py-2 pr-3">Limit Price</th>
                    <th className="py-2 pr-3">Notional</th>
                    <th className="py-2 text-right">Cancel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pendingLimitOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-2.5 pr-3 font-bold text-white">
                        {ord.symbol}
                      </td>
                      <td className="py-2.5 pr-3 text-cyan-300">
                        {ord.side} {ord.leverage}x
                      </td>
                      <td className="py-2.5 pr-3">${ord.limitPrice}</td>
                      <td className="py-2.5 pr-3">
                        ${ord.sizeUsd.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleCloseClick(ord)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200"
                        >
                          Cancel Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {bottomTab === "HISTORY" && (
          <div className="overflow-x-auto">
            {closedPositions.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                No closed perpetual trades yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Symbol</th>
                    <th className="py-2 pr-3">Side</th>
                    <th className="py-2 pr-3">Entry → Exit</th>
                    <th className="py-2 pr-3">Size</th>
                    <th className="py-2 text-right">Realized PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {closedPositions.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3 font-bold text-white">
                        {c.symbol}
                      </td>
                      <td className="py-2.5 pr-3">
                        {c.side} {c.leverage}x
                      </td>
                      <td className="py-2.5 pr-3">
                        ${c.entryPrice} → ${c.closePrice || c.entryPrice}
                      </td>
                      <td className="py-2.5 pr-3">
                        ${c.sizeUsd.toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          c.realizedPnlUsd >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {c.realizedPnlUsd >= 0 ? "+" : ""}$
                        {c.realizedPnlUsd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Inline TP/SL Editor Modal */}
      {editingPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#08131d] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Edit TP / SL · {editingPos.symbol} ({editingPos.side})
              </h3>
              <button
                type="button"
                onClick={() => setEditingPos(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">
                  Take Profit Price (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  placeholder="None"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Stop Loss Price (USD)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  placeholder="None"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-rose-300"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={savingTpSl}
              onClick={handleSaveTpSl}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              {savingTpSl ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Save HyperCore Trigger</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
