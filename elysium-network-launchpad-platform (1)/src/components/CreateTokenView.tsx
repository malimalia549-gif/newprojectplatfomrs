"use client";

import React, { useState } from "react";
import { ArrowRight, Check, ChevronRight, CircleHelp, CreditCard, Info, Loader2, Plus, Shapes, ShieldAlert, Sparkles } from "lucide-react";
import { TOKEN_CREATE_FEE_HYPE } from "@/lib/constants";
import type { PlatformToken, UserProfile } from "@/types/platform";

interface CreateTokenViewProps {
  user: UserProfile | null;
  hypePriceUsd: number;
  defaultCategory?: string;
  onTokenCreated: (token: PlatformToken, receipt: string | null) => void;
  onRequireAuth: () => void;
}

const stockTemplates = [
  { name: "Amazon Stock Token", ticker: "eAMZNx", underlying: "AMZN", exchange: "NASDAQ", price: 214.5, isin: "US0231351067", color: "#bc915a" },
  { name: "Palantir Stock Token", ticker: "ePLTRx", underlying: "PLTR", exchange: "NASDAQ", price: 96.4, isin: "US69608A1088", color: "#74899c" },
  { name: "Meta Stock Token", ticker: "eMETAx", underlying: "META", exchange: "NASDAQ", price: 612.8, isin: "US30303M1027", color: "#6f82b0" },
  { name: "OpenAI Pre-IPO Concept", ticker: "eOPENAI", underlying: "OPENAI", exchange: "PRE-IPO SECONDARY", price: 168, isin: "SAMPLE-PREIPO", color: "#4d9779" },
];
const logoColors = ["#4c9774", "#7286ac", "#a67baf", "#bc915a", "#ab756a", "#5a9aa7"];

export function CreateTokenView({ user, hypePriceUsd, defaultCategory = "CRYPTO", onTokenCreated, onRequireAuth }: CreateTokenViewProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [logoColor, setLogoColor] = useState("#4c9774");
  const [targetPath, setTargetPath] = useState<"FULL_HIP3_PIPELINE" | "UNISWAP_ONLY">("FULL_HIP3_PIPELINE");
  const [graduationTargetHype, setGraduationTargetHype] = useState("500");
  const [initialBuyHype, setInitialBuyHype] = useState("25");
  const [maxLeverage, setMaxLeverage] = useState(25);
  const [underlyingTicker, setUnderlyingTicker] = useState("");
  const [underlyingExchange, setUnderlyingExchange] = useState("NASDAQ");
  const [referenceStockPriceUsd, setReferenceStockPriceUsd] = useState("");
  const [isinCode, setIsinCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"HYPE" | "USDC" | "KHYPE" | "X_MONEY">("HYPE");
  const [xMoneyRail, setXMoneyRail] = useState<"X_VISA_VIRTUAL_CARD" | "X_MONEY_P2P" | "X_PASSKEY_INSTANT">("X_VISA_VIRTUAL_CARD");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStock = category === "STOCK_TOKEN";
  const initialBuy = Math.max(0, Number(initialBuyHype) || 0);
  const totalHype = TOKEN_CREATE_FEE_HYPE + initialBuy;
  const totalUsd = totalHype * hypePriceUsd;
  const rebate = paymentMethod === "X_MONEY" && xMoneyRail === "X_VISA_VIRTUAL_CARD" ? totalUsd * 0.03 : 0;

  const applyTemplate = (template: (typeof stockTemplates)[number]) => {
    setCategory("STOCK_TOKEN"); setName(template.name); setTicker(template.ticker);
    setUnderlyingTicker(template.underlying); setUnderlyingExchange(template.exchange);
    setReferenceStockPriceUsd(String(template.price)); setIsinCode(template.isin);
    setLogoColor(template.color); setMaxLeverage(20);
    setDescription(`Sandbox stock-token concept referencing ${template.underlying}. No real shares, backing, or price feed are connected.`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (!user) { onRequireAuth(); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/tokens/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, ticker, category, description, logoColor, targetPath, graduationTargetHype: Number(graduationTargetHype) || 500, initialBuyHype: initialBuy, maxLeverage, isStockToken: isStock, underlyingTicker, underlyingExchange, referenceStockPriceUsd: Number(referenceStockPriceUsd) || 150, isinCode, paymentMethod, xMoneyRail, twitterUrl, websiteUrl }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Could not create the asset. Please try again."); return; }
      onTokenCreated(data.token, data.xMoneyReceiptCode || null);
    } catch { setError("Connection problem. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="animate-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="ui-overline flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> ISSUER WORKSPACE</div><h1 className="mt-2 font-display text-[30px] font-medium text-[#f0f5f1] sm:text-[38px]">Create a new token.</h1><p className="mt-2 max-w-2xl text-[13px] leading-[1.7] text-[#91a49a]">Define an asset, choose its path to liquidity, and preview settlement in the Elysium sandbox.</p></div><span className="ui-pill">SANDBOX · NO ON-CHAIN DEPLOYMENT</span></div>

      <div className="ui-card flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 text-[11px] text-[#91a79b] sm:px-6"><span className="flex items-center gap-2 text-[#d9ebe0]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#294a37] text-[10px] text-[#c1e9cd]">1</span> Asset details</span><ChevronRight className="h-3.5 w-3.5 text-[#5b7468]" /><span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#26383a] text-[10px]">2</span> Graduation route</span><ChevronRight className="h-3.5 w-3.5 text-[#5b7468]" /><span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#26383a] text-[10px]">3</span> Review & create</span></div>

      <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_345px]">
        <div className="space-y-5">
          <section className="ui-card p-5 sm:p-6"><div className="flex items-start justify-between gap-3 border-b border-[#26353b] pb-5"><div><div className="ui-overline">01 / ASSET DETAILS</div><h2 className="mt-1.5 font-display text-[20px] font-medium">Tell us about your token</h2><p className="mt-1 text-[11px] text-[#84998d]">Choose a category and define how it appears in the marketplace.</p></div><Shapes className="h-5 w-5 text-[#769e85]" /></div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ id: "CRYPTO", label: "Crypto", desc: "Fungible asset" }, { id: "STOCK_TOKEN", label: "Stock token", desc: "Equity-linked concept" }, { id: "AI_AGENT", label: "AI agent", desc: "Agent economy" }, { id: "DEFI", label: "DeFi", desc: "Onchain protocol" }].map((item) => <button key={item.id} type="button" onClick={() => { setCategory(item.id); if (item.id === "STOCK_TOKEN") setMaxLeverage(20); }} className={`min-h-[72px] rounded-[10px] border p-3 text-left transition ${category === item.id ? "border-[#71967a] bg-[#22392d]" : "border-[#304048] bg-[#131f24] hover:border-[#56766a]"}`}><span className={`block text-[12px] font-semibold ${category === item.id ? "text-[#d6efdc]" : "text-[#c5d3ca]"}`}>{item.label}</span><span className="mt-1 block text-[10px] text-[#7e9587]">{item.desc}</span></button>)}</div>
            {isStock && <div className="ui-card-soft mt-5 p-4"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#bfdcc8]">Stock-token templates <span className="font-normal text-[#82988a]">· sandbox examples</span></div><div className="mt-3 flex flex-wrap gap-2">{stockTemplates.map((item) => <button key={item.ticker} type="button" onClick={() => applyTemplate(item)} className="rounded-md border border-[#354a47] bg-[#1a2b2a] px-2.5 py-1.5 font-mono text-[10px] text-[#aec9b8] transition hover:border-[#84b39a]">{item.ticker}</button>)}</div></div>}
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px]"><label><span className="ui-label">Token name *</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={isStock ? "Example: Amazon Stock Token" : "Example: Orbit Protocol"} className="ui-field" /></label><label><span className="ui-label">Ticker symbol *</span><input required maxLength={10} value={ticker} onChange={(event) => setTicker(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))} placeholder={isStock ? "eAMZNx" : "ORBIT"} className="ui-field font-mono" /></label></div>
            {isStock && <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label><span className="ui-label">Underlying ticker</span><input value={underlyingTicker} onChange={(event) => setUnderlyingTicker(event.target.value.toUpperCase())} placeholder="NVDA" className="ui-field" /></label><label><span className="ui-label">Reference market</span><select value={underlyingExchange} onChange={(event) => setUnderlyingExchange(event.target.value)} className="ui-field"><option>NASDAQ</option><option>NYSE</option><option>PRE-IPO SECONDARY</option><option>INDEX / ETF</option></select></label><label><span className="ui-label">Reference price (USD)</span><input type="number" min="0" step="any" value={referenceStockPriceUsd} onChange={(event) => setReferenceStockPriceUsd(event.target.value)} placeholder="150" className="ui-field font-mono" /></label><label><span className="ui-label">ISIN / reference</span><input value={isinCode} onChange={(event) => setIsinCode(event.target.value)} placeholder="Optional" className="ui-field font-mono" /></label></div>}
            <label className="mt-4 block"><span className="ui-label">Description *</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Describe your asset, utility, and relevant risk considerations." className="ui-field" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="ui-label">X profile <span className="font-normal text-[#677e72]">· optional</span></span><input type="url" value={twitterUrl} onChange={(event) => setTwitterUrl(event.target.value)} placeholder="https://x.com/yourproject" className="ui-field" /></label><label><span className="ui-label">Website <span className="font-normal text-[#677e72]">· optional</span></span><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourproject.xyz" className="ui-field" /></label></div>
            <div className="mt-4"><span className="ui-label">Token avatar color</span><div className="flex items-center gap-2">{logoColors.map((color) => <button type="button" key={color} aria-label={`Choose color ${color}`} onClick={() => setLogoColor(color)} className={`h-6 w-6 rounded-full border-2 transition ${logoColor === color ? "border-white ring-2 ring-[#70947a] ring-offset-2 ring-offset-[#111b20]" : "border-transparent hover:scale-110"}`} style={{ backgroundColor: color }} />)}</div></div>
          </section>

          <section className="ui-card p-5 sm:p-6"><div className="border-b border-[#26353b] pb-5"><div className="ui-overline">02 / GRADUATION ROUTE</div><h2 className="mt-1.5 font-display text-[20px] font-medium">Where should it go next?</h2><p className="mt-1 text-[11px] text-[#84998d]">Every token starts on the bonding curve. Choose the intended path beyond it.</p></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setTargetPath("FULL_HIP3_PIPELINE")} className={`relative min-h-[112px] rounded-[10px] border p-4 text-left transition ${targetPath === "FULL_HIP3_PIPELINE" ? "border-[#7da788] bg-[#21392e]" : "border-[#324247] bg-[#141f24] hover:border-[#678f77]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-[#e8f0e9]">Full market lifecycle</span>{targetPath === "FULL_HIP3_PIPELINE" && <Check className="h-4 w-4 text-[#b3ebc9]" />}</div><p className="mt-2 text-[11px] leading-[1.65] text-[#99ad9f]">Curve → Pool complete → Acquire ticker → HyperCore spot → HIP-3 perpetuals</p></button><button type="button" onClick={() => setTargetPath("UNISWAP_ONLY")} className={`relative min-h-[112px] rounded-[10px] border p-4 text-left transition ${targetPath === "UNISWAP_ONLY" ? "border-[#7da788] bg-[#21392e]" : "border-[#324247] bg-[#141f24] hover:border-[#678f77]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-[#e8f0e9]">Pool-only lifecycle</span>{targetPath === "UNISWAP_ONLY" && <Check className="h-4 w-4 text-[#b3ebc9]" />}</div><p className="mt-2 text-[11px] leading-[1.65] text-[#99ad9f]">Curve → Graduate → Uniswap V3 pool → Complete</p></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3"><label><span className="ui-label">Graduation target · HYPE</span><input type="number" min="100" max="5000" value={graduationTargetHype} onChange={(event) => setGraduationTargetHype(event.target.value)} className="ui-field font-mono" /></label><label><span className="ui-label">Initial buy · HYPE</span><input type="number" min="0" step="any" value={initialBuyHype} onChange={(event) => setInitialBuyHype(event.target.value)} className="ui-field font-mono" /></label><label><span className="ui-label">Perpetual leverage cap</span><select value={maxLeverage} onChange={(event) => setMaxLeverage(Number(event.target.value))} className="ui-field font-mono">{[5, 10, 15, 20, 25, 30, 50].map((amount) => <option key={amount} value={amount}>{amount}x</option>)}</select></label></div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-[156px]"><section className="ui-card p-5"><div className="flex items-center justify-between border-b border-[#26353b] pb-4"><div><div className="ui-overline">03 / SETTLEMENT</div><h2 className="mt-1.5 font-display text-[18px] font-medium">Choose a demo balance</h2></div><CreditCard className="h-4 w-4 text-[#8cad98]" /></div><div className="mt-4 grid grid-cols-2 gap-2">{[{ id: "HYPE", label: "HYPE", detail: "Native gas" }, { id: "USDC", label: "USDC", detail: "USD balance" }, { id: "KHYPE", label: "kHYPE", detail: "Staked asset" }, { id: "X_MONEY", label: "X Money", detail: "Simulated" }].map((rail) => <button key={rail.id} type="button" onClick={() => setPaymentMethod(rail.id as typeof paymentMethod)} className={`rounded-[9px] border px-3 py-3 text-left transition ${paymentMethod === rail.id ? "border-[#7da788] bg-[#21392e]" : "border-[#324247] bg-[#141f24] hover:border-[#557367]"}`}><span className="flex items-center justify-between text-[12px] font-semibold text-[#e7efe8]">{rail.label}{paymentMethod === rail.id && <Check className="h-3.5 w-3.5 text-[#b3ebc9]" />}</span><span className="mt-1 block text-[10px] text-[#789185]">{rail.detail}</span></button>)}</div>
            {paymentMethod === "X_MONEY" && <div className="ui-card-soft mt-3 p-3"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#d1e4d6]">X Money payment preview <CircleHelp className="h-3.5 w-3.5 text-[#849c8e]" /></div><p className="mt-1 text-[10px] leading-relaxed text-[#849c8e]">No X Money account or merchant API is connected.</p><div className="mt-3 space-y-1">{[{ id: "X_VISA_VIRTUAL_CARD", label: "Virtual card · simulated 3% rebate" }, { id: "X_MONEY_P2P", label: "P2P handle · simulated" }, { id: "X_PASSKEY_INSTANT", label: "Passkey express · simulated" }].map((rail) => <button type="button" key={rail.id} onClick={() => setXMoneyRail(rail.id as typeof xMoneyRail)} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[10px] transition ${xMoneyRail === rail.id ? "bg-[#284738] text-[#d5f0dc]" : "text-[#98aca0] hover:bg-[#1d3030]"}`}>{rail.label}{xMoneyRail === rail.id && <Check className="h-3 w-3" />}</button>)}</div></div>}
          </section>

          <section className="ui-card overflow-hidden"><div className="border-b border-[#26353b] px-5 py-4"><div className="ui-overline">ORDER SUMMARY</div><h2 className="mt-1 font-display text-[18px] font-medium">Review and create</h2></div><div className="space-y-3 px-5 py-4 text-[11px]"><div className="flex items-center justify-between"><span className="text-[#91a59a]">Asset</span><span className="text-[#e4ede6]">{ticker || "Not named yet"}</span></div><div className="flex items-center justify-between"><span className="text-[#91a59a]">Platform fee</span><span className="font-mono text-[#cbdcd0]">{TOKEN_CREATE_FEE_HYPE} HYPE</span></div><div className="flex items-center justify-between"><span className="text-[#91a59a]">Initial buy</span><span className="font-mono text-[#cbdcd0]">{initialBuy.toFixed(2)} HYPE</span></div><div className="flex items-center justify-between"><span className="text-[#91a59a]">Route</span><span className="text-right text-[#cbdcd0]">{targetPath === "UNISWAP_ONLY" ? "Pool only" : "Full lifecycle"}</span></div><div className="ui-divider" /><div className="flex items-center justify-between"><span className="font-semibold text-[#e5eee7]">Demo total</span><span className="font-mono text-[15px] font-medium text-[#b3ebc9]">{paymentMethod === "HYPE" || paymentMethod === "KHYPE" ? `${totalHype.toFixed(2)} ${paymentMethod}` : `$${totalUsd.toFixed(2)}`}</span></div>{rebate > 0 && <div className="flex items-center justify-between text-[#a7d3b0]"><span>Sandbox card rebate</span><span className="font-mono">+${rebate.toFixed(2)}</span></div>}</div><div className="border-t border-[#26353b] px-5 py-4">{error && <div role="alert" className="mb-3 rounded-md border border-[#704b4b] bg-[#342525] px-3 py-2 text-[11px] text-[#efbab3]">{error}</div>}<button type="submit" disabled={submitting} className="ui-btn-primary w-full">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{submitting ? "Creating asset..." : user ? "Create in sandbox" : "Sign in to create"}<ArrowRight className="h-3.5 w-3.5" /></button><p className="mt-3 flex items-start gap-2 text-[10px] leading-[1.6] text-[#7f9588]"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This is a database simulation. It does not deploy a token or move funds on Elysium.</p></div></section>
          <div className="flex items-start gap-2 px-1 text-[10px] leading-[1.65] text-[#71877a]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Stock token metadata is illustrative. Real issuance requires legal, custody, and oracle arrangements.</span></div>
        </aside>
      </form>
    </div>
  );
}
