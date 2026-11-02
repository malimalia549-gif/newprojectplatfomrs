"use client";

import React from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CandlestickChart,
  Check,
  ChevronRight,
  CircleDot,
  GitBranch,
  Layers3,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type { ActiveTab, PlatformToken, TokenHoldingRecord } from "@/types/platform";

interface LaunchpadDashboardProps {
  tokens: PlatformToken[];
  allTokens: PlatformToken[];
  holdings: TokenHoldingRecord[];
  networkMode: "testnet" | "mainnet_preview";
  hypePriceUsd: number;
  hip1AuctionHype: number;
  totalMcap: number;
  totalVol: number;
  totalOi: number;
  searchQuery: string;
  onSearch: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  stageFilter: string;
  onStageChange: (value: string) => void;
  sortBy: "VOLUME" | "BONDING" | "MCAP" | "GAINERS";
  onSortChange: (value: "VOLUME" | "BONDING" | "MCAP" | "GAINERS") => void;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectToken: (token: PlatformToken) => void;
  onJumpToPerps: (token: PlatformToken) => void;
}

function compact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function price(value: number): string {
  if (value < 0.0001) return `$${value.toExponential(2)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 4 : 2 })}`;
}

const categoryOptions = [
  { value: "ALL", label: "All markets" },
  { value: "STOCK_TOKEN", label: "Stock tokens" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "AI_AGENT", label: "AI agents" },
  { value: "DEFI", label: "DeFi" },
];

export function LaunchpadDashboard({
  tokens, allTokens, holdings, networkMode, hypePriceUsd, hip1AuctionHype,
  totalMcap, totalVol, totalOi, searchQuery, onSearch,
  categoryFilter, onCategoryChange, stageFilter, onStageChange,
  sortBy, onSortChange, onSelectTab, onSelectToken, onJumpToPerps,
}: LaunchpadDashboardProps) {
  const nearGraduation = [...allTokens]
    .filter((token) => token.stage === "BONDING")
    .sort((a, b) => b.bondingProgress - a.bondingProgress)
    .slice(0, 3);
  const stockSpotlight = [...allTokens]
    .filter((token) => token.isStockToken)
    .sort((a, b) => b.volume24hUsd - a.volume24hUsd)
    .slice(0, 2);
  const perpMarkets = allTokens.filter((token) => token.stage === "HIP3_PERP_LIVE").length;

  return (
    <div className="animate-enter space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="ui-overline flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b3ebc9]" /> MARKET OVERVIEW <span className="text-[#536b62]">/</span> ELYSIUM ECOSYSTEM</div>
        <span className="font-mono text-[10px] text-[#748b81]">{networkMode === "testnet" ? "TESTNET CONFIGURATION · 99801" : "MAINNET CONFIGURATION PREVIEW"}</span>
      </div>

      {/* Intro hero, intentionally free from visual clutter */}
      <section className="relative overflow-hidden rounded-[18px] border border-[#2c453c] bg-[#142821]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_90%_at_95%_20%,rgba(100,154,113,0.11),transparent_80%)]" />
        <div className="relative grid lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,.92fr)]">
          <div className="flex flex-col justify-between px-6 py-7 sm:px-9 sm:py-10 lg:pr-6">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#476554] bg-[#284335]/60 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#c3e9cd]">
                <CircleDot className="h-3 w-3" /> BUILT FOR THE NEXT MARKET
              </div>
              <h1 className="max-w-[650px] font-display text-[38px] font-medium leading-[1.08] tracking-[-0.055em] text-[#f5f8f4] sm:text-[50px] xl:text-[58px]">
                Create today.<br /><span className="text-[#bdeccf]">Trade everywhere tomorrow.</span>
              </h1>
              <p className="mt-5 max-w-[560px] text-[13px] leading-[1.8] text-[#adc3b6] sm:text-sm">
                A complete launch journey for digital assets and stock-token concepts. Start on Elysium, grow into deeper liquidity, and explore HyperCore markets—all in one workspace.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => onSelectTab("CREATE_TOKEN")} className="ui-btn-primary"><Plus className="h-4 w-4" /> Create a token <ArrowUpRight className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onSelectTab("LIFECYCLE_PIPELINE")} className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-[#4b6a58] px-4 text-[12px] font-semibold text-[#dcece1] transition hover:bg-white/5">Explore the lifecycle <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="relative border-t border-[#355143] bg-[#11231c]/70 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-9">
            <div className="mb-5 flex items-center justify-between"><span className="ui-overline !text-[#a7c4ad]">THE ASSET JOURNEY</span><GitBranch className="h-4 w-4 text-[#799d82]" /></div>
            <div className="relative ml-2 border-l border-[#50755c] pl-6">
              {[
                { n: "01", title: "Create", desc: "Launch a token on Elysium" },
                { n: "02", title: "Trade", desc: "Build demand on the bonding curve" },
                { n: "03", title: "Graduate", desc: "Reach a Uniswap V3 pool" },
              ].map((step, index) => (
                <div key={step.n} className={`relative ${index !== 2 ? "pb-5" : "pb-3"}`}>
                  <span className="absolute -left-[30px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[#a3d8b1] bg-[#173a27]" />
                  <div className="flex items-baseline gap-3"><span className="font-mono text-[10px] text-[#9bbb9e]">{step.n}</span><span className="text-[13px] font-semibold text-[#e5f2e7]">{step.title}</span></div>
                  <p className="mt-0.5 pl-7 text-[11px] text-[#9fb7a4]">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="ml-8 mt-1 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[#43644a] bg-[#284432]/65 px-3 py-2.5"><span className="text-[10px] font-semibold text-[#d6e9d8]">Pool complete</span><span className="mt-0.5 block text-[10px] text-[#9db8a2]">AMM-only path ends here</span></div>
              <div className="rounded-lg border border-[#466b65] bg-[#203b39]/65 px-3 py-2.5"><span className="text-[10px] font-semibold text-[#dcefe8]">Expand to HyperCore</span><span className="mt-0.5 block text-[10px] text-[#a2c1b5]">Ticker → Spot → HIP-3</span></div>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-[#82a28b]">Workflow shown as a product sandbox. On-chain actions are not connected.</p>
          </div>
        </div>
      </section>

      {/* One unified metrics strip */}
      <section className="ui-card grid grid-cols-2 divide-x-0 divide-y divide-[#25343a] overflow-hidden md:grid-cols-4 md:divide-x md:divide-y-0" aria-label="Sandbox metrics">
        {[
          { label: "Listed assets", value: String(allTokens.length).padStart(2, "0"), note: "Across launch stages", icon: <Layers3 className="h-[17px] w-[17px]" /> },
          { label: "Indicative market cap", value: compact(totalMcap), note: "Illustrative valuation", icon: <TrendingUp className="h-[17px] w-[17px]" /> },
          { label: "Demo 24h volume", value: compact(totalVol), note: "Across all venues", icon: <ArrowUpRight className="h-[17px] w-[17px]" /> },
          { label: "Perpetual markets", value: String(perpMarkets).padStart(2, "0"), note: `${compact(totalOi)} simulated OI`, icon: <CandlestickChart className="h-[17px] w-[17px]" /> },
        ].map((metric) => (
          <div key={metric.label} className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-[#91a59b]"><span>{metric.label}</span><span className="text-[#789b88]">{metric.icon}</span></div>
            <div className="mt-3 font-display text-[26px] font-medium tracking-[-0.05em] text-[#edf3ed] sm:text-[29px]">{metric.value}</div>
            <div className="mt-0.5 text-[10px] text-[#748b80]">{metric.note}</div>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_315px]">
        {/* Market explorer */}
        <section className="ui-card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#26353b] px-5 py-5 sm:px-6">
            <div><div className="ui-overline">DISCOVER</div><h2 className="mt-1 font-display text-[21px] font-medium text-[#f0f5f1]">Markets</h2><p className="mt-1 text-[11px] text-[#82968b]">Explore assets across every stage of the launch lifecycle.</p></div>
            <span className="rounded-md border border-[#34464a] bg-[#1a2a2e] px-2 py-1 font-mono text-[10px] text-[#a6bcb0]">{tokens.length} ASSETS</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26353b] px-4 py-3 sm:px-6">
            <div className="ui-scroll flex max-w-full items-center gap-1 overflow-x-auto">
              {categoryOptions.map((option) => <button type="button" key={option.value} onClick={() => onCategoryChange(option.value)} className={`shrink-0 rounded-md px-3 py-2 text-[11px] font-semibold transition ${categoryFilter === option.value ? "bg-[#264334] text-[#d3efd9]" : "text-[#83978b] hover:bg-[#1c2b30] hover:text-[#d6e4da]"}`}>{option.label}</button>)}
            </div>
          </div>
          <div className="grid gap-2 border-b border-[#26353b] px-4 py-3 sm:grid-cols-[minmax(200px,1fr)_160px_150px] sm:px-6">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c877a]" /><input type="search" value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Search token or ticker" aria-label="Search token or ticker" className="ui-field !h-9 !min-h-0 !pl-9" /></div>
            <select value={stageFilter} onChange={(event) => onStageChange(event.target.value)} aria-label="Filter by stage" className="ui-field !h-9 !min-h-0"><option value="ALL">All stages</option><option value="BONDING">Bonding curve</option><option value="GRADUATED_UNISWAP">Pool complete</option><option value="TICKER_ACQUIRED">Ticker acquired</option><option value="HYPERCORE_SPOT">HyperCore spot</option><option value="HIP3_PERP_LIVE">Perpetuals</option></select>
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value as LaunchpadDashboardProps["sortBy"])} aria-label="Sort markets" className="ui-field !h-9 !min-h-0"><option value="VOLUME">Volume</option><option value="BONDING">Near graduation</option><option value="MCAP">Market cap</option><option value="GAINERS">Top gainers</option></select>
          </div>

          <div className="ui-scroll overflow-x-auto">
            <table className="w-full min-w-[670px] table-fixed text-left">
              <thead className="ui-table-head"><tr><th className="w-[29%] px-5 py-3.5 sm:px-6">Asset</th><th className="w-[22%] px-3 py-3.5">Lifecycle</th><th className="w-[16%] px-3 py-3.5 text-right">Price</th><th className="w-[13%] px-3 py-3.5 text-right">24h</th><th className="w-[15%] px-3 py-3.5 text-right">Volume</th><th className="w-[5%] py-3.5" /></tr></thead>
              <tbody>
                {tokens.map((token) => {
                  const stage = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
                  const held = holdings.find((holding) => holding.tokenId === token.id && holding.balance > 0);
                  return (
                    <tr key={token.id} className="ui-table-row cursor-pointer" onClick={() => onSelectToken(token)}>
                      <td className="px-5 py-3.5 sm:px-6"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-white/10 text-[10px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3).toUpperCase()}</span><span className="min-w-0"><span className="flex items-center gap-1.5"><span className="truncate text-[12px] font-semibold text-[#e7efe9]">{token.ticker}</span>{token.isStockToken && <span className="shrink-0 rounded bg-[#243f3b] px-1.5 py-0.5 text-[9px] font-semibold text-[#abd7c5]">STOCK</span>}</span><span className="mt-0.5 block truncate text-[10px] text-[#778d82]">{held ? `${token.name} · In your wallet` : token.name}</span></span></div></td>
                      <td className="px-3 py-3.5"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${stage.badgeClass}`}>{stage.shortLabel}</span></td>
                      <td className="px-3 py-3.5 text-right font-mono text-[11px] text-[#e1eae2]">{price(token.priceUsd)}</td>
                      <td className={`px-3 py-3.5 text-right font-mono text-[11px] ${token.change24h >= 0 ? "text-[#a6dfb8]" : "text-[#e39b97]"}`}><span className="inline-flex items-center justify-end gap-0.5">{token.change24h >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(token.change24h).toFixed(2)}%</span></td>
                      <td className="px-3 py-3.5 text-right font-mono text-[11px] text-[#9fb0a7]">{compact(token.volume24hUsd)}</td>
                      <td className="pr-4 text-right"><button type="button" aria-label={`Open ${token.ticker} market`} onClick={(event) => { event.stopPropagation(); token.stage === "HIP3_PERP_LIVE" ? onJumpToPerps(token) : onSelectToken(token); }} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#748e7d] transition hover:bg-[#254034] hover:text-[#c5e8cf]"><ChevronRight className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tokens.length === 0 && <div className="px-6 py-14 text-center text-[12px] text-[#85988d]">No assets match your current filters.</div>}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#26353b] px-5 py-3.5 sm:px-6"><span className="text-[10px] text-[#778d82]">Prices and market activity are illustrative.</span><button type="button" onClick={() => onSelectTab("CREATE_TOKEN")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b3ebc9] hover:text-white">Create a market <ArrowRight className="h-3 w-3" /></button></div>
        </section>

        {/* Context rail */}
        <aside className="space-y-4">
          <div className="ui-card p-5">
            <div className="flex items-center justify-between"><div className="ui-overline">MOMENTUM</div><TrendingUp className="h-4 w-4 text-[#89ae92]" /></div>
            <h3 className="mt-2 font-display text-[18px] font-medium text-[#e9f1e9]">Near graduation</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#85998d]">Assets closest to their HYPE bonding target.</p>
            <div className="mt-4 space-y-4">
              {nearGraduation.length === 0 && <p className="text-[11px] text-[#788d82]">No assets on the bonding curve.</p>}
              {nearGraduation.map((token) => <button key={token.id} type="button" onClick={() => onSelectToken(token)} className="block w-full text-left"><div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold text-[#e2ebe4]">{token.ticker}</span><span className="font-mono text-[11px] text-[#c6dcbf]">{token.bondingProgress.toFixed(1)}%</span></div><div className="mt-2 h-[5px] w-full overflow-hidden rounded-full bg-[#26363a]"><div className="h-full rounded-full bg-[#a9d5ae]" style={{ width: `${Math.min(100, token.bondingProgress)}%` }} /></div><div className="mt-1.5 flex items-center justify-between text-[10px] text-[#758a7e]"><span>{token.name}</span><span>{Math.max(0, token.graduationTargetHype - token.realHypeRaised).toFixed(0)} HYPE left</span></div></button>)}
            </div>
          </div>

          <div className="ui-card p-5">
            <div className="flex items-center justify-between"><div className="ui-overline">STOCK TOKENS</div><span className="rounded bg-[#243d3c] px-2 py-1 font-mono text-[10px] text-[#a6d9cd]">xStocks</span></div>
            <h3 className="mt-2 font-display text-[18px] font-medium text-[#e9f1e9]">Equity spotlight</h3>
            <div className="mt-4 divide-y divide-[#25343a]">
              {stockSpotlight.map((token) => <button key={token.id} type="button" onClick={() => onSelectToken(token)} className="flex w-full items-center gap-2.5 py-3 text-left first:pt-0 last:pb-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.underlyingTicker?.slice(0, 3)}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#e5ede6]">{token.ticker}</span><span className="block truncate text-[10px] text-[#788d82]">{token.underlyingExchange}</span></span><span className="text-right"><span className="block font-mono text-[11px] text-[#e5ede6]">{price(token.priceUsd)}</span><span className={`font-mono text-[10px] ${token.change24h >= 0 ? "text-[#a6dfb8]" : "text-[#e39b97]"}`}>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</span></span></button>)}
            </div>
            <button type="button" onClick={() => onSelectTab("STOCK_TOKENS")} className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#b3ebc9] hover:text-white">View all stock tokens <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>

          <div className="rounded-[13px] border border-[#34433f] bg-[#172622] p-4"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#cbe5d2]"><Check className="h-3.5 w-3.5" /> Built for preparation</div><p className="mt-2 text-[10px] leading-[1.65] text-[#8ca89a]">This workspace uses simulated balances, trades, auction records, and payment receipts. No real assets or funds move here.</p><div className="mt-3 border-t border-[#34433f] pt-3 font-mono text-[10px] text-[#a2c7ad]">HYPE reference price: ${hypePriceUsd.toFixed(2)}</div></div>
        </aside>
      </div>
    </div>
  );
}
