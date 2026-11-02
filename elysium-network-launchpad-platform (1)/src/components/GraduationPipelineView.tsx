"use client";

import React, { useState } from "react";
import { ArrowRight, CandlestickChart, Check, ChevronRight, CircleDot, Gavel, GitBranch, Loader2, MoveDownRight, Rocket, Zap } from "lucide-react";
import type { PlatformToken, TickerAuctionRecord } from "@/types/platform";

interface GraduationPipelineViewProps {
  tokens: PlatformToken[];
  tickerAuctions: TickerAuctionRecord[];
  hip1AuctionHype: number;
  hypePriceUsd: number;
  onSelectToken: (token: PlatformToken) => void;
  onExecuteLifecycleAction: (params: { tokenId: number; action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP"; paymentMethod: string }) => Promise<void>;
  onJumpToPerps: (token: PlatformToken) => void;
}

export function GraduationPipelineView({ tokens, tickerAuctions, hip1AuctionHype, hypePriceUsd, onSelectToken, onExecuteLifecycleAction, onJumpToPerps }: GraduationPipelineViewProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [payment, setPayment] = useState<"HYPE" | "X_MONEY">("HYPE");
  const bonding = [...tokens].filter((token) => token.stage === "BONDING").sort((a, b) => b.bondingProgress - a.bondingProgress);
  const pooled = tokens.filter((token) => token.stage === "GRADUATED_UNISWAP");
  const spot = tokens.filter((token) => token.stage === "HYPERCORE_SPOT" || token.stage === "TICKER_ACQUIRED");
  const perps = tokens.filter((token) => token.stage === "HIP3_PERP_LIVE");

  const execute = async (tokenId: number, action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP") => {
    setBusy(`${tokenId}:${action}`);
    try { await onExecuteLifecycleAction({ tokenId, action, paymentMethod: payment }); }
    finally { setBusy(null); }
  };

  const LaneHeader = ({ number, title, count }: { number: string; title: string; count: number }) => <div className="flex items-center justify-between border-b border-[#26353b] pb-4"><div className="flex items-center gap-2.5"><span className="font-mono text-[11px] text-[#90b79a]">{number}</span><h3 className="font-display text-[15px] font-medium text-[#e9f0ea]">{title}</h3></div><span className="rounded-md border border-[#34454a] bg-[#1c2b30] px-2 py-0.5 font-mono text-[10px] text-[#b0c3b8]">{count}</span></div>;
  const TokenIcon = ({ token }: { token: PlatformToken }) => <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-white/10 text-[9px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3).toUpperCase()}</span>;

  return (
    <div className="animate-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="ui-overline flex items-center gap-2"><GitBranch className="h-3.5 w-3.5" /> THE LAUNCH JOURNEY</div><h1 className="mt-2 font-display text-[30px] font-medium text-[#f0f5f1] sm:text-[38px]">From launch to deep liquidity.</h1><p className="mt-2 max-w-2xl text-[13px] leading-[1.7] text-[#91a49a]">Follow every stage of a token’s lifecycle, from its first trade to a stock-token or perpetual-market preview.</p></div><div className="flex items-center gap-1 rounded-lg border border-[#304047] bg-[#131e23] p-1"><span className="px-2 text-[10px] text-[#7e9187]">Demo payment</span>{(["HYPE", "X_MONEY"] as const).map((rail) => <button type="button" key={rail} onClick={() => setPayment(rail)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition ${payment === rail ? "bg-[#2a4636] text-[#d5f0db]" : "text-[#849a8e] hover:text-white"}`}>{rail === "X_MONEY" ? "X Money" : rail}</button>)}</div></div>

      {/* Two-path flow diagram */}
      <section className="ui-card overflow-hidden p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><div><div className="ui-overline">LIFECYCLE BLUEPRINT</div><h2 className="mt-2 font-display text-[19px] font-medium">One start. Two possible destinations.</h2></div><span className="hidden rounded-md border border-[#35494a] px-2.5 py-1.5 font-mono text-[10px] text-[#91a79a] sm:block">ELYSIUM → HYPEREVM → HYPERCORE</span></div>
        <div className="ui-scroll mt-6 overflow-x-auto pb-2"><div className="flex min-w-[740px] items-center gap-2">
          {[
            { no: "01", title: "Create", detail: "Elysium token" },
            { no: "02", title: "Trade", detail: "Bonding curve" },
            { no: "03", title: "Graduate", detail: "Target reached" },
            { no: "04", title: "Pool complete", detail: "Uniswap V3 preview" },
          ].map((item, index) => <React.Fragment key={item.no}>{index > 0 && <ArrowRight className="h-4 w-4 shrink-0 text-[#668879]" />}<div className={`min-w-0 flex-1 rounded-[10px] border px-4 py-3.5 ${index === 3 ? "border-[#4b675a] bg-[#23392e]" : "border-[#31433d] bg-[#172720]"}`}><span className="font-mono text-[10px] text-[#96b8a0]">{item.no}</span><div className="mt-2 text-[13px] font-semibold text-[#edf2eb]">{item.title}</div><div className="mt-0.5 text-[10px] text-[#94ab9c]">{item.detail}</div></div></React.Fragment>)}
          <span className="rounded-md border border-[#375843] bg-[#264134] px-3 py-2 text-[10px] font-semibold text-[#ceead2]">COMPLETE</span>
        </div></div>
        <div className="mt-4 flex items-center gap-2 pl-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#95b2a1]"><MoveDownRight className="h-4 w-4" /> OPTIONAL EXPANSION PATH</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_18px_1fr_18px_1fr] sm:items-center">
          {[{ title: "Acquire ticker", desc: `HIP-1 auction · ${hip1AuctionHype} HYPE estimate`, icon: <Gavel className="h-4 w-4" /> },{ title: "HyperCore spot", desc: "Mirror bridge + orderbook preview", icon: <CircleDot className="h-4 w-4" /> },{ title: "HIP-3 perpetuals", desc: "Simulated leveraged markets", icon: <CandlestickChart className="h-4 w-4" /> }].map((item, index) => <React.Fragment key={item.title}>{index > 0 && <ArrowRight className="hidden h-4 w-4 text-[#6a8e7d] sm:block" />}<div className="flex min-w-0 items-center gap-3 rounded-[10px] border border-[#30464b] bg-[#18272b] px-4 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#28433b] text-[#b9e3cb]">{item.icon}</span><span className="min-w-0"><span className="block text-[12px] font-semibold text-[#e3ede6]">{item.title}</span><span className="mt-0.5 block truncate text-[10px] text-[#819d90]">{item.desc}</span></span></div></React.Fragment>)}
        </div>
        <p className="mt-5 border-t border-[#26353b] pt-4 text-[11px] leading-[1.65] text-[#83998a]">Sandbox note: these stages update your account’s database records. They do not deploy contracts, acquire real ticker rights, create actual pools, or place on-chain orders.</p>
      </section>

      {/* Stage queues */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="ui-card p-4 sm:p-5"><LaneHeader number="01" title="Bonding curve" count={bonding.length} /><div className="mt-4 space-y-2.5">{bonding.map((token) => <div key={token.id} className="ui-card-soft p-3"><button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2.5 text-left"><TokenIcon token={token} /><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#e7efe8]">{token.ticker}</span><span className="block truncate text-[10px] text-[#7f9487]">{token.name}</span></span><ChevronRight className="h-4 w-4 text-[#7d9988]" /></button><div className="mt-3 flex justify-between font-mono text-[10px] text-[#a5c2a4]"><span>Curve progress</span><span>{token.bondingProgress.toFixed(1)}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#263b35]"><div className="h-full rounded-full bg-[#b5d6a6]" style={{ width: `${Math.min(100, token.bondingProgress)}%` }} /></div><button type="button" disabled={busy !== null} onClick={() => execute(token.id, "ACCELERATE_GRADUATE")} className="ui-btn-secondary mt-3 w-full !min-h-8 !px-2 !text-[10px] disabled:opacity-40">{busy === `${token.id}:ACCELERATE_GRADUATE` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} Complete curve</button></div>)}{!bonding.length && <p className="py-8 text-center text-[11px] text-[#789083]">No tokens at this stage.</p>}</div></section>
        <section className="ui-card p-4 sm:p-5"><LaneHeader number="02" title="Pool complete" count={pooled.length} /><div className="mt-4 space-y-2.5">{pooled.map((token) => <div key={token.id} className="ui-card-soft p-3"><button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2.5 text-left"><TokenIcon token={token} /><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#e7efe8]">{token.ticker}</span><span className="block truncate text-[10px] text-[#7f9487]">{token.targetPath === "UNISWAP_ONLY" ? "AMM-only path" : "Eligible for ticker preview"}</span></span><Check className="h-4 w-4 text-[#b3dcb9]" /></button><button type="button" disabled={busy !== null} onClick={() => execute(token.id, "BUY_TICKER_HYPERCORE")} className="ui-btn-secondary mt-3 w-full !min-h-8 !px-2 !text-[10px] disabled:opacity-40">{busy === `${token.id}:BUY_TICKER_HYPERCORE` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gavel className="h-3.5 w-3.5" />} Acquire ticker · {hip1AuctionHype} HYPE</button></div>)}{!pooled.length && <p className="py-8 text-center text-[11px] text-[#789083]">Completed pools appear here.</p>}</div></section>
        <section className="ui-card p-4 sm:p-5"><LaneHeader number="03" title="HyperCore spot" count={spot.length} /><div className="mt-4 space-y-2.5">{spot.map((token) => <div key={token.id} className="ui-card-soft p-3"><button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2.5 text-left"><TokenIcon token={token} /><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#e7efe8]">{token.ticker}</span><span className="block truncate font-mono text-[10px] text-[#7f9487]">{token.hyperCoreSpotId || "Ticker recorded"}</span></span><ChevronRight className="h-4 w-4 text-[#7d9988]" /></button><button type="button" disabled={busy !== null} onClick={() => execute(token.id, "DEPLOY_HIP3_PERP")} className="ui-btn-secondary mt-3 w-full !min-h-8 !px-2 !text-[10px] disabled:opacity-40">{busy === `${token.id}:DEPLOY_HIP3_PERP` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Activate perp preview</button></div>)}{!spot.length && <p className="py-8 text-center text-[11px] text-[#789083]">Ticker-linked tokens appear here.</p>}</div></section>
        <section className="ui-card p-4 sm:p-5"><LaneHeader number="04" title="Perpetuals" count={perps.length} /><div className="mt-4 space-y-2.5">{perps.map((token) => <div key={token.id} className="ui-card-soft p-3"><button type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2.5 text-left"><TokenIcon token={token} /><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#e7efe8]">{token.hip3PerpSymbol || `${token.ticker}-PERP`}</span><span className="block text-[10px] text-[#7f9487]">Up to {token.maxLeverage}x · simulated</span></span><span className="font-mono text-[10px] text-[#b8d9be]">${token.priceUsd.toFixed(2)}</span></button><button type="button" onClick={() => onJumpToPerps(token)} className="ui-btn-primary mt-3 w-full !min-h-8 !px-2 !text-[10px]"><CandlestickChart className="h-3.5 w-3.5" /> Open market <ArrowRight className="h-3 w-3" /></button></div>)}{!perps.length && <p className="py-8 text-center text-[11px] text-[#789083]">Perpetual previews appear here.</p>}</div></section>
      </div>

      <section className="ui-card overflow-hidden"><div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#26353b] px-5 py-4 sm:px-6"><div><div className="ui-overline">HIP-1</div><h2 className="mt-1 font-display text-[17px] font-medium">Ticker auction history</h2></div><span className="font-mono text-[10px] text-[#80978a]">Estimated price · {hip1AuctionHype} HYPE / ${(hip1AuctionHype * hypePriceUsd).toFixed(0)}</span></div><div className="ui-scroll overflow-x-auto"><table className="w-full min-w-[580px] text-left"><thead className="ui-table-head"><tr><th className="px-5 py-3 sm:px-6">Ticker</th><th className="px-3 py-3">Spot ID</th><th className="px-3 py-3 text-right">Demo clearing price</th><th className="px-3 py-3 text-right">Payment</th><th className="px-5 py-3 text-right sm:px-6">Reference</th></tr></thead><tbody>{tickerAuctions.map((item) => <tr key={item.id} className="ui-table-row"><td className="px-5 py-3 font-medium text-[#dfeae1] sm:px-6">{item.ticker}</td><td className="px-3 py-3 font-mono text-[11px] text-[#8fb5a7]">{item.hyperCoreAssetId}</td><td className="px-3 py-3 text-right font-mono text-[11px] text-[#afc2b4]">{item.clearingPriceHype} HYPE</td><td className="px-3 py-3 text-right text-[11px] text-[#8ca397]">{item.paymentMethod === "X_MONEY" ? "X Money" : item.paymentMethod}</td><td className="px-5 py-3 text-right font-mono text-[10px] text-[#738b7f] sm:px-6">{item.txHash.slice(0, 10)}…{item.txHash.slice(-5)}</td></tr>)}</tbody></table>{tickerAuctions.length === 0 && <p className="px-6 py-10 text-center text-[11px] text-[#82958b]">No auction records yet.</p>}</div></section>
    </div>
  );
}
