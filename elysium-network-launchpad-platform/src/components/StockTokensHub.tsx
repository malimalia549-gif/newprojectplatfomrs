"use client";

import React from "react";
import {
  ArrowRight,
  Building2,
  CandlestickChart,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type { PlatformToken } from "@/types/platform";

interface StockTokensHubProps {
  tokens: PlatformToken[];
  onSelectToken: (token: PlatformToken) => void;
  onJumpToPerps: (token: PlatformToken) => void;
  onLaunchNewStockToken: () => void;
}

const fmt = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${(value / 1_000).toFixed(0)}K`;

export function StockTokensHub({ tokens, onSelectToken, onJumpToPerps, onLaunchNewStockToken }: StockTokensHubProps) {
  const stockTokens = tokens.filter((token) => token.isStockToken);
  const totalVolume = stockTokens.reduce((sum, token) => sum + token.volume24hUsd, 0);
  const totalOi = stockTokens.reduce((sum, token) => sum + token.openInterestUsd, 0);

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded border border-[#dfe8df] bg-[#f4f7f3] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#577460]"><Building2 className="h-3.5 w-3.5" /> Elysium · Tokenized equities</div>
            <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#1d2c23] sm:text-[2.65rem]">Equity markets, open around the clock.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#718078]">Explore StockFlow-style tokenized equities and pre-IPO markets on Elysium. Review each asset’s lifecycle, oracle details and backing disclosures before trading.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-[#6f7e74]">
              <span className="rounded border border-[#e5e9e4] px-2 py-1">Elysium AMM</span><ArrowRight className="h-3 w-3 text-[#a1aaa3]" />
              <span className="rounded border border-[#e5e9e4] px-2 py-1">Mirror bridge</span><ArrowRight className="h-3 w-3 text-[#a1aaa3]" />
              <span className="rounded border border-[#e5e9e4] px-2 py-1">HyperCore spot</span><ArrowRight className="h-3 w-3 text-[#a1aaa3]" />
              <span className="rounded border border-[#e5e9e4] px-2 py-1">HIP-3 perps</span>
            </div>
          </div>
          <button type="button" onClick={onLaunchNewStockToken} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-md bg-[#176b4d] px-4 text-xs font-semibold text-white transition hover:bg-[#125a40] lg:self-end"><Building2 className="h-4 w-4" /> Launch equity token</button>
        </div>
        <div className="grid grid-cols-2 border-t border-[#edf0ec] sm:grid-cols-4">
          {[
            { label: "Equity markets", value: String(stockTokens.length).padStart(2, "0"), detail: "Listed assets" },
            { label: "24h volume", value: fmt(totalVolume), detail: "Spot activity" },
            { label: "Perpetual OI", value: fmt(totalOi), detail: "HIP-3 open interest" },
            { label: "Trading hours", value: "24 / 7", detail: "Onchain availability" },
          ].map((item, index) => <div key={item.label} className={`p-4 sm:px-5 ${index % 2 ? "border-l border-[#edf0ec]" : ""} ${index > 1 ? "border-t border-[#edf0ec] sm:border-t-0" : ""} ${index === 2 ? "sm:border-l" : ""}`}><div className="text-[10px] text-[#87928a]">{item.label}</div><div className="mt-1.5 font-mono text-xl font-medium text-[#25352b]">{item.value}</div><div className="mt-0.5 text-[10px] text-[#9aa39d]">{item.detail}</div></div>)}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ec] px-5 py-4">
          <div><h2 className="font-display text-base font-semibold text-[#25352b]">Equity markets</h2><p className="mt-0.5 text-[11px] text-[#849087]">Underlying asset data and onchain market status</p></div>
          <div className="flex items-center gap-2 text-[10px] text-[#758178]"><span className="h-1.5 w-1.5 rounded-full bg-[#3e8c63]" /> Testnet market data</div>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-[#fafbf9] text-[9px] font-semibold uppercase tracking-[0.13em] text-[#929b94]"><tr><th className="px-5 py-3">Equity</th><th className="px-3 py-3">Underlying</th><th className="px-3 py-3">Reference feed</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right">24h</th><th className="px-3 py-3">Market stage</th><th className="px-5 py-3 text-right">Trade</th></tr></thead>
            <tbody className="divide-y divide-[#edf0ec]">
              {stockTokens.map((token) => {
                const stage = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
                return <tr key={token.id} onClick={() => onSelectToken(token)} className="group cursor-pointer transition hover:bg-[#fafbf9]">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md text-[9px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.underlyingTicker || token.ticker.slice(0, 3)}</span><span><span className="block text-xs font-semibold text-[#26352d]">{token.ticker}</span><span className="mt-0.5 block max-w-[220px] truncate text-[10px] text-[#87928a]">{token.name}</span></span></div></td>
                  <td className="px-3 py-3.5"><span className="block text-xs font-medium text-[#3a4a40]">{token.underlyingTicker}</span><span className="mt-0.5 block text-[10px] text-[#919b94]">{token.underlyingExchange}</span></td>
                  <td className="px-3 py-3.5"><span className="inline-flex items-center gap-1 text-[10px] text-[#597463]"><ShieldCheck className="h-3 w-3" />{token.backingRatio || 100}% disclosed</span><span className="mt-0.5 block max-w-[165px] truncate text-[9px] text-[#919b94]">{token.oracleProvider || "Oracle not specified"}</span></td>
                  <td className="px-3 py-3.5 text-right font-mono text-xs text-[#29382f]">${token.priceUsd.toFixed(2)}</td>
                  <td className={`px-3 py-3.5 text-right font-mono text-xs ${token.change24h >= 0 ? "text-[#347752]" : "text-[#b04b42]"}`}>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</td>
                  <td className="px-3 py-3.5"><span className={`rounded px-2 py-1 text-[9px] ${token.stage === "HIP3_PERP_LIVE" ? "bg-[#e7f1e9] text-[#286645]" : token.stage === "BONDING" ? "bg-[#faf2df] text-[#8d6c31]" : "bg-[#edf1f5] text-[#496d82]"}`}>{stage.shortLabel}</span></td>
                  <td className="px-5 py-3.5 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); token.stage === "HIP3_PERP_LIVE" ? onJumpToPerps(token) : onSelectToken(token); }} className="inline-flex h-8 items-center gap-1.5 rounded border border-[#dfe6df] px-2.5 text-[10px] font-semibold text-[#41604c] transition hover:bg-[#f0f5f1]">{token.stage === "HIP3_PERP_LIVE" ? <><CandlestickChart className="h-3 w-3" /> Perpetuals</> : <>Spot market <ArrowRight className="h-3 w-3" /></>}</button></td>
                </tr>;
              })}
            </tbody>
          </table>
          {stockTokens.length === 0 && <div className="p-12 text-center text-sm text-[#7b877f]">No equity markets available.</div>}
        </div>
        <div className="divide-y divide-[#edf0ec] md:hidden">
          {stockTokens.map((token) => <button key={token.id} type="button" onClick={() => onSelectToken(token)} className="w-full px-4 py-4 text-left hover:bg-[#fafbf9]"><span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-md text-[9px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.underlyingTicker || token.ticker.slice(0, 3)}</span><span><span className="block text-xs font-semibold text-[#26352d]">{token.ticker} <span className="font-normal text-[#87928a]">· {token.underlyingTicker}</span></span><span className="mt-1 block text-[10px] text-[#87928a]">{token.underlyingExchange} · {token.backingRatio || 100}% disclosed</span></span></span><span className="text-right"><span className="block font-mono text-xs text-[#29382f]">${token.priceUsd.toFixed(2)}</span><span className={`font-mono text-[10px] ${token.change24h >= 0 ? "text-[#347752]" : "text-[#b04b42]"}`}>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</span></span></span></button>)}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e4e9e3] bg-[#edf2ec] px-4 py-3 text-[10px] text-[#65746a]">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#557b5d]" />Equity-token backing, oracle and redemption terms are issuer-specific. Review disclosures before trading.</span>
        <button type="button" onClick={onLaunchNewStockToken} className="inline-flex items-center gap-1 font-semibold text-[#35674a] hover:text-[#173b2c]">Issue a market <ExternalLink className="h-3 w-3" /></button>
      </div>
    </div>
  );
}
