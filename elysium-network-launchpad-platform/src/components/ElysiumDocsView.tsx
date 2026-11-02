"use client";

import React, { useState } from "react";
import { Check, Copy, Cpu, CreditCard, FileCode2, GitBranch, Layers, ShieldCheck, Zap } from "lucide-react";

export function ElysiumDocsView() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyText = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1500); } catch { setCopiedKey(null); }
  };
  const configRows = [
    { key: "Network", value: "Elysium Testnet" },
    { key: "Chain ID", value: "99801 (0x185d9)", copy: "99801" },
    { key: "RPC", value: "https://testnet-rpc.elysium.kinetiq.xyz", copy: "https://testnet-rpc.elysium.kinetiq.xyz" },
    { key: "Explorer", value: "elysium.kinetiq.xyz/testnet-explorer", copy: "https://elysium.kinetiq.xyz/testnet-explorer" },
    { key: "Stack", value: "Arbitrum Orbit · Nitro / ArbOS" },
    { key: "Settlement", value: "HyperEVM · testnet 998 / mainnet 999" },
    { key: "Native gas", value: "HYPE · native value · 1:1 bridge" },
    { key: "Block time", value: "~100–200ms target · ~300ms receipt" },
  ];

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><div className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#78867d]"><FileCode2 className="h-3.5 w-3.5 text-[#587c61]" /> Technical reference</div><h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-[#1e2d24] sm:text-[2rem]">Elysium network &amp; integration notes</h1><p className="mt-2 max-w-3xl text-xs leading-5 text-[#758179]">A concise builder reference for the Elysium testnet, its HyperEVM settlement relationship, token bridging and the intended HyperCore lifecycle.</p></div>
          <span className="rounded-md border border-[#dfe8df] bg-[#f4f7f3] px-3 py-2 font-mono text-[10px] text-[#52745c]">TESTNET · 99801</span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#edf0ec] px-5 py-4"><Cpu className="h-4 w-4 text-[#55775e]" /><div><h2 className="text-xs font-semibold text-[#29382f]">Connect to testnet</h2><p className="mt-0.5 text-[10px] text-[#87928a]">Use a compatible EVM wallet.</p></div></div>
          <div className="divide-y divide-[#edf0ec] px-5">{configRows.map((row) => <div key={row.key} className="flex min-h-10 items-center justify-between gap-3 py-2"><span className="shrink-0 text-[10px] text-[#849087]">{row.key}</span><span className="flex min-w-0 items-center gap-1.5 text-right font-mono text-[9px] text-[#47564c]"><span className="truncate">{row.value}</span>{row.copy && <button type="button" onClick={() => copyText(row.key, row.copy!)} title={`Copy ${row.key}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#e3e8e2] text-[#748078] hover:bg-[#f4f7f3]">{copiedKey === row.key ? <Check className="h-3 w-3 text-[#38714c]" /> : <Copy className="h-3 w-3" />}</button>}</span></div>)}</div>
          <div className="m-4 rounded-md border border-[#e8ece7] bg-[#fafbf9] p-3 text-[10px] leading-4 text-[#758179]">Mainnet RPC, chain identifier and deployment addresses must be confirmed against current official release information before production use.</div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#edf0ec] px-5 py-4"><Zap className="h-4 w-4 text-[#9b8153]" /><div><h2 className="text-xs font-semibold text-[#29382f]">Deployment phases</h2><p className="mt-0.5 text-[10px] text-[#87928a]">Roadmap capabilities require network confirmation.</p></div></div>
          <div className="space-y-3 p-5">
            {[
              { label: "01 · Genesis", title: "EVM-compatible chain launch", detail: "Arbitrum Orbit execution, HYPE gas, HyperEVM settlement, AnyTrust data availability and token bridge surfaces.", tone: "#587a60" },
              { label: "02 · Network upgrade", title: "HyperCore read and write edge", detail: "Market-data precompile and ElysiumCoreWriter capabilities are roadmap-dependent; verify activation before relying on them.", tone: "#657c8a" },
              { label: "03 · Hardening", title: "Sequencing and proving", detail: "Sequencer decentralization, MEV controls and permissionless proving may evolve as the network matures.", tone: "#907b55" },
            ].map((item) => <div key={item.label} className="flex gap-3 rounded-md border border-[#edf0ec] p-3"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.tone }} /><div><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#859087]">{item.label}</div><h3 className="mt-1 text-[11px] font-semibold text-[#36463c]">{item.title}</h3><p className="mt-1 text-[10px] leading-4 text-[#7c8880]">{item.detail}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { icon: <GitBranch className="h-4 w-4" />, label: "Token bridge & lifecycle", text: "An Elysium-native token may mirror to HyperEVM and use a deposit-wallet flow for HyperCore spot. Confirm contract deployment, permissions and finality for the specific route." },
          { icon: <Layers className="h-4 w-4" />, label: "HIP-1 & HIP-3", text: "HIP-1 controls native spot ticker rights. HIP-3 enables builder-deployed perpetual markets under protocol-specific stake, auction, oracle and risk rules." },
          { icon: <CreditCard className="h-4 w-4" />, label: "X Money checkout", text: "This prototype records simulated X Money, card and P2P receipts. No official X Money merchant API or real payment settlement is connected." },
        ].map((item) => <article key={item.label} className="panel p-5"><div className="flex h-8 w-8 items-center justify-center rounded bg-[#edf3ee] text-[#55765e]">{item.icon}</div><h2 className="mt-3 text-xs font-semibold text-[#34443a]">{item.label}</h2><p className="mt-2 text-[10px] leading-5 text-[#78847c]">{item.text}</p></article>)}
      </section>

      <section className="rounded-lg border border-[#e7e2d4] bg-[#f7f5ee] p-4 sm:p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#927a4e]" /><div><h2 className="text-xs font-semibold text-[#524a38]">Testnet demonstration notice</h2><p className="mt-1 text-[10px] leading-5 text-[#776f5e]">This platform currently demonstrates product flows with seeded data and simulated balances. The X Money rail, stock-token backing/oracles, market prices, bridges, auctions and HIP-3 order execution are not represented as live integrations. Verify all official Elysium and Hyperliquid documentation before production deployment.</p></div></div></section>
    </div>
  );
}
