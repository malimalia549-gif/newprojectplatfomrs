"use client";

import React, { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Circle,
  GitBranch,
  Loader2,
  Rocket,
  Gavel,
  CandlestickChart,
  Zap,
} from "lucide-react";
import type { PlatformToken, TickerAuctionRecord } from "@/types/platform";

interface GraduationPipelineViewProps {
  tokens: PlatformToken[];
  tickerAuctions: TickerAuctionRecord[];
  hip1AuctionHype: number;
  hypePriceUsd: number;
  onSelectToken: (token: PlatformToken) => void;
  onExecuteLifecycleAction: (params: {
    tokenId: number;
    action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP";
    paymentMethod: string;
  }) => Promise<void>;
  onJumpToPerps: (token: PlatformToken) => void;
}

const formatUsd = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${(value / 1_000).toFixed(0)}K`;

export function GraduationPipelineView({
  tokens,
  tickerAuctions,
  hip1AuctionHype,
  hypePriceUsd,
  onSelectToken,
  onExecuteLifecycleAction,
  onJumpToPerps,
}: GraduationPipelineViewProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payRail, setPayRail] = useState<"HYPE" | "X_MONEY">("HYPE");

  const bonding = tokens.filter((token) => token.stage === "BONDING");
  const graduated = tokens.filter((token) => token.stage === "GRADUATED_UNISWAP");
  const spot = tokens.filter((token) => token.stage === "HYPERCORE_SPOT" || token.stage === "TICKER_ACQUIRED");
  const perps = tokens.filter((token) => token.stage === "HIP3_PERP_LIVE");

  const execute = async (tokenId: number, action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP") => {
    const key = `${tokenId}:${action}`;
    setBusyId(key);
    try {
      await onExecuteLifecycleAction({ tokenId, action, paymentMethod: payRail });
    } finally {
      setBusyId(null);
    }
  };

  const laneHeading = (step: string, title: string, count: number, tone: string) => (
    <div className="flex items-center justify-between border-b border-[#edf0ec] pb-3">
      <div className="flex items-center gap-2.5"><span className={`flex h-6 w-6 items-center justify-center rounded text-[9px] font-semibold ${tone}`}>{step}</span><h2 className="text-xs font-semibold text-[#2c3a31]">{title}</h2></div>
      <span className="rounded bg-[#f2f4f1] px-1.5 py-0.5 font-mono text-[9px] text-[#78847c]">{String(count).padStart(2, "0")}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#718078]"><GitBranch className="h-3.5 w-3.5 text-[#527760]" />Asset lifecycle</div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-[#1e2d24] sm:text-[2rem]">From first trade to deeper markets</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#758179]">An asset can finish at the Elysium Uniswap V3 pool, or continue through the HIP-1 ticker auction, HyperCore spot and HIP-3 perpetual deployment.</p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-[#e3e8e2] bg-[#fafbf9] p-1 text-[10px]">
            <span className="px-2 text-[#818c84]">Settlement</span>
            <button type="button" onClick={() => setPayRail("HYPE")} className={`rounded px-2.5 py-1.5 font-medium ${payRail === "HYPE" ? "bg-[#e8f0e9] text-[#245a3d]" : "text-[#718078] hover:bg-white"}`}>HYPE</button>
            <button type="button" onClick={() => setPayRail("X_MONEY")} className={`rounded px-2.5 py-1.5 font-medium ${payRail === "X_MONEY" ? "bg-[#e8f0e9] text-[#245a3d]" : "text-[#718078] hover:bg-white"}`}>𝕏 Money</button>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#e8ece7] bg-[#fbfcfa] p-4 sm:p-5">
          <div className="hidden items-start md:grid md:grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr]">
            {[
              { no: "01", title: "Create", body: "Deploy token on Elysium", tone: "bg-[#e8f0e9] text-[#416d4c]" },
              { no: "02", title: "Trade", body: "Bonding curve & discovery", tone: "bg-[#f8f1e3] text-[#907347]" },
              { no: "03", title: "Graduate", body: "Uniswap V3 pool · SELESAI", tone: "bg-[#f1ecf6] text-[#7b6390]" },
              { no: "04", title: "Expand", body: "HIP-1 → Core spot → HIP-3", tone: "bg-[#e9f0f4] text-[#4d7186]" },
            ].map((step, index) => (
              <React.Fragment key={step.no}>
                <div className="min-w-0"><div className={`inline-flex h-7 w-7 items-center justify-center rounded text-[9px] font-semibold ${step.tone}`}>{step.no}</div><h3 className="mt-2 text-xs font-semibold text-[#27362d]">{step.title}</h3><p className="mt-1 text-[10px] leading-4 text-[#7d8981]">{step.body}</p></div>
                {index < 3 && <ArrowRight className="mt-3 h-4 w-4 text-[#b1bab3]" />}
              </React.Fragment>
            ))}
          </div>
          <div className="grid gap-2 md:hidden">
            {["Create on Elysium", "Trade on the bonding curve", "Graduate to Uniswap V3 · SELESAI", "Optional: HIP-1 → HyperCore → HIP-3"].map((step, index) => <div key={step} className="flex items-center gap-2.5 text-xs text-[#46564b]"><span className="flex h-6 w-6 items-center justify-center rounded bg-[#e8f0e9] font-mono text-[9px] text-[#416d4c]">0{index + 1}</span>{step}{index < 3 && <ArrowDown className="ml-auto h-3.5 w-3.5 text-[#aab4ac]" />}</div>)}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-[#7c8980]">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#528363]" /> Elysium-native contract</span>
          <span className="inline-flex items-center gap-1.5"><Circle className="h-3.5 w-3.5 text-[#a7946b]" /> HIP-1 ticker auction: {hip1AuctionHype} HYPE (~{formatUsd(hip1AuctionHype * hypePriceUsd)})</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#648294]" /> HyperCore spot cadence ~70ms</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* Bonding curve lane */}
        <div className="panel p-4">
          {laneHeading("01", "Bonding curve", bonding.length, "bg-[#f8f1e3] text-[#8a7048]")}
          <div className="mt-3 space-y-2.5">
            {bonding.map((token) => {
              const key = `${token.id}:ACCELERATE_GRADUATE`;
              const remaining = Math.max(0, token.graduationTargetHype - token.realHypeRaised);
              return <div key={token.id} className="rounded-md border border-[#edf0ec] p-3">
                <button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2 text-left"><span className="flex h-7 w-7 items-center justify-center rounded text-[8px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-[#2d3b32]">{token.ticker}</span><span className="block truncate text-[9px] text-[#88938c]">{token.name}</span></span><span className="font-mono text-[10px] text-[#526158]">{token.bondingProgress.toFixed(0)}%</span></button>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#edf0ec]"><div className="h-full rounded-full bg-[#a68a57]" style={{ width: `${Math.min(100, token.bondingProgress)}%` }} /></div>
                <div className="mt-1.5 flex justify-between text-[9px] text-[#87928a]"><span>{token.realHypeRaised.toFixed(0)} HYPE raised</span><span>Target {token.graduationTargetHype}</span></div>
                <button type="button" disabled={busyId !== null} onClick={() => execute(token.id, "ACCELERATE_GRADUATE")} className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-[#e8dfca] bg-[#fbf7ee] text-[10px] font-semibold text-[#7c6238] transition hover:bg-[#f6edda] disabled:opacity-50">{busyId === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />} Fill {remaining.toFixed(0)} HYPE & graduate</button>
              </div>;
            })}
            {bonding.length === 0 && <p className="py-5 text-center text-[10px] text-[#939d96]">No assets at this stage.</p>}
          </div>
        </div>

        {/* Uniswap lane */}
        <div className="panel p-4">
          {laneHeading("02", "Uniswap V3 pool", graduated.length, "bg-[#f1ecf6] text-[#7b6390]")}
          <div className="mt-3 space-y-2.5">
            {graduated.map((token) => {
              const key = `${token.id}:BUY_TICKER_HYPERCORE`;
              return <div key={token.id} className="rounded-md border border-[#edf0ec] p-3">
                <button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2 text-left"><span className="flex h-7 w-7 items-center justify-center rounded text-[8px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3)}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#2d3b32]">{token.ticker}</span><span className="block truncate text-[9px] text-[#88938c]">{token.uniswapPoolAddress ? `${token.uniswapPoolAddress.slice(0, 10)}…` : "Pool active"}</span></span><span className="rounded bg-[#f0ebf4] px-1.5 py-1 text-[8px] font-medium text-[#735c85]">Graduated</span></button>
                <button type="button" disabled={busyId !== null} onClick={() => execute(token.id, "BUY_TICKER_HYPERCORE")} className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-[#dce6e9] bg-[#f4f8f9] text-[10px] font-semibold text-[#4d7181] transition hover:bg-[#e9f1f3] disabled:opacity-50">{busyId === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gavel className="h-3 w-3" />} Beli ticker · {hip1AuctionHype} HYPE</button>
              </div>;
            })}
            {graduated.length === 0 && <p className="py-5 text-center text-[10px] text-[#939d96]">Graduated assets appear here.</p>}
          </div>
        </div>

        {/* HyperCore spot lane */}
        <div className="panel p-4">
          {laneHeading("03", "HyperCore spot", spot.length, "bg-[#e9f0f4] text-[#4d7186]")}
          <div className="mt-3 space-y-2.5">
            {spot.map((token) => {
              const key = `${token.id}:DEPLOY_HIP3_PERP`;
              return <div key={token.id} className="rounded-md border border-[#edf0ec] p-3">
                <button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2 text-left"><span className="flex h-7 w-7 items-center justify-center rounded text-[8px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3)}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#2d3b32]">{token.ticker}</span><span className="block text-[9px] text-[#88938c]">{token.hyperCoreSpotId || "Spot listing active"}</span></span><CheckCircle2 className="h-4 w-4 text-[#5f8b6c]" /></button>
                <button type="button" disabled={busyId !== null} onClick={() => execute(token.id, "DEPLOY_HIP3_PERP")} className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded border border-[#dce7dc] bg-[#f2f7f2] text-[10px] font-semibold text-[#456a4c] transition hover:bg-[#eaf2ea] disabled:opacity-50">{busyId === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Activate HIP-3 · up to {token.maxLeverage}×</button>
              </div>;
            })}
            {spot.length === 0 && <p className="py-5 text-center text-[10px] text-[#939d96]">Win a ticker to list an asset on HyperCore.</p>}
          </div>
        </div>

        {/* HIP-3 lane */}
        <div className="panel p-4">
          {laneHeading("04", "HIP-3 perpetuals", perps.length, "bg-[#e8f0e9] text-[#416d4c]")}
          <div className="mt-3 space-y-2.5">
            {perps.map((token) => <div key={token.id} className="rounded-md border border-[#edf0ec] p-3">
              <button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2 text-left"><span className="flex h-7 w-7 items-center justify-center rounded text-[8px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3)}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#2d3b32]">{token.hip3PerpSymbol || `${token.ticker}-PERP`}</span><span className="block text-[9px] text-[#88938c]">OI {formatUsd(token.openInterestUsd)} · {token.maxLeverage}×</span></span><span className="font-mono text-[10px] text-[#43734f]">${token.priceUsd.toFixed(2)}</span></button>
              <button type="button" onClick={() => onJumpToPerps(token)} className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-[#176b4d] text-[10px] font-semibold text-white transition hover:bg-[#125a40]"><CandlestickChart className="h-3 w-3" /> Open perpetual market</button>
            </div>)}
            {perps.length === 0 && <p className="py-5 text-center text-[10px] text-[#939d96]">HIP-3 markets appear after deployment.</p>}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0ec] px-5 py-4"><div><h2 className="text-xs font-semibold text-[#2d3b32]">HIP-1 ticker auction history</h2><p className="mt-1 text-[10px] text-[#87928a]">Ticker acquisition ledger and spot asset links</p></div><span className="font-mono text-[10px] text-[#7a6b4d]">Indicative: {hip1AuctionHype} HYPE · {formatUsd(hip1AuctionHype * hypePriceUsd)}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-[#fafbf9] text-[9px] font-semibold uppercase tracking-[0.12em] text-[#929b94]"><tr><th className="px-5 py-2.5">Ticker</th><th className="px-3 py-2.5">HyperCore ID</th><th className="px-3 py-2.5">Clearing price</th><th className="px-3 py-2.5">Payment</th><th className="px-5 py-2.5 text-right">Transaction</th></tr></thead><tbody className="divide-y divide-[#edf0ec]">{tickerAuctions.map((auction) => <tr key={auction.id}><td className="px-5 py-3 text-xs font-semibold text-[#2d3b32]">{auction.ticker}</td><td className="px-3 py-3 font-mono text-[10px] text-[#587180]">{auction.hyperCoreAssetId}</td><td className="px-3 py-3 font-mono text-[10px] text-[#4b5a50]">{auction.clearingPriceHype} HYPE <span className="text-[#9aa39d]">({formatUsd(auction.clearingPriceUsd)})</span></td><td className="px-3 py-3 text-[10px] text-[#758178]">{auction.paymentMethod === "X_MONEY" ? "𝕏 Money" : auction.paymentMethod}</td><td className="px-5 py-3 text-right font-mono text-[9px] text-[#8b958e]">{auction.txHash.slice(0, 10)}…{auction.txHash.slice(-5)}</td></tr>)}</tbody></table>{tickerAuctions.length === 0 && <div className="p-8 text-center text-xs text-[#88938b]">No ticker auctions have settled yet.</div>}</div>
      </section>
    </div>
  );
}
