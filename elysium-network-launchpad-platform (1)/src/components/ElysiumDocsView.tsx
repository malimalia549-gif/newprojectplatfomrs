"use client";

import React, { useState } from "react";
import { ArrowUpRight, BookOpenText, Check, Copy, GitBranch, Info, Layers3, LockKeyhole, Network, ShieldAlert, Wallet } from "lucide-react";

const networkRows = [
  { label: "Network", value: "Elysium Testnet" },
  { label: "Chain ID", value: "99801", copy: "99801" },
  { label: "RPC endpoint", value: "https://testnet-rpc.elysium.kinetiq.xyz", copy: "https://testnet-rpc.elysium.kinetiq.xyz" },
  { label: "Explorer", value: "elysium.kinetiq.xyz/testnet-explorer", copy: "https://elysium.kinetiq.xyz/testnet-explorer" },
  { label: "Gas asset", value: "Native HYPE" },
  { label: "Settlement", value: "HyperEVM testnet · chain 998" },
  { label: "EVM stack", value: "Arbitrum Orbit / Nitro" },
  { label: "Mainnet chain ID", value: "Not published in this app" },
];

export function ElysiumDocsView() {
  const [copied, setCopied] = useState<string | null>(null);
  const copyValue = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(null), 1600); }
    catch { setCopied(null); }
  };

  return (
    <div className="animate-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="ui-overline flex items-center gap-2"><BookOpenText className="h-3.5 w-3.5" /> DEVELOPER RESOURCES</div><h1 className="mt-2 font-display text-[30px] font-medium text-[#f0f5f1] sm:text-[38px]">The Elysium field guide.</h1><p className="mt-2 max-w-2xl text-[13px] leading-[1.7] text-[#91a49a]">Network configuration, asset movement, and platform integration—organized for builders preparing for mainnet.</p></div><a href="https://elysium.kinetiq.xyz/docs/what-is-elysium" target="_blank" rel="noreferrer" className="ui-btn-secondary !min-h-9 !text-[11px]">Official Elysium docs <ArrowUpRight className="h-3.5 w-3.5" /></a></div>

      <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="ui-card hidden p-4 lg:sticky lg:top-[155px] lg:block"><div className="ui-overline mb-3 px-2">ON THIS PAGE</div><nav className="space-y-1" aria-label="Documentation sections">{[{ id: "network", label: "Network configuration" }, { id: "architecture", label: "Architecture" }, { id: "lifecycle", label: "Token lifecycle" }, { id: "payments", label: "Payment readiness" }, { id: "sandbox", label: "Sandbox disclosure" }].map((section) => <a key={section.id} href={`#${section.id}`} className="block rounded-lg px-2.5 py-2 text-[11px] font-medium text-[#8fa498] transition hover:bg-[#24382e] hover:text-[#d6e9db]">{section.label}</a>)}</nav></aside>
        <div className="space-y-5">
          <section id="network" className="ui-card scroll-mt-40 overflow-hidden"><div className="flex items-center gap-3 border-b border-[#26353b] px-5 py-4 sm:px-6"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#21382c] text-[#bce5c9]"><Network className="h-4 w-4" /></span><div><div className="ui-overline">01 / CONNECT</div><h2 className="mt-1 font-display text-[18px] font-medium">Testnet configuration</h2></div></div><div className="divide-y divide-[#223137] px-5 sm:px-6">{networkRows.map((row) => <div key={row.label} className="flex min-h-[44px] items-center justify-between gap-4 py-2"><span className="shrink-0 text-[11px] text-[#8ea197]">{row.label}</span><div className="flex min-w-0 items-center gap-2"><span className="truncate text-right font-mono text-[10px] text-[#d4e3d7] sm:text-[11px]">{row.value}</span>{row.copy && <button type="button" onClick={() => copyValue(row.label, row.copy!)} aria-label={`Copy ${row.label}`} title={`Copy ${row.label}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#34484a] text-[#98b4a5] transition hover:bg-[#264033]">{copied === row.label ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>}</div></div>)}</div></section>

          <section id="architecture" className="ui-card scroll-mt-40 p-5 sm:p-6"><div className="ui-overline">02 / ARCHITECTURE</div><h2 className="mt-2 font-display text-[20px] font-medium">Designed for the Hyperliquid ecosystem</h2><p className="mt-3 text-[12px] leading-[1.8] text-[#92a79a]">Elysium is a Kinetiq-built Arbitrum Orbit chain designed to settle to HyperEVM and work alongside HyperCore. HYPE is the native gas asset. Mainnet parameters and upgrade timing must be checked against current official documentation before deployment.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[{ label: "Execution", text: "EVM-compatible Arbitrum Orbit environment", icon: <Layers3 className="h-4 w-4" /> }, { label: "Settlement", text: "HyperEVM is the settlement layer", icon: <Network className="h-4 w-4" /> }, { label: "Gas", text: "Native HYPE bridges as value", icon: <Wallet className="h-4 w-4" /> }].map((item) => <div key={item.label} className="ui-card-soft p-4"><div className="text-[#a8d4b6]">{item.icon}</div><h3 className="mt-3 text-[12px] font-semibold text-[#e6eee7]">{item.label}</h3><p className="mt-1 text-[11px] leading-[1.6] text-[#869a8e]">{item.text}</p></div>)}</div></section>

          <section id="lifecycle" className="ui-card scroll-mt-40 p-5 sm:p-6"><div className="ui-overline">03 / LIFECYCLE</div><h2 className="mt-2 font-display text-[20px] font-medium">From liquidity to orderbooks</h2><p className="mt-3 text-[12px] leading-[1.8] text-[#92a79a]">An Elysium-origin token can be mirrored to HyperEVM. A separately configured deposit-wallet linkage can support a HyperCore spot asset after the HIP-1 deployment process. HIP-3 builder-deployed perpetual markets have independent staking, oracle, and risk requirements.</p><div className="mt-4 space-y-2">{[{ n: "01", title: "Launch and trade", detail: "Create a token and establish early liquidity on Elysium." }, { n: "02", title: "Complete the pool stage", detail: "Move to an AMM pool, or stop here for a pool-only asset." }, { n: "03", title: "Acquire a spot ticker", detail: "HIP-1 auction and mirror/deposit-wallet preparations." }, { n: "04", title: "Add perpetuals", detail: "Independent HIP-3 market deployment and ongoing oracle operations." }].map((item) => <div key={item.n} className="ui-card-soft flex items-start gap-3 p-3"><span className="font-mono text-[11px] text-[#9fcfac]">{item.n}</span><div><div className="text-[12px] font-semibold text-[#e5eee7]">{item.title}</div><p className="mt-0.5 text-[10px] leading-[1.6] text-[#85998b]">{item.detail}</p></div></div>)}</div><a href="https://elysium.kinetiq.xyz/docs/token-bridging-on-elysium" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#b3ebc9] hover:text-white"><GitBranch className="h-3.5 w-3.5" /> Read official bridging documentation <ArrowUpRight className="h-3.5 w-3.5" /></a></section>

          <section id="payments" className="ui-card scroll-mt-40 p-5 sm:p-6"><div className="ui-overline">04 / PAYMENT READINESS</div><h2 className="mt-2 font-display text-[20px] font-medium">X Money is a planned payment concept</h2><p className="mt-3 text-[12px] leading-[1.8] text-[#92a79a]">This application includes a simulated X Money checkout rail to prototype the creator experience. It does not connect to X Money, Visa, a bank, or a merchant API. Any real integration would require an official API, authorization, compliance review, and verified settlement flow.</p><div className="ui-card-soft mt-4 flex items-start gap-3 p-4"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#b6d7bd]" /><p className="text-[11px] leading-[1.7] text-[#a2b5a8]">No real card credentials are collected. All balances, payment receipts, and rebates are sandbox entries in the application database.</p></div></section>

          <section id="sandbox" className="scroll-mt-40 rounded-[13px] border border-[#5b4e38] bg-[#282318] p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#dac08a]" /><div><h2 className="font-display text-[16px] font-medium text-[#ebddbb]">Important sandbox disclosure</h2><p className="mt-2 text-[11px] leading-[1.8] text-[#b9ac8d]">Market prices, chart candles, orderbook depth, token contracts, stock-token metadata, bridging, ticker auctions, perpetual order execution, and payment receipts in this prototype are simulated. The interface is a functional product demonstration, not an on-chain trading venue or a verified equity offering.</p></div></div></section>
          <div className="flex items-start gap-2 text-[10px] leading-[1.6] text-[#758a7b]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Always verify network parameters and regulatory requirements with the relevant official sources before mainnet use.</div>
        </div>
      </div>
    </div>
  );
}
