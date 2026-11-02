"use client";

import React from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CandlestickChart,
  CircleDollarSign,
  Clock3,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type { ActiveTab, PlatformToken, TokenHoldingRecord } from "@/types/platform";

interface LaunchpadDashboardProps {
  tokens: PlatformToken[];
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

function money(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function price(value: number) {
  return value < 1 ? `$${value.toFixed(4)}` : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const categories = [
  { id: "ALL", label: "All assets" },
  { id: "STOCK_TOKEN", label: "Equities" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "AI_AGENT", label: "AI agents" },
  { id: "DEFI", label: "DeFi" },
];

export function LaunchpadDashboard({
  tokens,
  holdings,
  networkMode,
  hypePriceUsd,
  hip1AuctionHype,
  totalMcap,
  totalVol,
  totalOi,
  searchQuery,
  onSearch,
  categoryFilter,
  onCategoryChange,
  stageFilter,
  onStageChange,
  sortBy,
  onSortChange,
  onSelectTab,
  onSelectToken,
  onJumpToPerps,
}: LaunchpadDashboardProps) {
  const livePerps = tokens.filter((t) => t.stage === "HIP3_PERP_LIVE").length;
  const equities = tokens.filter((t) => t.isStockToken).length;

  return (
    <div className="space-y-6">
      {/* Editorial hero */}
      <section className="relative overflow-hidden rounded-xl bg-[#173b2c] px-6 py-7 text-white shadow-[0_16px_40px_-26px_rgba(14,51,36,0.65)] sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(135deg, transparent 49.8%, #e7d8b6 50%, transparent 50.2%)", backgroundSize: "38px 38px" }} />
        <div className="pointer-events-none absolute right-[-6rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute right-[-3rem] top-[-5rem] h-[18rem] w-[18rem] rounded-full border border-white/[0.08]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#c9d7cb]">
              <span className="inline-flex items-center gap-2 rounded border border-white/15 bg-white/[0.06] px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a9c69e]" />
                Elysium {networkMode === "testnet" ? "Testnet · 99801" : "Mainnet preparation"}
              </span>
              <span className="rounded border border-white/15 px-2.5 py-1.5 text-[#e3d2a6]">Digital asset infrastructure</span>
            </div>
            <h1 className="max-w-xl font-display text-[2.45rem] font-semibold leading-[1.05] tracking-[-0.045em] text-white sm:text-[3.35rem]">
              Launch markets.<br />Build lasting liquidity.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#d2ded5] sm:text-[15px]">
              Create on Elysium, graduate to Uniswap liquidity, then bring successful assets to HyperCore spot and HIP-3 perpetual markets.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onSelectTab("CREATE_TOKEN")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#e4eadf] px-4 text-xs font-semibold text-[#173b2c] transition hover:bg-white"
              >
                <Plus className="h-4 w-4" /> Launch an asset
              </button>
              <button
                type="button"
                onClick={() => onSelectTab("LIFECYCLE_PIPELINE")}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 px-4 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Explore the lifecycle <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
            <div className="bg-[#102f23]/90 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.13em] text-[#aabeb0]"><Clock3 className="h-3.5 w-3.5" /> Block cadence</div>
              <div className="mt-2 font-mono text-2xl font-medium text-white">{networkMode === "testnet" ? "128" : "100"}<span className="ml-1 text-sm text-[#c3d1c6]">ms</span></div>
              <div className="mt-1 text-[11px] text-[#aabeb0]">Arbitrum Orbit · Nitro</div>
            </div>
            <div className="bg-[#102f23]/90 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.13em] text-[#aabeb0]"><CircleDollarSign className="h-3.5 w-3.5" /> Native gas</div>
              <div className="mt-2 font-mono text-2xl font-medium text-white">HYPE</div>
              <div className="mt-1 text-[11px] text-[#aabeb0]">${hypePriceUsd.toFixed(2)} indicative price</div>
            </div>
            <div className="bg-[#102f23]/90 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.13em] text-[#aabeb0]"><Activity className="h-3.5 w-3.5" /> HyperCore</div>
              <div className="mt-2 font-mono text-2xl font-medium text-white">~70<span className="ml-1 text-sm text-[#c3d1c6]">ms</span></div>
              <div className="mt-1 text-[11px] text-[#aabeb0]">Spot orderbook cadence</div>
            </div>
            <div className="bg-[#102f23]/90 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.13em] text-[#aabeb0]"><TrendingUp className="h-3.5 w-3.5" /> HIP-1 auction</div>
              <div className="mt-2 font-mono text-2xl font-medium text-white">{hip1AuctionHype}<span className="ml-1 text-sm text-[#c3d1c6]">HYPE</span></div>
              <div className="mt-1 text-[11px] text-[#aabeb0]">Indicative clearing level</div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview metrics */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Market overview">
        {[
          { label: "Ecosystem cap", value: money(totalMcap), note: `${tokens.length} assets across markets`, icon: <Layers3 className="h-4 w-4" /> },
          { label: "24h trading volume", value: money(totalVol), note: "Spot & perpetual markets", icon: <BarChart3 className="h-4 w-4" /> },
          { label: "Tokenized equities", value: String(equities).padStart(2, "0"), note: "StockFlow · xStocks", icon: <Building2 className="h-4 w-4" /> },
          { label: "HIP-3 markets", value: String(livePerps).padStart(2, "0"), note: `${money(totalOi)} open interest`, icon: <CandlestickChart className="h-4 w-4" /> },
        ].map((stat, index) => (
          <div key={stat.label} className="panel animate-fade-up p-4 sm:p-5" style={{ animationDelay: `${index * 55}ms` }}>
            <div className="flex items-center justify-between text-[#748078]">
              <span className="text-[11px] font-medium">{stat.label}</span>
              <span className="text-[#7d9787]">{stat.icon}</span>
            </div>
            <div className="mt-3 font-mono text-[1.65rem] font-medium tracking-[-0.04em] text-[#1b2921] sm:text-[1.85rem]">{stat.value}</div>
            <div className="mt-1 text-[10px] text-[#89948d]">{stat.note}</div>
          </div>
        ))}
      </section>

      {/* Markets */}
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#edf0ec] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-[#1e2c24]">Markets</h2>
              <span className="rounded bg-[#edf3ee] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#53745f]">{tokens.length} ASSETS</span>
            </div>
            <p className="mt-1 text-xs text-[#78847c]">Discover launches, tokenized equities and live orderbook markets.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[210px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#87938b]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Search name or ticker"
                className="h-9 w-full rounded-md border border-[#e1e7e1] bg-[#fbfcfa] pl-9 pr-3 text-xs text-[#26352d] placeholder:text-[#a1aaa4] focus:border-[#7ca38b] focus:outline-none focus:ring-2 focus:ring-[#176b4d]/10 sm:w-[220px]"
              />
            </label>
            <select value={stageFilter} onChange={(event) => onStageChange(event.target.value)} className="h-9 rounded-md border border-[#e1e7e1] bg-[#fbfcfa] px-3 text-xs text-[#58655d] focus:border-[#7ca38b] focus:outline-none">
              <option value="ALL">All stages</option>
              <option value="BONDING">Bonding curve</option>
              <option value="GRADUATED_UNISWAP">Uniswap V3</option>
              <option value="HYPERCORE_SPOT">HyperCore spot</option>
              <option value="HIP3_PERP_LIVE">HIP-3 perps</option>
            </select>
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value as LaunchpadDashboardProps["sortBy"])} className="h-9 rounded-md border border-[#e1e7e1] bg-[#fbfcfa] px-3 text-xs text-[#58655d] focus:border-[#7ca38b] focus:outline-none">
              <option value="VOLUME">Sort: Volume</option>
              <option value="BONDING">Sort: Graduation</option>
              <option value="MCAP">Sort: Market cap</option>
              <option value="GAINERS">Sort: Performance</option>
            </select>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[#edf0ec] px-4 py-2 sm:px-5">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-[11px] font-medium transition ${categoryFilter === category.id ? "bg-[#e8f0e9] text-[#14573f]" : "text-[#79857d] hover:bg-[#f5f7f4] hover:text-[#24352b]"}`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Desktop market table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-[#fafbf9] text-[9px] font-semibold uppercase tracking-[0.13em] text-[#909a93]">
              <tr>
                <th className="px-5 py-3">Asset</th>
                <th className="px-3 py-3">Launch stage</th>
                <th className="px-3 py-3 text-right">Last price</th>
                <th className="px-3 py-3 text-right">24h</th>
                <th className="px-3 py-3 text-right">Volume</th>
                <th className="px-3 py-3 text-right">Market cap</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0ec]">
              {tokens.map((token) => {
                const stage = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
                const holding = holdings.find((item) => item.tokenId === token.id);
                return (
                  <tr key={token.id} onClick={() => onSelectToken(token)} className="group cursor-pointer transition hover:bg-[#f9fbf8]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/[0.06] text-[10px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3)}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-[#26352d]">{token.ticker}</span>
                            {token.isStockToken && <span className="rounded border border-[#dce8df] bg-[#f0f5f1] px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#577460]">Equity</span>}
                            {token.launchPaymentMethod === "X_MONEY" && <span className="text-[10px] text-[#728078]">𝕏</span>}
                          </span>
                          <span className="mt-0.5 block max-w-[220px] truncate text-[10px] text-[#87928a]">{token.name}{holding ? ` · ${holding.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} held` : ""}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex rounded px-2 py-1 text-[9px] font-medium ${token.stage === "BONDING" ? "bg-[#faf2df] text-[#8d6c31]" : token.stage === "GRADUATED_UNISWAP" ? "bg-[#f1ebf6] text-[#76548a]" : token.stage === "HIP3_PERP_LIVE" ? "bg-[#e7f1e9] text-[#286645]" : "bg-[#e9f0f5] text-[#496d82]"}`}>{stage.shortLabel}</span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs font-medium text-[#2a3930]">{price(token.priceUsd)}</td>
                    <td className={`px-3 py-3.5 text-right font-mono text-xs ${token.change24h >= 0 ? "text-[#347752]" : "text-[#b04b42]"}`}>
                      <span className="inline-flex items-center justify-end gap-0.5">{token.change24h >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(token.change24h).toFixed(2)}%</span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs text-[#58665e]">{money(token.volume24hUsd)}</td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs text-[#58665e]">{money(token.marketCapUsd)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button type="button" onClick={(event) => { event.stopPropagation(); token.stage === "HIP3_PERP_LIVE" ? onJumpToPerps(token) : onSelectToken(token); }} className="inline-flex h-8 items-center gap-1.5 rounded border border-[#dfe6df] bg-white px-2.5 text-[10px] font-semibold text-[#3d5d49] opacity-80 transition hover:border-[#9ab4a0] hover:bg-[#f1f6f2] hover:text-[#14573f] group-hover:opacity-100">
                        {token.stage === "HIP3_PERP_LIVE" ? "Trade perp" : "Open market"}<ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tokens.length === 0 && <div className="px-5 py-12 text-center text-sm text-[#7c8980]">No assets match these filters.</div>}
        </div>

        {/* Mobile market cards */}
        <div className="divide-y divide-[#edf0ec] md:hidden">
          {tokens.map((token) => {
            const stage = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
            return (
              <button key={token.id} type="button" onClick={() => onSelectToken(token)} className="w-full px-4 py-4 text-left transition hover:bg-[#f9fbf8]">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3)}</span>
                    <span className="min-w-0"><span className="block text-xs font-semibold text-[#26352d]">{token.ticker} <span className="font-normal text-[#89948d]">· {token.name}</span></span><span className="mt-1 inline-flex rounded bg-[#f0f3ef] px-1.5 py-0.5 text-[9px] text-[#64736a]">{stage.shortLabel}</span></span>
                  </span>
                  <span className="text-right"><span className="block font-mono text-xs font-semibold text-[#29382f]">{price(token.priceUsd)}</span><span className={`font-mono text-[10px] ${token.change24h >= 0 ? "text-[#347752]" : "text-[#b04b42]"}`}>{token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%</span></span>
                </span>
                <span className="mt-3 flex items-center justify-between pl-[47px] font-mono text-[10px] text-[#869189]"><span>Volume {money(token.volume24hUsd)}</span><span>Market cap {money(token.marketCapUsd)}</span><ArrowRight className="h-3 w-3 text-[#789080]" /></span>
              </button>
            );
          })}
          {tokens.length === 0 && <div className="px-5 py-12 text-center text-sm text-[#7c8980]">No assets match these filters.</div>}
        </div>
      </section>

      {/* Lifecycle explainer */}
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#829087]">Built around graduation</div><h2 className="mt-1 font-display text-lg font-semibold text-[#233229]">One asset. A clear path to deeper markets.</h2></div>
            <button type="button" onClick={() => onSelectTab("LIFECYCLE_PIPELINE")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#246547] hover:text-[#143c2b]">View lifecycle <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            {[
              { n: "01", title: "Create", detail: "Deploy on Elysium", color: "#55745d" },
              { n: "02", title: "Build liquidity", detail: "Bonding curve trading", color: "#8a754e" },
              { n: "03", title: "Graduate", detail: "Uniswap V3 · SELESAI", color: "#80689a" },
              { n: "04", title: "Expand", detail: "HIP-1 → HyperCore → HIP-3", color: "#3f7480" },
            ].map((step, index) => (
              <div key={step.n} className="relative rounded-md border border-[#e8ece7] bg-[#fbfcfa] p-3.5">
                <div className="flex items-center justify-between"><span className="font-mono text-[9px] text-[#9aa49d]">{step.n}</span><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: step.color }} /></div>
                <div className="mt-3 text-xs font-semibold text-[#2c3a31]">{step.title}</div>
                <div className="mt-1 text-[10px] leading-4 text-[#808b83]">{step.detail}</div>
                {index < 3 && <ArrowRight className="absolute -right-[11px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-[#aeb8b0] sm:block" />}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-[#e9eee8] p-5 sm:p-6">
          <div><div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#477157]"><ShieldCheck className="h-4 w-4" /></div><h3 className="mt-4 font-display text-base font-semibold text-[#26372c]">Ready for stock tokens</h3><p className="mt-2 text-xs leading-5 text-[#67766b]">Explore tokenized equities with oracle details and a dedicated HIP-3 perpetuals market.</p></div>
          <button type="button" onClick={() => onSelectTab("STOCK_TOKENS")} className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#d0ddd1] bg-white px-3 text-xs font-semibold text-[#315c3f] transition hover:border-[#abc5b0]">Explore xStocks <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </section>
    </div>
  );
}
