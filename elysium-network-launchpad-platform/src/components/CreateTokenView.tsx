"use client";

import React, { useState } from "react";
import { Building2, Check, CreditCard, Loader2, Plus, Rocket, ShieldCheck } from "lucide-react";
import { TOKEN_CREATE_FEE_HYPE } from "@/lib/constants";
import type { PlatformToken, UserProfile } from "@/types/platform";

interface CreateTokenViewProps {
  user: UserProfile | null;
  hypePriceUsd: number;
  defaultCategory?: string;
  onTokenCreated: (token: PlatformToken, receipt: string | null) => void;
  onRequireAuth: () => void;
}

const presets = [
  { name: "Elysium Amazon xStock", ticker: "eAMZNx", underlying: "AMZN", exchange: "NASDAQ", price: 214.5, isin: "US0231351067", color: "#b8863b" },
  { name: "Elysium Palantir xStock", ticker: "ePLTRx", underlying: "PLTR", exchange: "NASDAQ", price: 96.4, isin: "US69608A1088", color: "#547c8b" },
  { name: "Elysium Meta xStock", ticker: "eMETAx", underlying: "META", exchange: "NASDAQ", price: 612.8, isin: "US30303M1027", color: "#536b9c" },
  { name: "OpenAI Pre-IPO xStock", ticker: "eOPENAI", underlying: "OPENAI", exchange: "PRE-IPO SECONDARY", price: 168, isin: "US-PREIPO-OAI1", color: "#38745b" },
];
const colors = ["#176b4d", "#547c8b", "#80689a", "#b8863b", "#ab5a4d", "#536b9c", "#4b7774"];

export function CreateTokenView({ user, hypePriceUsd, defaultCategory = "CRYPTO", onTokenCreated, onRequireAuth }: CreateTokenViewProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [logoColor, setLogoColor] = useState("#176b4d");
  const [targetPath, setTargetPath] = useState<"FULL_HIP3_PIPELINE" | "UNISWAP_ONLY">("FULL_HIP3_PIPELINE");
  const [graduationTargetHype, setGraduationTargetHype] = useState("500");
  const [initialBuyHype, setInitialBuyHype] = useState("25");
  const [maxLeverage, setMaxLeverage] = useState(25);
  const [underlyingTicker, setUnderlyingTicker] = useState("AMZN");
  const [underlyingExchange, setUnderlyingExchange] = useState("NASDAQ");
  const [referenceStockPriceUsd, setReferenceStockPriceUsd] = useState("214.50");
  const [isinCode, setIsinCode] = useState("US0231351067");
  const [paymentMethod, setPaymentMethod] = useState<"X_MONEY" | "HYPE" | "USDC" | "KHYPE">("X_MONEY");
  const [xMoneyRail, setXMoneyRail] = useState<"X_VISA_VIRTUAL_CARD" | "X_MONEY_P2P" | "X_PASSKEY_INSTANT">("X_VISA_VIRTUAL_CARD");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStock = category === "STOCK_TOKEN";
  const buyHype = Math.max(0, Number(initialBuyHype) || 0);
  const totalHype = TOKEN_CREATE_FEE_HYPE + buyHype;
  const totalUsd = totalHype * hypePriceUsd;
  const cashback = paymentMethod === "X_MONEY" && xMoneyRail === "X_VISA_VIRTUAL_CARD" ? totalUsd * 0.03 : 0;

  const applyPreset = (preset: (typeof presets)[number]) => {
    setCategory("STOCK_TOKEN"); setName(preset.name); setTicker(preset.ticker); setUnderlyingTicker(preset.underlying); setUnderlyingExchange(preset.exchange); setReferenceStockPriceUsd(String(preset.price)); setIsinCode(preset.isin); setLogoColor(preset.color); setMaxLeverage(20);
    setDescription(`Tokenized ${preset.underlying} equity on Elysium with market-specific disclosures, oracle reference data and an optional HyperCore HIP-3 perpetual market.`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setErrorMsg(null);
    if (!user) { onRequireAuth(); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/tokens/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, ticker, category, description, logoColor, targetPath, graduationTargetHype: Number(graduationTargetHype) || 500, initialBuyHype: buyHype, maxLeverage, isStockToken: isStock, underlyingTicker, underlyingExchange, referenceStockPriceUsd: Number(referenceStockPriceUsd) || 150, isinCode, paymentMethod, xMoneyRail, twitterUrl, websiteUrl }) });
      const data = await response.json();
      if (!response.ok) { setErrorMsg(data.error || "Failed to deploy token"); return; }
      onTokenCreated(data.token, data.xMoneyReceiptCode || null);
    } catch { setErrorMsg("Network error while submitting asset"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#78867d]"><Rocket className="h-3.5 w-3.5 text-[#587c61]" /> Elysium issuer studio</div><h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.035em] text-[#1e2d24] sm:text-[2rem]">Create an asset</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-[#758179]">Configure the asset, choose how it graduates and review settlement before deploying to the Elysium test environment.</p></div>
        <div className="rounded-md border border-[#e1e7e0] bg-white px-3 py-2 font-mono text-[10px] text-[#66746a]">Network · Elysium 99801</div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-[#29382f]">Asset details</h2><p className="mt-1 text-[11px] text-[#87928a]">Select a market type and define its public identity.</p></div><span className="font-mono text-[9px] text-[#a0a9a2]">01 / 03</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[{ id: "CRYPTO", label: "Crypto" }, { id: "STOCK_TOKEN", label: "Equity token" }, { id: "AI_AGENT", label: "AI agent" }, { id: "DEFI", label: "DeFi" }].map((type) => <button key={type.id} type="button" onClick={() => { setCategory(type.id); if (type.id === "STOCK_TOKEN") setMaxLeverage(20); }} className={`rounded-md border px-3 py-2.5 text-left transition ${category === type.id ? "border-[#8fac98] bg-[#f1f6f1] text-[#22583c]" : "border-[#e6eae5] bg-white text-[#737f77] hover:bg-[#fafbf9]"}`}><span className="block text-[11px] font-semibold">{type.label}</span><span className="mt-0.5 block text-[9px] text-[#929c95]">{type.id === "STOCK_TOKEN" ? "xStocks / RWA" : type.id === "AI_AGENT" ? "Agent markets" : type.id === "DEFI" ? "Onchain protocol" : "ERC-20 asset"}</span></button>)}
            </div>
            {isStock && <div className="mt-4 rounded-md border border-[#e2e9e2] bg-[#f8faf7] p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#526c59]"><Building2 className="h-3.5 w-3.5" />Start from an equity template</div><div className="mt-2 flex flex-wrap gap-1.5">{presets.map((preset) => <button key={preset.ticker} type="button" onClick={() => applyPreset(preset)} className="rounded border border-[#e1e7e0] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#59685e] transition hover:border-[#9bb4a1] hover:text-[#24583c]">{preset.ticker}<span className="ml-1 text-[#9aa49d]">{preset.exchange}</span></button>)}</div></div>}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="block"><span className="mb-1.5 block text-[10px] font-medium text-[#66736b]">Asset name *</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={isStock ? "Elysium Amazon xStock" : "Example Protocol"} className="h-10 w-full rounded-md border border-[#dfe5df] bg-white px-3 text-xs text-[#26352d] placeholder:text-[#a6aea8] focus:border-[#7ca38b] focus:outline-none focus:ring-2 focus:ring-[#176b4d]/10" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-medium text-[#66736b]">Ticker *</span><input required maxLength={10} value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} placeholder={isStock ? "eAMZNx" : "ASSET"} className="h-10 w-full rounded-md border border-[#dfe5df] bg-white px-3 font-mono text-xs text-[#315d43] placeholder:text-[#a6aea8] focus:border-[#7ca38b] focus:outline-none focus:ring-2 focus:ring-[#176b4d]/10" /></label>
            </div>
            {isStock && <div className="mt-3 grid gap-3 sm:grid-cols-4"><label><span className="mb-1 block text-[9px] text-[#7f8b82]">Underlying ticker</span><input value={underlyingTicker} onChange={(event) => setUnderlyingTicker(event.target.value.toUpperCase())} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-2.5 font-mono text-[10px]" /></label><label><span className="mb-1 block text-[9px] text-[#7f8b82]">Exchange</span><select value={underlyingExchange} onChange={(event) => setUnderlyingExchange(event.target.value)} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-2.5 text-[10px]"><option>NASDAQ</option><option>NYSE</option><option>PRE-IPO SECONDARY</option><option>INDEX / ETF</option></select></label><label><span className="mb-1 block text-[9px] text-[#7f8b82]">Reference price</span><input type="number" step="any" value={referenceStockPriceUsd} onChange={(event) => setReferenceStockPriceUsd(event.target.value)} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-2.5 font-mono text-[10px]" /></label><label><span className="mb-1 block text-[9px] text-[#7f8b82]">ISIN / reference</span><input value={isinCode} onChange={(event) => setIsinCode(event.target.value)} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-2.5 font-mono text-[10px]" /></label></div>}
            <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-medium text-[#66736b]">Description *</span><textarea required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the asset, its utility or the relevant equity reference and disclosures." className="w-full resize-y rounded-md border border-[#dfe5df] bg-white px-3 py-2.5 text-xs leading-5 text-[#26352d] placeholder:text-[#a6aea8] focus:border-[#7ca38b] focus:outline-none focus:ring-2 focus:ring-[#176b4d]/10" /></label>
            <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_1fr]"><div><span className="mb-1.5 block text-[10px] font-medium text-[#66736b]">Brand mark</span><div className="flex h-9 items-center gap-2 rounded-md border border-[#e3e8e2] bg-[#fbfcfa] px-2">{colors.map((color) => <button key={color} type="button" aria-label={`Choose ${color}`} onClick={() => setLogoColor(color)} className={`h-4 w-4 rounded-full ${logoColor === color ? "ring-2 ring-[#405f4a] ring-offset-2" : ""}`} style={{ backgroundColor: color }} />)}</div></div><label><span className="mb-1.5 block text-[10px] font-medium text-[#66736b]">X profile (optional)</span><input value={twitterUrl} onChange={(event) => setTwitterUrl(event.target.value)} placeholder="https://x.com/project" className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-3 text-[10px]" /></label><label><span className="mb-1.5 block text-[10px] font-medium text-[#66736b]">Website (optional)</span><input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://project.xyz" className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-3 text-[10px]" /></label></div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-[#29382f]">Graduation route</h2><p className="mt-1 text-[11px] text-[#87928a]">Choose the intended path once the bonding curve reaches its target.</p></div><span className="font-mono text-[9px] text-[#a0a9a2]">02 / 03</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setTargetPath("FULL_HIP3_PIPELINE")} className={`rounded-md border p-3.5 text-left transition ${targetPath === "FULL_HIP3_PIPELINE" ? "border-[#8fac98] bg-[#f2f7f2]" : "border-[#e6eae5] bg-white hover:bg-[#fafbf9]"}`}><span className="flex items-center justify-between text-[11px] font-semibold text-[#30443a]">Full market lifecycle{targetPath === "FULL_HIP3_PIPELINE" && <Check className="h-3.5 w-3.5 text-[#39724e]" />}</span><span className="mt-1.5 block text-[10px] leading-4 text-[#7b877f]">Create → bonding curve → Uniswap V3 → HIP-1 ticker → HyperCore spot → HIP-3 perpetual.</span></button>
              <button type="button" onClick={() => setTargetPath("UNISWAP_ONLY")} className={`rounded-md border p-3.5 text-left transition ${targetPath === "UNISWAP_ONLY" ? "border-[#8fac98] bg-[#f2f7f2]" : "border-[#e6eae5] bg-white hover:bg-[#fafbf9]"}`}><span className="flex items-center justify-between text-[11px] font-semibold text-[#30443a]">Uniswap pool only{targetPath === "UNISWAP_ONLY" && <Check className="h-3.5 w-3.5 text-[#39724e]" />}</span><span className="mt-1.5 block text-[10px] leading-4 text-[#7b877f]">Create → bonding curve → Elysium Uniswap V3 pool → SELESAI.</span></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><label><span className="mb-1.5 block text-[10px] text-[#66736b]">Graduation target (HYPE)</span><input type="number" min={100} max={5000} value={graduationTargetHype} onChange={(event) => setGraduationTargetHype(event.target.value)} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-3 font-mono text-xs" /></label><label><span className="mb-1.5 block text-[10px] text-[#66736b]">Initial buy (HYPE)</span><input type="number" min={0} step="any" value={initialBuyHype} onChange={(event) => setInitialBuyHype(event.target.value)} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-3 font-mono text-xs" /></label><label><span className="mb-1.5 block text-[10px] text-[#66736b]">Perpetual leverage cap</span><select value={maxLeverage} onChange={(event) => setMaxLeverage(Number(event.target.value))} className="h-9 w-full rounded-md border border-[#dfe5df] bg-white px-3 text-xs">{[5, 10, 15, 20, 25, 30, 50].map((value) => <option key={value} value={value}>{value}× maximum</option>)}</select></label></div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-[#29382f]">Settlement</h2><p className="mt-1 text-[10px] text-[#87928a]">Choose your preferred payment rail.</p></div><CreditCard className="h-4 w-4 text-[#66836f]" /></div>
            <div className="mt-4 space-y-1.5">{[{ id: "X_MONEY", name: "𝕏 Money", detail: "Visa, P2P or Passkey" }, { id: "HYPE", name: "Native HYPE", detail: "Elysium gas asset" }, { id: "USDC", name: "USDC", detail: "Stablecoin settlement" }, { id: "KHYPE", name: "kHYPE", detail: "Liquid staked HYPE" }].map((rail) => <button key={rail.id} type="button" onClick={() => setPaymentMethod(rail.id as typeof paymentMethod)} className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition ${paymentMethod === rail.id ? "border-[#96b29e] bg-[#f3f7f3]" : "border-[#e7ebe6] bg-white hover:bg-[#fafbf9]"}`}><span><span className="block text-[11px] font-semibold text-[#34443a]">{rail.name}</span><span className="mt-0.5 block text-[9px] text-[#87928a]">{rail.detail}</span></span>{paymentMethod === rail.id && <Check className="h-3.5 w-3.5 text-[#39724e]" />}</button>)}</div>
            {paymentMethod === "X_MONEY" && <div className="mt-3 rounded-md border border-[#e6e9e3] bg-[#fafbf9] p-3"><div className="text-[10px] font-semibold text-[#4a5d50]">𝕏 Money method</div><div className="mt-2 grid grid-cols-1 gap-1">{[{ id: "X_VISA_VIRTUAL_CARD", label: "Virtual Visa · 3% cashback" }, { id: "X_MONEY_P2P", label: "P2P · @handle" }, { id: "X_PASSKEY_INSTANT", label: "Passkey Express" }].map((rail) => <button key={rail.id} type="button" onClick={() => setXMoneyRail(rail.id as typeof xMoneyRail)} className={`rounded px-2.5 py-2 text-left text-[9px] ${xMoneyRail === rail.id ? "bg-[#e9f0e9] font-semibold text-[#315e40]" : "text-[#78847c] hover:bg-white"}`}>{rail.label}</button>)}</div></div>}
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#29382f]">Review deployment</h2><span className="font-mono text-[9px] text-[#9aa39d]">03 / 03</span></div>
            <div className="mt-4 space-y-3 text-[10px]"><div className="flex justify-between"><span className="text-[#7d8981]">Factory deployment fee</span><span className="font-mono text-[#47564c]">{TOKEN_CREATE_FEE_HYPE} HYPE</span></div><div className="flex justify-between"><span className="text-[#7d8981]">Initial curve buy</span><span className="font-mono text-[#47564c]">{buyHype.toFixed(2)} HYPE</span></div><div className="flex justify-between"><span className="text-[#7d8981]">Market lifecycle</span><span className="text-right font-medium text-[#53685a]">{targetPath === "UNISWAP_ONLY" ? "Uniswap · SELESAI" : "HyperCore + HIP-3"}</span></div><div className="border-t border-[#edf0ec] pt-3"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-[#34443a]">Estimated total</span><span className="font-mono text-sm font-semibold text-[#286143]">{paymentMethod === "HYPE" || paymentMethod === "KHYPE" ? `${totalHype.toFixed(2)} ${paymentMethod}` : `$${totalUsd.toFixed(2)}`}</span></div>{paymentMethod === "X_MONEY" && <div className="mt-1 flex justify-between text-[9px] text-[#528060]"><span>Estimated Visa cashback</span><span>−${cashback.toFixed(2)}</span></div>}</div></div>
            {errorMsg && <div className="mt-3 rounded-md border border-[#efd8d3] bg-[#fff7f5] px-3 py-2 text-[10px] text-[#a34e42]">{errorMsg}</div>}
            <button type="submit" disabled={loading} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#176b4d] text-xs font-semibold text-white transition hover:bg-[#125a40] disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{loading ? "Submitting asset…" : user ? `Deploy ${ticker || "asset"}` : "Sign in to deploy"}</button>
            <div className="mt-3 flex items-start gap-2 text-[9px] leading-4 text-[#89948d]"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#77917d]" /><span>Test environment only. Equity tokens require accurate disclosures and compliant backing arrangements.</span></div>
          </section>
        </aside>
      </form>
    </div>
  );
}
