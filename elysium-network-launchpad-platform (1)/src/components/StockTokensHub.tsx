"use client";

import React from "react";
import { ArrowRight, ArrowUpRight, CandlestickChart, Info, Plus, Shapes, ShieldAlert, TrendingUp } from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type { PlatformToken } from "@/types/platform";

interface StockTokensHubProps {
  tokens: PlatformToken[];
  onSelectToken: (token: PlatformToken) => void;
  onJumpToPerps: (token: PlatformToken) => void;
  onLaunchNewStockToken: () => void;
}

const compact = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${(value / 1_000).toFixed(1)}K`;

export function StockTokensHub({ tokens, onSelectToken, onJumpToPerps, onLaunchNewStockToken }: StockTokensHubProps) {
  const stocks = tokens.filter((token) => token.isStockToken);
  const volume = stocks.reduce((sum, token) => sum + token.volume24hUsd, 0);
  const interest = stocks.reduce((sum, token) => sum + token.openInterestUsd, 0);
  const perpCount = stocks.filter((token) => token.stage === "HIP3_PERP_LIVE").length;

  return (
    <div className="animate-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="ui-overline flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#9bc8b3]" /> MARKETS <span className="text-[#536b62]">/</span> STOCK TOKENS</div><span className="font-mono text-[10px] text-[#748b81]">INDICATIVE SANDBOX DATA</span></div>

      <section className="ui-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute right-[-100px] top-[-130px] h-[310px] w-[310px] rounded-full border border-[#254b40]" />
        <div className="pointer-events-none absolute right-[-45px] top-[-80px] h-[210px] w-[210px] rounded-full border border-[#254b40]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="ui-overline mb-3 flex items-center gap-2"><Shapes className="h-3.5 w-3.5" /> STOCK TOKEN MARKETPLACE</div>
            <h1 className="font-display text-[34px] font-medium leading-tight tracking-[-0.05em] text-[#f0f6f1] sm:text-[44px]">Stock tokens.<br /><span className="text-[#aedec1]">A new kind of market.</span></h1>
            <p className="mt-4 max-w-xl text-[13px] leading-[1.75] text-[#9bafa3]">Discover equity-linked token concepts on Elysium. Examine the underlying reference, trading stage, and perpetual-market availability in one place.</p>
            <div className="mt-4 flex items-start gap-2 text-[11px] text-[#b8cbbf]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b8dcbf]" /><span>These are sandbox examples, not actual shares or a verified claim on underlying equity.</span></div>
          </div>
          <button type="button" onClick={onLaunchNewStockToken} className="ui-btn-primary"><Plus className="h-4 w-4" /> Create stock token <ArrowUpRight className="h-3.5 w-3.5" /></button>
        </div>
      </section>

      <section className="ui-card grid grid-cols-2 divide-x-0 divide-y divide-[#26353b] overflow-hidden sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          { label: "Stock tokens", value: String(stocks.length).padStart(2, "0"), foot: "In the sandbox" },
          { label: "Demo 24h volume", value: compact(volume), foot: "Indicative activity" },
          { label: "Perpetual markets", value: String(perpCount).padStart(2, "0"), foot: "HIP-3 simulations" },
          { label: "Open interest", value: compact(interest), foot: "Simulated exposure" },
        ].map((item) => <div key={item.label} className="px-5 py-4 sm:px-6 sm:py-5"><div className="text-[11px] text-[#92a49b]">{item.label}</div><div className="mt-3 font-display text-[26px] font-medium text-[#edf3ed]">{item.value}</div><div className="mt-0.5 text-[10px] text-[#71867b]">{item.foot}</div></div>)}
      </section>

      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#26353b] px-5 py-5 sm:px-6"><div><div className="ui-overline">DISCOVER MARKETS</div><h2 className="mt-1 font-display text-[20px] font-medium">Equity-linked assets</h2></div><span className="text-[11px] text-[#83978b]">Select a market to explore its lifecycle</span></div>
        <div className="ui-scroll overflow-x-auto">
          <table className="w-full min-w-[830px] table-fixed text-left">
            <thead className="ui-table-head"><tr><th className="w-[24%] px-5 py-3.5 sm:px-6">Token</th><th className="w-[15%] px-3 py-3.5">Reference</th><th className="w-[19%] px-3 py-3.5">Lifecycle stage</th><th className="w-[13%] px-3 py-3.5 text-right">Price</th><th className="w-[12%] px-3 py-3.5 text-right">24h</th><th className="w-[17%] px-5 py-3.5 text-right">Action</th></tr></thead>
            <tbody>{stocks.map((token) => {
              const stage = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
              return <tr key={token.id} className="ui-table-row cursor-pointer" onClick={() => onSelectToken(token)}>
                <td className="px-5 py-4 sm:px-6"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-white/10 text-[10px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{(token.underlyingTicker || token.ticker).slice(0, 3)}</span><span className="min-w-0"><span className="block truncate text-[12px] font-semibold text-[#e9efeb]">{token.ticker}</span><span className="mt-0.5 block truncate text-[10px] text-[#7a9184]">{token.name}</span></span></div></td>
                <td className="px-3 py-4"><span className="block text-[11px] font-medium text-[#cbd8cf]">{token.underlyingTicker || "—"}</span><span className="mt-0.5 block text-[10px] text-[#7b9084]">{token.underlyingExchange || "Reference"}</span></td>
                <td className="px-3 py-4"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${stage.badgeClass}`}>{stage.shortLabel}</span></td>
                <td className="px-3 py-4 text-right font-mono text-[11px] text-[#e7efe9]">${token.priceUsd.toFixed(2)}</td>
                <td className={`px-3 py-4 text-right font-mono text-[11px] ${token.change24h >= 0 ? "text-[#a6dfb8]" : "text-[#e39b97]"}`}>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</td>
                <td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); token.stage === "HIP3_PERP_LIVE" ? onJumpToPerps(token) : onSelectToken(token); }} className="ui-btn-secondary !min-h-8 !px-3 !text-[10px]">{token.stage === "HIP3_PERP_LIVE" ? <><CandlestickChart className="h-3.5 w-3.5" /> Trade perp</> : <>Explore spot <ArrowRight className="h-3.5 w-3.5" /></>}</button></td>
              </tr>;
            })}</tbody>
          </table>
          {!stocks.length && <div className="px-5 py-12 text-center text-[12px] text-[#82958b]">No stock tokens are available yet.</div>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: <TrendingUp className="h-4 w-4" />, title: "From launch to liquidity", description: "A stock-token concept can move through the curve, a pool preview, and a spot listing workflow." },
          { icon: <CandlestickChart className="h-4 w-4" />, title: "Perpetuals, in context", description: "Practice long and short positions with simulated margin, funding references, and mark prices." },
          { icon: <ShieldAlert className="h-4 w-4" />, title: "Read the disclosure", description: "Reference tickers, ISINs, oracle labels, and backing ratios in this sandbox are sample metadata—not verification." },
        ].map((item) => <div key={item.title} className="ui-card p-5"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#385147] bg-[#21372d] text-[#bee8ca]">{item.icon}</div><h3 className="mt-4 font-display text-[15px] font-medium text-[#e8f0e9]">{item.title}</h3><p className="mt-2 text-[11px] leading-[1.7] text-[#85998d]">{item.description}</p></div>)}
      </section>
    </div>
  );
}
