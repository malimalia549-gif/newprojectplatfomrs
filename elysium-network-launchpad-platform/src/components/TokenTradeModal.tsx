"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CandlestickChart,
  CheckCircle2,
  ExternalLink,
  Gavel,
  Layers,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type {
  PlatformToken,
  SpotTradeRecord,
  TokenHoldingRecord,
  UserProfile,
} from "@/types/platform";

interface TokenTradeModalProps {
  token: PlatformToken | null;
  onClose: () => void;
  user: UserProfile | null;
  holding: TokenHoldingRecord | undefined;
  trades: SpotTradeRecord[];
  hypePriceUsd: number;
  hip1AuctionHype: number;
  onExecuteSpotTrade: (params: {
    tokenId: number;
    side: "BUY" | "SELL";
    amount: number;
    paymentMethod: string;
  }) => Promise<void>;
  onExecuteLifecycleAction: (params: {
    tokenId: number;
    action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP";
    paymentMethod: string;
  }) => Promise<void>;
  onJumpToPerps: (token: PlatformToken) => void;
}

export function TokenTradeModal({
  token,
  onClose,
  user,
  holding,
  trades,
  hypePriceUsd,
  hip1AuctionHype,
  onExecuteSpotTrade,
  onExecuteLifecycleAction,
  onJumpToPerps,
}: TokenTradeModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [paymentMethod, setPaymentMethod] = useState<"HYPE" | "USDC" | "X_MONEY">(
    "HYPE"
  );
  const [amountInput, setAmountInput] = useState<string>("25");
  const [submittingTrade, setSubmittingTrade] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState<string | null>(null);
  const [lifecyclePayRail, setLifecyclePayRail] = useState<"HYPE" | "X_MONEY">(
    "HYPE"
  );

  const tokenTrades = useMemo(() => {
    if (!token) return [];
    return trades.filter((t) => t.tokenId === token.id).slice(0, 12);
  }, [token, trades]);

  // Generate smooth SVG price curve points
  const chartPoints = useMemo(() => {
    if (!token) return "";
    const base = token.priceUsd;
    const seed = token.id * 17;
    const pts: string[] = [];
    for (let i = 0; i <= 28; i++) {
      const progress = i / 28;
      const wave =
        Math.sin(i * 0.55 + seed) * 0.045 +
        Math.cos(i * 0.25 + seed) * 0.03 +
        progress * (token.change24h >= 0 ? 0.14 : -0.08);
      const val = base * (0.88 + wave);
      const x = (i / 28) * 560;
      const normalizedY = 135 - Math.min(120, Math.max(15, ((val / base - 0.78) / 0.35) * 115));
      pts.push(`${x.toFixed(1)},${normalizedY.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [token]);

  if (!token) return null;

  const stageMeta = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
  const parsedAmount = Number(amountInput) || 0;

  const estimatedTokensOut =
    side === "BUY"
      ? paymentMethod === "HYPE"
        ? (parsedAmount * hypePriceUsd) / Math.max(0.00001, token.priceUsd)
        : parsedAmount / Math.max(0.00001, token.priceUsd)
      : parsedAmount;

  const estimatedUsdValue =
    side === "BUY"
      ? paymentMethod === "HYPE"
        ? parsedAmount * hypePriceUsd
        : parsedAmount
      : parsedAmount * token.priceUsd;

  const remainingHypeToGrad = Math.max(
    0,
    Number((token.graduationTargetHype - token.realHypeRaised).toFixed(2))
  );

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) return;
    setSubmittingTrade(true);
    try {
      await onExecuteSpotTrade({
        tokenId: token.id,
        side,
        amount: parsedAmount,
        paymentMethod,
      });
    } finally {
      setSubmittingTrade(false);
    }
  };

  const handleLifecycleClick = async (
    action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP"
  ) => {
    setLifecycleLoading(action);
    try {
      await onExecuteLifecycleAction({
        tokenId: token.id,
        action,
        paymentMethod: lifecyclePayRail,
      });
    } finally {
      setLifecycleLoading(null);
    }
  };

  const isGraduated = token.stage !== "BONDING";
  const isHyperCoreSpot =
    token.stage === "HYPERCORE_SPOT" || token.stage === "HIP3_PERP_LIVE";
  const isHip3Live = token.stage === "HIP3_PERP_LIVE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-emerald-500/25 bg-[#071018] text-slate-100 shadow-2xl my-auto max-h-[94vh] overflow-y-auto">
        {/* Top Modal Header */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#071018]/95 backdrop-blur px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-slate-950 text-sm shadow-lg"
              style={{ backgroundColor: token.logoColor }}
            >
              {token.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">{token.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                  ${token.ticker}
                </span>
                <span
                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${stageMeta.badgeClass}`}
                >
                  {stageMeta.shortLabel}
                </span>
                {token.isStockToken && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    xStock · {token.underlyingTicker} ({token.underlyingExchange})
                  </span>
                )}
                {token.launchPaymentMethod === "X_MONEY" && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                    𝕏 Money Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Elysium L2: {token.contractAddress.slice(0, 10)}...
                {token.contractAddress.slice(-6)} · Venue: {stageMeta.venue}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isHip3Live && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToPerps(token);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
              >
                <CandlestickChart className="w-4 h-4" />
                <span>Trade {token.maxLeverage}x HIP-3 Perp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Interactive Two-Branch Lifecycle Architecture Pipeline */}
          <div className="rounded-xl border border-slate-800 bg-[#040a0f] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>
                  LIVE TOKEN GRADUATION PIPELINE (Elysium → Uniswap Pool → HyperCore → HIP-3)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Settlement Rail:</span>
                <button
                  type="button"
                  onClick={() => setLifecyclePayRail("HYPE")}
                  className={`px-2 py-0.5 rounded font-mono ${
                    lifecyclePayRail === "HYPE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-900 text-slate-400"
                  }`}
                >
                  HYPE Gas
                </button>
                <button
                  type="button"
                  onClick={() => setLifecyclePayRail("X_MONEY")}
                  className={`px-2 py-0.5 rounded font-mono ${
                    lifecyclePayRail === "X_MONEY"
                      ? "bg-white/15 text-white border border-white/30"
                      : "bg-slate-900 text-slate-400"
                  }`}
                >
                  𝕏 Money (3% Back)
                </button>
              </div>
            </div>

            {/* Branch A: Create -> Trading -> Graduate -> Uniswap Pool -> SELESAI */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
              <div className="rounded-lg p-2.5 border border-emerald-500/35 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-emerald-300">STEP 1</div>
                  <div className="font-semibold text-white">Create on Elysium</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>

              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  token.stage === "BONDING"
                    ? "border-amber-500/50 bg-amber-500/15"
                    : "border-emerald-500/35 bg-emerald-500/10"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-amber-300">STEP 2</div>
                  <div className="font-semibold text-white">
                    Bonding ({token.bondingProgress.toFixed(0)}%)
                  </div>
                </div>
                {isGraduated ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                )}
              </div>

              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  isGraduated
                    ? "border-emerald-500/35 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-900/50 text-slate-400"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono">STEP 3</div>
                  <div className="font-semibold text-white">Graduate 100%</div>
                </div>
                {isGraduated && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>

              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  isGraduated
                    ? "border-fuchsia-500/40 bg-fuchsia-500/15"
                    : "border-slate-800 bg-slate-900/50 text-slate-400"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-fuchsia-300">BRANCH A</div>
                  <div className="font-semibold text-white">Uniswap V3 Pool</div>
                </div>
                {isGraduated && (
                  <CheckCircle2 className="w-4 h-4 text-fuchsia-300 shrink-0" />
                )}
              </div>

              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  isGraduated && token.targetPath === "UNISWAP_ONLY"
                    ? "border-emerald-400/50 bg-emerald-500/20"
                    : isGraduated
                    ? "border-slate-700 bg-slate-900/80"
                    : "border-slate-800 bg-slate-900/40 text-slate-500"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-emerald-300">AMM END</div>
                  <div className="font-bold text-white">SELESAI ✓</div>
                </div>
                {isGraduated && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
            </div>

            {/* Branch B Connector: Graduate -> Beli Ticker -> HyperCore Orderbook -> HIP-3 Perp */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/90 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  isHyperCoreSpot
                    ? "border-cyan-500/40 bg-cyan-500/10"
                    : isGraduated
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-slate-800 bg-slate-900/40 text-slate-500"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-amber-300">
                    BRANCH B · STEP 4
                  </div>
                  <div className="font-semibold text-white">
                    ↓ Beli Ticker (HIP-1 Auction · {hip1AuctionHype} HYPE)
                  </div>
                </div>
                {isHyperCoreSpot && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
              </div>

              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  isHyperCoreSpot
                    ? "border-cyan-500/40 bg-cyan-500/15"
                    : "border-slate-800 bg-slate-900/40 text-slate-500"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-cyan-300">STEP 5</div>
                  <div className="font-semibold text-white">
                    HyperCore ~70ms Orderbook{" "}
                    {token.hyperCoreSpotId ? `(${token.hyperCoreSpotId})` : ""}
                  </div>
                </div>
                {isHyperCoreSpot && (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
              </div>

              <div
                className={`rounded-lg p-2.5 border flex items-center justify-between ${
                  isHip3Live
                    ? "border-emerald-400/50 bg-emerald-500/20"
                    : "border-slate-800 bg-slate-900/40 text-slate-500"
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono text-emerald-300">STEP 6</div>
                  <div className="font-semibold text-white">
                    ↓ HIP-3 Perp ({token.hip3PerpSymbol || `${token.ticker}-PERP`} ·{" "}
                    {token.maxLeverage}x)
                  </div>
                </div>
                {isHip3Live && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
            </div>

            {/* Actionable Next-Stage Execution Button */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
              <p className="text-xs text-slate-400">{stageMeta.description}</p>

              {token.stage === "BONDING" && (
                <button
                  type="button"
                  disabled={lifecycleLoading !== null}
                  onClick={() => handleLifecycleClick("ACCELERATE_GRADUATE")}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {lifecycleLoading === "ACCELERATE_GRADUATE" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Rocket className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Instant Fill Remaining {remainingHypeToGrad} HYPE → Graduate to Uniswap V3
                  </span>
                </button>
              )}

              {token.stage === "GRADUATED_UNISWAP" && (
                <button
                  type="button"
                  disabled={lifecycleLoading !== null}
                  onClick={() => handleLifecycleClick("BUY_TICKER_HYPERCORE")}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {lifecycleLoading === "BUY_TICKER_HYPERCORE" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Gavel className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Beli Ticker ({hip1AuctionHype} HYPE) + Mirror Bridge → HyperCore Orderbook
                  </span>
                </button>
              )}

              {token.stage === "HYPERCORE_SPOT" && (
                <button
                  type="button"
                  disabled={lifecycleLoading !== null}
                  onClick={() => handleLifecycleClick("DEPLOY_HIP3_PERP")}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {lifecycleLoading === "DEPLOY_HIP3_PERP" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Activate HIP-3 Perp ({token.ticker}-PERP · 500K HYPE Builder Vault)
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Main Grid: Chart + Info Left, Trade Execution Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols */}
            <div className="lg:col-span-7 space-y-4">
              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">Spot / Mark Price</div>
                  <div className="text-base font-bold font-mono text-white">
                    ${token.priceUsd < 1 ? token.priceUsd.toFixed(4) : token.priceUsd.toFixed(2)}
                  </div>
                  <div
                    className={`text-[11px] font-mono ${
                      token.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {token.change24h >= 0 ? "+" : ""}
                    {token.change24h.toFixed(2)}% (24h)
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">Market Cap</div>
                  <div className="text-base font-bold font-mono text-white">
                    ${(token.marketCapUsd / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {token.priceHype.toFixed(5)} HYPE
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">24h Volume</div>
                  <div className="text-base font-bold font-mono text-cyan-300">
                    $
                    {token.volume24hUsd >= 1000000
                      ? `${(token.volume24hUsd / 1000000).toFixed(2)}M`
                      : token.volume24hUsd.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {token.holdersCount.toLocaleString()} Holders
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-[11px] text-slate-400">Curve Reserve</div>
                  <div className="text-base font-bold font-mono text-emerald-300">
                    {token.realHypeRaised.toFixed(0)}/{token.graduationTargetHype} HYPE
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                      style={{ width: `${Math.min(100, token.bondingProgress)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="rounded-xl border border-slate-800 bg-[#040a10] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">
                    {token.ticker}/USD · Elysium 128ms Feed
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">
                    ● Real-Time State
                  </span>
                </div>
                <svg
                  viewBox="0 0 560 150"
                  className="w-full h-40 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="tokenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,145 ${chartPoints} 560,145`}
                    fill="url(#tokenAreaGrad)"
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={chartPoints}
                  />
                </svg>
              </div>

              {/* Stock Token RWA Metadata or Bridge Contracts */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2.5 text-xs">
                <p className="text-slate-300 leading-relaxed">{token.description}</p>

                {token.isStockToken && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-[11px]">
                    <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                      <div className="text-slate-400">Underlying Equity</div>
                      <div className="text-cyan-300 font-bold">
                        {token.underlyingTicker} · {token.underlyingExchange}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-slate-400">Reserve / ISIN</div>
                      <div className="text-emerald-300 font-bold">
                        {token.backingRatio || 100}% Backed · {token.isinCode}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                      <div className="text-slate-400">24/7 Equity Oracle</div>
                      <div className="text-purple-300 font-bold truncate">
                        {token.oracleProvider}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono text-[11px] text-slate-400">
                  <div>
                    Uniswap V3 Pool:{" "}
                    <span className="text-fuchsia-300">
                      {token.uniswapPoolAddress
                        ? `${token.uniswapPoolAddress.slice(0, 14)}...`
                        : "Pending 100% Curve"}
                    </span>
                  </div>
                  <div>
                    HyperEVM Mirror:{" "}
                    <span className="text-cyan-300">
                      {token.hyperEvmMirrorAddress
                        ? `${token.hyperEvmMirrorAddress.slice(0, 14)}...`
                        : "Pending Mirror Bridge"}
                    </span>
                  </div>
                  <div>
                    Deposit Escrow:{" "}
                    <span className="text-emerald-300">
                      {token.depositWalletAddress
                        ? `${token.depositWalletAddress.slice(0, 14)}...`
                        : "Pending HIP-1 Link"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {token.websiteUrl && (
                      <a
                        href={token.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        Docs <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Instant Buy / Sell Execution */}
            <div className="lg:col-span-5 space-y-4">
              <form
                onSubmit={handleTradeSubmit}
                className="rounded-xl border border-emerald-500/25 bg-[#050d14] p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSide("BUY");
                      setAmountInput(paymentMethod === "HYPE" ? "25" : "1000");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      side === "BUY"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    BUY ${token.ticker}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSide("SELL");
                      setAmountInput(
                        holding && holding.balance > 0
                          ? String(Number((holding.balance * 0.5).toFixed(4)))
                          : "10"
                      );
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      side === "SELL"
                        ? "bg-rose-500 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    SELL ${token.ticker}
                  </button>
                </div>

                {/* Payment / Settlement Rail Selector */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                    {side === "BUY" ? "Pay With Rail" : "Settle Proceeds In"}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("HYPE");
                        if (side === "BUY") setAmountInput("25");
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-mono border transition ${
                        paymentMethod === "HYPE"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      HYPE Gas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("USDC");
                        if (side === "BUY") setAmountInput("1500");
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-mono border transition ${
                        paymentMethod === "USDC"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      USDC
                    </button>
                    {side === "BUY" && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod("X_MONEY");
                          setAmountInput("1500");
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-mono border transition ${
                          paymentMethod === "X_MONEY"
                            ? "bg-white/15 text-white border-white/40"
                            : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}
                      >
                        𝕏 Money
                      </button>
                    )}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>
                      Amount (
                      {side === "SELL"
                        ? token.ticker
                        : paymentMethod === "HYPE"
                        ? "HYPE"
                        : "USD"}
                      )
                    </span>
                    {user && (
                      <span className="font-mono text-slate-300">
                        Avail:{" "}
                        {side === "SELL"
                          ? `${(holding?.balance || 0).toFixed(4)} ${token.ticker}`
                          : paymentMethod === "HYPE"
                          ? `${user.hypeBalance.toFixed(2)} HYPE`
                          : paymentMethod === "USDC"
                          ? `$${user.usdcBalance.toLocaleString()}`
                          : `𝕏 $${user.xMoneyBalanceUsd.toLocaleString()}`}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-400"
                    placeholder="0.00"
                  />

                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {side === "BUY" ? (
                      paymentMethod === "HYPE" ? (
                        [10, 25, 50, 100].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAmountInput(String(v))}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300"
                          >
                            {v} HYPE
                          </button>
                        ))
                      ) : (
                        [250, 1000, 2500, 5000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAmountInput(String(v))}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300"
                          >
                            ${v}
                          </button>
                        ))
                      )
                    ) : (
                      [0.25, 0.5, 0.75, 1].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() =>
                            setAmountInput(
                              String(
                                Number(((holding?.balance || 0) * pct).toFixed(4))
                              )
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300"
                        >
                          {pct * 100}%
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Quote Preview */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Execution Venue</span>
                    <span className="text-emerald-300">{stageMeta.venue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {side === "BUY" ? "Est. Tokens Out" : "Est. Proceeds"}
                    </span>
                    <span className="text-white font-semibold">
                      {side === "BUY"
                        ? `${estimatedTokensOut.toLocaleString(undefined, {
                            maximumFractionDigits: 4,
                          })} ${token.ticker}`
                        : `$${estimatedUsdValue.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}`}
                    </span>
                  </div>
                  {paymentMethod === "X_MONEY" && side === "BUY" && (
                    <div className="flex justify-between text-emerald-300">
                      <span>𝕏 Visa Card 3% Cashback</span>
                      <span>+${(estimatedUsdValue * 0.03).toFixed(2)} USD</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingTrade || parsedAmount <= 0}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                    side === "BUY"
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 shadow-lg shadow-emerald-500/20"
                      : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                  }`}
                >
                  {submittingTrade ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>
                    {submittingTrade
                      ? "Settling on Elysium (128ms)..."
                      : `${side} ${token.ticker} via ${
                          paymentMethod === "X_MONEY" ? "𝕏 Money" : paymentMethod
                        }`}
                  </span>
                </button>

                {/* User Position Summary */}
                {holding && holding.balance > 0 && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-xs font-mono flex items-center justify-between">
                    <span className="text-slate-300">
                      Your Holding:{" "}
                      <strong className="text-white">
                        {holding.balance.toFixed(3)} {token.ticker}
                      </strong>
                    </span>
                    <span className="text-emerald-300">
                      ${(holding.balance * token.priceUsd).toFixed(2)}
                    </span>
                  </div>
                )}
              </form>

              {/* Recent Token Trades Tape */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Recent {token.ticker} Executions
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px] font-mono">
                  {tokenTrades.length === 0 ? (
                    <div className="text-slate-500 py-2">
                      No trades yet — be the first liquidity mover!
                    </div>
                  ) : (
                    tokenTrades.map((tr) => (
                      <div
                        key={tr.id}
                        className="flex items-center justify-between py-1 border-b border-slate-800/60"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              tr.side === "BUY"
                                ? "text-emerald-400 font-bold"
                                : "text-rose-400 font-bold"
                            }
                          >
                            {tr.side}
                          </span>
                          <span className="text-slate-300">{tr.traderLabel}</span>
                          {tr.paymentMethod === "X_MONEY" && (
                            <span className="px-1 rounded bg-white/10 text-white text-[10px]">
                              𝕏
                            </span>
                          )}
                        </div>
                        <div className="text-slate-200">
                          ${tr.amountUsd.toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
