"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CandlestickChart, Check, Copy, Gavel, GitBranch, Info, Loader2, Shapes, TrendingUp, X, Zap } from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type { PlatformToken, SpotTradeRecord, TokenHoldingRecord, UserProfile } from "@/types/platform";

interface TokenTradeModalProps {
  token: PlatformToken | null;
  onClose: () => void;
  user: UserProfile | null;
  holding: TokenHoldingRecord | undefined;
  trades: SpotTradeRecord[];
  hypePriceUsd: number;
  hip1AuctionHype: number;
  onExecuteSpotTrade: (params: { tokenId: number; side: "BUY" | "SELL"; amount: number; paymentMethod: string }) => Promise<void>;
  onExecuteLifecycleAction: (params: { tokenId: number; action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP"; paymentMethod: string }) => Promise<void>;
  onJumpToPerps: (token: PlatformToken) => void;
}

const compact = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${(value / 1000).toFixed(1)}K`;
const formatPrice = (value: number) => value < 1 ? `$${value.toFixed(4)}` : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TokenTradeModal({ token, onClose, user, holding, trades, hypePriceUsd, hip1AuctionHype, onExecuteSpotTrade, onExecuteLifecycleAction, onJumpToPerps }: TokenTradeModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [paymentMethod, setPaymentMethod] = useState<"HYPE" | "USDC" | "X_MONEY">("HYPE");
  const [amount, setAmount] = useState("25");
  const [tradeBusy, setTradeBusy] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecyclePayment, setLifecyclePayment] = useState<"HYPE" | "X_MONEY">("HYPE");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [token, onClose]);

  const series = useMemo(() => {
    if (!token) return [];
    return Array.from({ length: 46 }, (_, i) => {
      const t = i / 45;
      const wave = Math.sin(i * 0.63 + token.id * 3) * 0.10 + Math.sin(i * 0.19 + token.id) * 0.06;
      return 70 - t * (token.change24h >= 0 ? 35 : -16) + wave * 58;
    });
  }, [token]);
  const tokenTrades = useMemo(() => trades.filter((record) => record.tokenId === token?.id).slice(0, 5), [trades, token]);

  if (!token) return null;
  const meta = LIFECYCLE_STAGES_META[token.stage] || LIFECYCLE_STAGES_META.BONDING;
  const points = series.map((value, i) => `${(i * (600 / 45)).toFixed(1)},${value.toFixed(1)}`).join(" ");
  const currentAmount = Number(amount) || 0;
  const estimatedUsd = side === "SELL" ? currentAmount * token.priceUsd : paymentMethod === "HYPE" ? currentAmount * hypePriceUsd : currentAmount;
  const estimatedTokenUnits = side === "BUY" ? estimatedUsd / Math.max(token.priceUsd, 0.00000001) : currentAmount;
  const remaining = Math.max(0, token.graduationTargetHype - token.realHypeRaised);
  const graduated = token.stage !== "BONDING";
  const spotReady = token.stage === "HYPERCORE_SPOT" || token.stage === "HIP3_PERP_LIVE";
  const perpReady = token.stage === "HIP3_PERP_LIVE";
  const balanceLabel = side === "SELL" ? `${(holding?.balance || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token.ticker}` : paymentMethod === "HYPE" ? `${user?.hypeBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "0"} HYPE` : paymentMethod === "USDC" ? `$${user?.usdcBalance.toLocaleString() || "0"}` : `$${user?.xMoneyBalanceUsd.toLocaleString() || "0"} demo`;

  const trade = async (event: React.FormEvent) => {
    event.preventDefault(); if (currentAmount <= 0) return;
    setTradeBusy(true);
    try { await onExecuteSpotTrade({ tokenId: token.id, side, amount: currentAmount, paymentMethod }); }
    finally { setTradeBusy(false); }
  };
  const lifecycle = async () => {
    if (perpReady) { onClose(); onJumpToPerps(token); return; }
    const action = !graduated ? "ACCELERATE_GRADUATE" : !spotReady ? "BUY_TICKER_HYPERCORE" : "DEPLOY_HIP3_PERP";
    setLifecycleBusy(true);
    try { await onExecuteLifecycleAction({ tokenId: token.id, action, paymentMethod: lifecyclePayment }); }
    finally { setLifecycleBusy(false); }
  };
  const copyAddress = async () => { try { await navigator.clipboard.writeText(token.contractAddress); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020608]/85 p-2 backdrop-blur-[7px] sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="market-title" className="ui-card ui-scroll animate-enter my-auto max-h-[96vh] w-full max-w-[1100px] overflow-y-auto shadow-[0_35px_110px_-25px_rgba(0,0,0,.9)]">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#26353b] bg-[#111b20]/95 px-5 py-4 backdrop-blur-lg sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-white/10 text-[10px] font-bold text-white" style={{ backgroundColor: token.logoColor }}>{token.ticker.slice(0, 3).toUpperCase()}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="market-title" className="truncate font-display text-[17px] font-medium text-[#f0f5f0]">{token.name}</h2><span className="rounded bg-[#243630] px-2 py-0.5 font-mono text-[10px] text-[#c0e4cb]">{token.ticker}</span></div><div className="mt-1 flex items-center gap-2 text-[10px] text-[#85998b]"><span>{token.isStockToken ? "Stock token concept" : token.category.replaceAll("_", " ").toLowerCase()}</span><span className="h-1 w-1 rounded-full bg-[#637a6a]" /><span>{meta.shortLabel}</span></div></div></div>
          <div className="flex items-center gap-2">{perpReady && <button type="button" onClick={() => { onClose(); onJumpToPerps(token); }} className="ui-btn-secondary hidden !min-h-9 !px-3 !text-[11px] sm:inline-flex"><CandlestickChart className="h-3.5 w-3.5" /> Open perp market</button>}<button type="button" aria-label="Close market details" onClick={onClose} className="ui-btn-quiet !h-9 !w-9 !min-h-0 !p-0"><X className="h-[18px] w-[18px]" /></button></div>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="min-w-0 space-y-5">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[#29393d] bg-[#29393d] sm:grid-cols-4">{[
              { label: "Indicative price", value: formatPrice(token.priceUsd), small: `${token.priceHype.toFixed(5)} HYPE` },
              { label: "24h change", value: `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%`, small: "Demo movement", tone: token.change24h >= 0 ? "text-[#a6dfb8]" : "text-[#e39b97]" },
              { label: "Market cap", value: compact(token.marketCapUsd), small: "Illustrative" },
              { label: "24h volume", value: compact(token.volume24hUsd), small: `${token.holdersCount} demo holders` },
            ].map((item) => <div key={item.label} className="min-w-0 bg-[#141f24] px-4 py-3.5"><div className="text-[10px] text-[#81978a]">{item.label}</div><div className={`mt-1.5 truncate font-display text-[19px] font-medium ${item.tone || "text-[#edf2ed]"}`}>{item.value}</div><div className="mt-0.5 truncate font-mono text-[9px] text-[#738c7d]">{item.small}</div></div>)}</div>

            <section className="ui-card-soft overflow-hidden"><div className="flex items-center justify-between border-b border-[#25333a] px-4 py-3.5"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#afd6b9]" /><span className="text-[12px] font-semibold text-[#e1ece3]">Price overview</span></div><span className="font-mono text-[10px] text-[#748f80]">ILLUSTRATIVE CHART</span></div><div className="p-4"><svg viewBox="0 0 600 155" preserveAspectRatio="none" className="h-[175px] w-full sm:h-[210px]" aria-label="Illustrative asset price trend" role="img"><defs><linearGradient id="asset-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#93d7b1" stopOpacity=".22" /><stop offset="100%" stopColor="#93d7b1" stopOpacity="0" /></linearGradient></defs>{[25, 70, 115].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#2a3c3c" strokeDasharray="3 5" />)}<polygon points={`0,155 ${points} 600,155`} fill="url(#asset-fill)" /><polyline points={points} fill="none" stroke="#a8dfbd" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" /></svg><div className="flex items-center justify-between border-t border-[#223138] pt-3 font-mono text-[10px] text-[#728a7c]"><span>Past 24 hours · sample</span><span>{meta.venue}</span></div></div></section>

            <section className="ui-card-soft p-4 sm:p-5"><div className="ui-overline">ASSET OVERVIEW</div><p className="mt-3 text-[12px] leading-[1.8] text-[#adc0b0]">{token.description}</p><p className="mt-2 text-[10px] leading-[1.7] text-[#718b78]">Project-provided or sample description. Not audited or independently verified.</p><div className="mt-4 grid gap-3 border-t border-[#24343a] pt-4 sm:grid-cols-2"><div><div className="ui-label !mb-1">Token reference</div><button type="button" onClick={copyAddress} className="inline-flex max-w-full items-center gap-2 font-mono text-[10px] text-[#bfdcc7] hover:text-white"><span className="truncate">{token.contractAddress.slice(0, 14)}…{token.contractAddress.slice(-6)}</span>{copied ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}</button></div><div><div className="ui-label !mb-1">Market venue</div><div className="text-[11px] text-[#c2d5c7]">{meta.venue}</div></div>{token.isStockToken && <><div><div className="ui-label !mb-1">Underlying reference</div><div className="text-[11px] text-[#c2d5c7]">{token.underlyingTicker} · {token.underlyingExchange}</div></div><div><div className="ui-label !mb-1">Sample oracle configuration</div><div className="truncate text-[11px] text-[#c2d5c7]">{token.oracleProvider || "Not configured"}</div></div></>}</div>{token.isStockToken && <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#5c523b] bg-[#2a261b] p-3 text-[10px] leading-[1.6] text-[#d3c29c]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A stock token here does not represent real shares. Reference data, ISIN and backing figures are unverified sample fields.</div>}</section>

            <section className="ui-card-soft overflow-hidden"><div className="flex items-center justify-between border-b border-[#25333a] px-4 py-3.5"><span className="text-[12px] font-semibold text-[#e1ece3]">Recent activity</span><span className="font-mono text-[10px] text-[#748f80]">DEMO TRADES</span></div>{tokenTrades.length ? <div className="divide-y divide-[#223138]">{tokenTrades.map((record) => <div key={record.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[11px]"><div className="flex items-center gap-2"><span className={`w-9 font-mono font-medium ${record.side === "BUY" ? "text-[#a6dfb8]" : "text-[#e39b97]"}`}>{record.side}</span><span className="max-w-[125px] truncate text-[#92a89a]">{record.traderLabel}</span></div><div className="font-mono text-[#d4e2d5]">${record.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>)}</div> : <p className="px-4 py-7 text-center text-[11px] text-[#7b9082]">No trades recorded for this asset.</p>}</section>
          </div>

          <aside className="min-w-0 space-y-4">
            <form onSubmit={trade} className="ui-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#26353b] px-4 py-4"><div><div className="ui-overline">SPOT TRADING</div><h3 className="mt-1 font-display text-[17px] font-medium text-[#e9f1eb]">Trade {token.ticker}</h3></div><span className="rounded-md bg-[#254032] px-2 py-1 text-[10px] text-[#c9e5ce]">SANDBOX</span></div><div className="space-y-4 p-4"><div className="grid grid-cols-2 gap-1 rounded-lg border border-[#293b3b] bg-[#0d171b] p-1"><button type="button" onClick={() => { setSide("BUY"); setAmount(paymentMethod === "HYPE" ? "25" : "1000"); }} className={`rounded-md py-2 text-[11px] font-semibold transition ${side === "BUY" ? "bg-[#294a36] text-[#d8f3dd]" : "text-[#83998b] hover:text-white"}`}>Buy</button><button type="button" onClick={() => { setSide("SELL"); setPaymentMethod("HYPE"); setAmount(holding?.balance ? String(Number((holding.balance * 0.25).toFixed(4))) : "0"); }} className={`rounded-md py-2 text-[11px] font-semibold transition ${side === "SELL" ? "bg-[#493032] text-[#f3c4bf]" : "text-[#83998b] hover:text-white"}`}>Sell</button></div>
              <div><span className="ui-label">{side === "BUY" ? "Pay with" : "Receive in"}</span><div className={`grid gap-1.5 ${side === "BUY" ? "grid-cols-3" : "grid-cols-2"}`}>{(["HYPE", "USDC", ...(side === "BUY" ? ["X_MONEY"] : [])] as const).map((rail) => <button type="button" key={rail} onClick={() => { setPaymentMethod(rail as typeof paymentMethod); if (side === "BUY") setAmount(rail === "HYPE" ? "25" : "1000"); }} className={`rounded-md border px-2 py-2 text-[10px] font-semibold transition ${paymentMethod === rail ? "border-[#79a286] bg-[#294334] text-[#d5eeda]" : "border-[#314249] bg-[#152228] text-[#849a8c] hover:text-white"}`}>{rail === "X_MONEY" ? "X Money" : rail}</button>)}</div></div>
              <label className="block"><span className="flex items-center justify-between"><span className="ui-label">Amount · {side === "SELL" ? token.ticker : paymentMethod === "HYPE" ? "HYPE" : "USD"}</span><span className="font-mono text-[9px] text-[#7d9687]">{balanceLabel}</span></span><input type="number" min="0" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="ui-field font-mono !text-[15px]" /></label>
              <div className="flex gap-1.5">{side === "BUY" ? (paymentMethod === "HYPE" ? [10, 25, 50, 100] : [250, 1000, 2500, 5000]).map((value) => <button type="button" key={value} onClick={() => setAmount(String(value))} className="flex-1 rounded-md border border-[#314249] bg-[#152228] py-1.5 font-mono text-[10px] text-[#9eafa4] hover:border-[#6f9380]">{paymentMethod === "HYPE" ? value : `$${value}`}</button>) : [25, 50, 75, 100].map((percent) => <button type="button" key={percent} onClick={() => setAmount(String(Number(((holding?.balance || 0) * percent / 100).toFixed(4))))} className="flex-1 rounded-md border border-[#314249] bg-[#152228] py-1.5 font-mono text-[10px] text-[#9eafa4] hover:border-[#6f9380]">{percent}%</button>)}</div>
              <div className="rounded-lg border border-[#283a37] bg-[#0d1919] p-3 text-[10px]"><div className="flex justify-between text-[#8fa69a]"><span>{side === "BUY" ? "Estimated tokens" : "Estimated proceeds"}</span><span className="font-mono text-[#e1eee3]">{side === "BUY" ? `${estimatedTokenUnits.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token.ticker}` : `$${estimatedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</span></div><div className="mt-2 flex justify-between text-[#8fa69a]"><span>Venue</span><span className="text-[#bed4c2]">{meta.venue}</span></div>{side === "BUY" && paymentMethod === "X_MONEY" && <div className="mt-2 flex justify-between text-[#a6d9b3]"><span>Sandbox card rebate</span><span className="font-mono">+${(estimatedUsd * 0.03).toFixed(2)}</span></div>}</div>
              <button type="submit" disabled={tradeBusy || currentAmount <= 0} className={`w-full ${side === "SELL" ? "ui-btn-secondary !border-[#835453] !bg-[#7d4747] !text-white hover:!bg-[#935353]" : "ui-btn-primary"}`}>{tradeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}{tradeBusy ? "Processing demo trade..." : user ? `${side === "BUY" ? "Buy" : "Sell"} ${token.ticker}` : "Sign in to trade"}</button>
              {holding && holding.balance > 0 && <div className="flex items-center justify-between border-t border-[#26353b] pt-3 text-[10px] text-[#8ba396]"><span>Your holding</span><span className="font-mono text-[#d6e8d8]">{holding.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.ticker}</span></div>}
              <p className="text-[10px] leading-[1.5] text-[#708678]">Trades update demo balances only. No on-chain order is sent.</p>
            </div></form>

            <section className="ui-card overflow-hidden"><div className="flex items-center gap-2 border-b border-[#26353b] px-4 py-4"><GitBranch className="h-4 w-4 text-[#a7c8ad]" /><h3 className="font-display text-[16px] font-medium">Asset lifecycle</h3></div><div className="p-4"><div className="space-y-0">{[{ label: "Created on Elysium", done: true }, { label: "Curve and pool complete", done: graduated }, { label: "HyperCore spot preview", done: spotReady }, { label: "HIP-3 perpetuals preview", done: perpReady }].map((step, index) => <div key={step.label} className={`flex items-center gap-2.5 text-[11px] ${index !== 3 ? "pb-3" : ""}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${step.done ? "border-[#618c69] bg-[#2a4c34] text-[#cef0d5]" : "border-[#3a4d4a] bg-[#18252a] text-[#779080]"}`}>{step.done ? <Check className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-current" />}</span><span className={step.done ? "text-[#d5e5d8]" : "text-[#82978a]"}>{step.label}</span></div>)}</div><div className="ui-divider my-4" /><div className="flex items-center justify-between gap-2"><span className="ui-label !mb-0">Next action</span><div className="flex items-center gap-1 rounded-md border border-[#30443e] bg-[#1b2d28] p-0.5">{(["HYPE", "X_MONEY"] as const).map((rail) => <button type="button" key={rail} onClick={() => setLifecyclePayment(rail)} className={`rounded px-2 py-1 text-[9px] font-semibold ${lifecyclePayment === rail ? "bg-[#315040] text-[#def1e1]" : "text-[#779083]"}`}>{rail === "X_MONEY" ? "X Money" : rail}</button>)}</div></div><button type="button" onClick={lifecycle} disabled={lifecycleBusy} className="ui-btn-secondary mt-3 w-full !min-h-[38px] !text-[11px]">{lifecycleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : !graduated ? <Zap className="h-4 w-4" /> : !spotReady ? <Gavel className="h-4 w-4" /> : <CandlestickChart className="h-4 w-4" />}{!graduated ? `Complete curve · ${remaining.toFixed(1)} HYPE` : !spotReady ? `Acquire ticker · ${hip1AuctionHype} HYPE` : !perpReady ? "Activate perpetual preview" : "Open perpetual market"}<ArrowRight className="h-3.5 w-3.5" /></button><p className="mt-2 text-[10px] leading-[1.6] text-[#73897c]">{token.targetPath === "UNISWAP_ONLY" && graduated && !spotReady ? "The pool-only route is complete. Continuing to HyperCore is optional." : meta.description}</p></div></section>
          </aside>
        </div>
      </div>
    </div>
  );
}
