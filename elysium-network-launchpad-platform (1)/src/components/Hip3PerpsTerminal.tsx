"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CandlestickChart, Check, ChevronDown, Edit3, Info, Loader2, ShieldAlert, SlidersHorizontal, TrendingDown, TrendingUp, X } from "lucide-react";
import type { PerpPositionRecord, PlatformToken, UserProfile } from "@/types/platform";

interface Hip3PerpsTerminalProps {
  tokens: PlatformToken[];
  selectedMarketTokenId: number | null;
  onSelectMarketTokenId: (id: number) => void;
  user: UserProfile | null;
  positions: PerpPositionRecord[];
  hypePriceUsd: number;
  onOpenPerpOrder: (payload: { tokenId: number; side: "LONG" | "SHORT"; marginMode: "CROSS" | "ISOLATED"; orderType: "MARKET" | "LIMIT"; collateralSource: "USDC" | "HYPE" | "X_MONEY"; collateralUsd: number; leverage: number; clientMarkPrice: number; limitPrice?: number | null; takeProfitPrice?: number | null; stopLossPrice?: number | null }) => Promise<void>;
  onClosePerpPosition: (params: { positionId: number; clientMarkPrice: number }) => Promise<void>;
  onUpdateTpSl: (params: { positionId: number; takeProfitPrice: number | null; stopLossPrice: number | null }) => Promise<void>;
}
interface Candle { open: number; close: number; high: number; low: number; volume: number; }
const fmt = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 4 : 2 })}`;
const compact = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${(value / 1000).toFixed(1)}K`;

export function Hip3PerpsTerminal({ tokens, selectedMarketTokenId, onSelectMarketTokenId, user, positions, hypePriceUsd, onOpenPerpOrder, onClosePerpPosition, onUpdateTpSl }: Hip3PerpsTerminalProps) {
  const markets = useMemo(() => tokens.filter((token) => token.stage === "HIP3_PERP_LIVE"), [tokens]);
  const market = useMemo(() => markets.find((token) => token.id === selectedMarketTokenId) || markets[0] || null, [markets, selectedMarketTokenId]);
  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "4h">("5m");
  const [jitter, setJitter] = useState<Record<number, number>>({});
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [marginMode, setMarginMode] = useState<"CROSS" | "ISOLATED">("CROSS");
  const [collateralSource, setCollateralSource] = useState<"USDC" | "HYPE" | "X_MONEY">("USDC");
  const [collateralInput, setCollateralInput] = useState("500");
  const [leverage, setLeverage] = useState(10);
  const [limitInput, setLimitInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [slInput, setSlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [positionsTab, setPositionsTab] = useState<"OPEN" | "PENDING" | "CLOSED">("OPEN");
  const [closingId, setClosingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<PerpPositionRecord | null>(null);
  const [editTp, setEditTp] = useState("");
  const [editSl, setEditSl] = useState("");
  const [saving, setSaving] = useState(false);

  // Indicative price movement for the local simulator only.
  useEffect(() => {
    const timer = window.setInterval(() => setJitter((previous) => {
      const next = { ...previous };
      markets.forEach((item) => { next[item.id] = Math.max(-0.015, Math.min(0.015, (previous[item.id] || 0) + (Math.random() - 0.5) * 0.0016)); });
      return next;
    }), 1600);
    return () => window.clearInterval(timer);
  }, [markets]);
  useEffect(() => { if (market && leverage > market.maxLeverage) setLeverage(market.maxLeverage); }, [market, leverage]);
  const markFor = (item: PlatformToken) => Number((item.priceUsd * (1 + (jitter[item.id] || 0))).toFixed(item.priceUsd < 1 ? 4 : 2));
  const mark = market ? markFor(market) : 1;

  const candles = useMemo<Candle[]>(() => {
    if (!market) return [];
    const scales: Record<string, number> = { "1m": 0.004, "5m": 0.008, "15m": 0.012, "1h": 0.019, "4h": 0.028 };
    const scale = scales[timeframe];
    const list: Candle[] = [];
    let previous = mark * 0.955;
    for (let i = 0; i < 42; i++) {
      const open = previous;
      const drift = Math.sin(i * 0.77 + market.id * 2.3) * scale + Math.cos(i * 0.27 + market.id) * scale * 0.55 + 0.00115;
      const close = i === 41 ? mark : open * (1 + drift);
      const high = Math.max(open, close) * (1 + Math.abs(Math.sin(i * 1.27 + market.id)) * scale * 0.8);
      const low = Math.min(open, close) * (1 - Math.abs(Math.cos(i * 1.43 + market.id)) * scale * 0.8);
      list.push({ open, close, high, low, volume: 10 + ((i * 37 + market.id * 11) % 34) });
      previous = close;
    }
    return list;
  }, [market, timeframe, mark]);

  const orderbook = useMemo(() => {
    if (!market) return { asks: [], bids: [] } as { asks: { price: number; size: number }[]; bids: { price: number; size: number }[] };
    const step = mark < 1 ? 0.001 : mark < 10 ? 0.01 : mark < 100 ? 0.05 : 0.15;
    const round = (value: number) => Number(value.toFixed(mark < 1 ? 4 : 2));
    return {
      asks: Array.from({ length: 8 }, (_, index) => ({ price: round(mark + (8 - index) * step), size: 9 + ((index * 19 + market.id * 17) % 73) })),
      bids: Array.from({ length: 8 }, (_, index) => ({ price: round(Math.max(0.0001, mark - (index + 1) * step)), size: 12 + ((index * 31 + market.id * 13) % 69) })),
    };
  }, [market, mark]);

  if (!market) return <div className="ui-card px-6 py-20 text-center text-[13px] text-[#91a79a]">No perpetual markets are available in this sandbox. Complete a token’s lifecycle to add one.</div>;

  const minimum = Math.min(...candles.map((c) => c.low)) * 0.996;
  const maximum = Math.max(...candles.map((c) => c.high)) * 1.004;
  const span = Math.max(0.000001, maximum - minimum);
  const priceToY = (value: number) => 213 - ((value - minimum) / span) * 186;
  const collateral = Math.max(0, Number(collateralInput) || 0);
  const entry = orderType === "LIMIT" && Number(limitInput) > 0 ? Number(limitInput) : mark;
  const size = collateral * leverage;
  const liquidation = side === "LONG" ? entry * (1 - 0.9 / leverage) : entry * (1 + 0.9 / leverage);
  const fee = size * 0.00025;
  const open = positions.filter((item) => item.status === "OPEN");
  const pending = positions.filter((item) => item.status === "LIMIT_PENDING");
  const closed = positions.filter((item) => item.status === "CLOSED");
  const currentPositions = positionsTab === "OPEN" ? open : positionsTab === "PENDING" ? pending : closed;
  const available = collateralSource === "USDC" ? `$${user?.usdcBalance.toLocaleString() || "0"}` : collateralSource === "HYPE" ? `${user?.hypeBalance.toFixed(2) || "0"} HYPE` : `$${user?.xMoneyBalanceUsd.toLocaleString() || "0"} demo`;

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault(); if (collateral < 10) return;
    setSubmitting(true);
    try { await onOpenPerpOrder({ tokenId: market.id, side, marginMode, orderType, collateralSource, collateralUsd: collateral, leverage, clientMarkPrice: mark, limitPrice: orderType === "LIMIT" && Number(limitInput) > 0 ? Number(limitInput) : null, takeProfitPrice: Number(tpInput) > 0 ? Number(tpInput) : null, stopLossPrice: Number(slInput) > 0 ? Number(slInput) : null }); setTpInput(""); setSlInput(""); }
    finally { setSubmitting(false); }
  };
  const closePosition = async (position: PerpPositionRecord) => {
    const related = tokens.find((token) => token.id === position.tokenId);
    setClosingId(position.id);
    try { await onClosePerpPosition({ positionId: position.id, clientMarkPrice: related ? markFor(related) : position.entryPrice }); }
    finally { setClosingId(null); }
  };
  const saveTriggers = async () => {
    if (!editing) return;
    setSaving(true);
    try { await onUpdateTpSl({ positionId: editing.id, takeProfitPrice: Number(editTp) > 0 ? Number(editTp) : null, stopLossPrice: Number(editSl) > 0 ? Number(editSl) : null }); setEditing(null); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-enter space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="ui-overline flex items-center gap-2"><CandlestickChart className="h-3.5 w-3.5" /> HIP-3 TRADING SANDBOX</div><h1 className="mt-1.5 font-display text-[29px] font-medium text-[#f0f5f1] sm:text-[36px]">Perpetual markets.</h1><p className="mt-1 text-[12px] text-[#89a092]">Practice long and short positions across crypto and stock-token markets.</p></div><span className="ui-pill !border-[#635641] !bg-[#2c291f] !text-[#dcc495]"><Info className="h-3 w-3" /> SIMULATED PRICES & ORDERS</span></div>

      <div className="ui-scroll flex items-center gap-2 overflow-x-auto pb-1">{markets.map((item) => <button key={item.id} type="button" onClick={() => onSelectMarketTokenId(item.id)} className={`flex shrink-0 items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 transition ${item.id === market.id ? "border-[#789d80] bg-[#23372c]" : "border-[#2c3b42] bg-[#121b20] hover:border-[#557363]"}`}><span className="flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-bold text-white" style={{ backgroundColor: item.logoColor }}>{item.ticker.slice(0, 3)}</span><span className="text-left"><span className="block text-[11px] font-semibold text-[#e7efe8]">{item.ticker}-PERP</span><span className="block font-mono text-[10px] text-[#8fa496]">{fmt(markFor(item))}</span></span>{item.isStockToken && <span className="rounded bg-[#284241] px-1.5 py-0.5 text-[9px] text-[#b1dad0]">STOCK</span>}</button>)}</div>

      <section className="ui-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: market.logoColor }}>{market.ticker.slice(0, 3)}</span><div><div className="flex items-center gap-2"><h2 className="font-display text-[18px] font-medium text-[#edf3ee]">{market.ticker}-PERP</h2><span className="ui-pill !py-1">{market.maxLeverage}x max</span></div><p className="mt-0.5 text-[10px] text-[#81988a]">{market.isStockToken ? `${market.underlyingTicker} reference · ` : ""}HIP-3 market preview</p></div></div><div className="flex flex-wrap items-center gap-x-5 gap-y-2"><div><div className="text-[10px] text-[#82988a]">Mark price</div><div className="font-mono text-[16px] font-medium text-[#c9eed6]">{fmt(mark)}</div></div><div><div className="text-[10px] text-[#82988a]">24h change</div><div className={`font-mono text-[13px] ${market.change24h >= 0 ? "text-[#a6dfb8]" : "text-[#e39b97]"}`}>{market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(2)}%</div></div><div><div className="text-[10px] text-[#82988a]">Open interest</div><div className="font-mono text-[13px] text-[#dee9df]">{compact(market.openInterestUsd)}</div></div><div><div className="text-[10px] text-[#82988a]">Funding / hour</div><div className="font-mono text-[13px] text-[#dee9df]">{(market.fundingRateHourly * 100).toFixed(3)}%</div></div></div></div></section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_265px] xl:grid-cols-[minmax(0,1fr)_265px_310px]">
        <section className="ui-card min-w-0 overflow-hidden"><div className="flex items-center justify-between gap-2 border-b border-[#26353b] px-4 py-3.5"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#9acdad]" /><span className="text-[12px] font-semibold">Price chart</span><span className="text-[10px] text-[#72887a]">· synthetic</span></div><div className="flex gap-1">{(["1m", "5m", "15m", "1h", "4h"] as const).map((option) => <button type="button" key={option} onClick={() => setTimeframe(option)} className={`rounded px-2 py-1.5 font-mono text-[10px] transition ${timeframe === option ? "bg-[#294536] text-[#d3ecd9]" : "text-[#768b7d] hover:bg-[#213038]"}`}>{option}</button>)}</div></div><div className="p-3 sm:p-4"><svg viewBox="0 0 660 270" preserveAspectRatio="none" className="h-[330px] w-full sm:h-[390px]" role="img" aria-label="Simulated perpetual candlestick chart">{[0.18, 0.42, 0.66, 0.9].map((ratio, index) => { const y = 25 + ratio * 190; return <g key={index}><line x1="5" x2="590" y1={y} y2={y} stroke="#27383b" strokeDasharray="3 5" /><text x="599" y={y + 3} fill="#778b7e" fontSize="10" fontFamily="monospace">{fmt(maximum - ratio * span)}</text></g>; })}{candles.map((candle, index) => { const x = 12 + index * 13.8; const rising = candle.close >= candle.open; const color = rising ? "#a6dbb5" : "#d18d8d"; const top = priceToY(Math.max(candle.open, candle.close)); const bottom = priceToY(Math.min(candle.open, candle.close)); return <g key={index}><rect x={x - 3.5} y={265 - candle.volume * 0.6} width="7" height={candle.volume * 0.6} fill={color} opacity=".18" /><line x1={x} x2={x} y1={priceToY(candle.high)} y2={priceToY(candle.low)} stroke={color} strokeWidth="1.2" /><rect x={x - 4} y={top} width="8" height={Math.max(2.4, bottom - top)} rx="1" fill={color} /></g>; })}<line x1="5" x2="590" y1={priceToY(mark)} y2={priceToY(mark)} stroke="#91d6ad" strokeWidth="1" strokeDasharray="4 4" opacity=".65" /></svg><div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#26353b] pt-3 text-[10px] text-[#799081]"><span>Indicative chart · Not HyperCore market data</span><span className="font-mono">Reference price {fmt(market.priceUsd)}</span></div></div></section>

        <section className="ui-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#26353b] px-4 py-3.5"><div className="text-[12px] font-semibold">Orderbook</div><span className="text-[9px] text-[#769284]">SYNTHETIC DEPTH</span></div><div className="p-3"><div className="grid grid-cols-3 px-1 pb-2 font-mono text-[9px] uppercase text-[#72877b]"><span>Price</span><span className="text-right">Size</span><span className="text-right">Total</span></div><div className="space-y-[2px]">{orderbook.asks.map((level, index) => <button key={index} type="button" onClick={() => { setOrderType("LIMIT"); setLimitInput(String(level.price)); }} className="relative grid w-full grid-cols-3 overflow-hidden rounded px-1 py-[5px] font-mono text-[10px] hover:bg-[#25343a]"><span className="absolute inset-y-0 right-0 bg-[#cc7f7f]/[0.08]" style={{ width: `${Math.min(95, level.size)}%` }} /><span className="relative text-left text-[#d99595]">{level.price}</span><span className="relative text-right text-[#a1b3a6]">{level.size}</span><span className="relative text-right text-[#778d7f]">{(level.price * level.size).toFixed(0)}</span></button>)}</div><div className="my-2 flex items-center justify-between border-y border-[#29393d] px-1 py-2"><span className="font-mono text-[14px] font-medium text-[#cee9d4]">{fmt(mark)}</span><span className="text-[9px] text-[#81978a]">Demo spread</span></div><div className="space-y-[2px]">{orderbook.bids.map((level, index) => <button key={index} type="button" onClick={() => { setOrderType("LIMIT"); setLimitInput(String(level.price)); }} className="relative grid w-full grid-cols-3 overflow-hidden rounded px-1 py-[5px] font-mono text-[10px] hover:bg-[#25343a]"><span className="absolute inset-y-0 right-0 bg-[#a3d7ad]/[0.08]" style={{ width: `${Math.min(95, level.size)}%` }} /><span className="relative text-left text-[#a6dfb8]">{level.price}</span><span className="relative text-right text-[#a1b3a6]">{level.size}</span><span className="relative text-right text-[#778d7f]">{(level.price * level.size).toFixed(0)}</span></button>)}</div></div><div className="border-t border-[#26353b] px-4 py-3 text-[10px] text-[#768c7e]">Select a price to create a limit order.</div></section>

        <form onSubmit={submitOrder} className="ui-card overflow-hidden lg:col-span-2 xl:col-span-1"><div className="flex items-center justify-between border-b border-[#26353b] px-4 py-3.5"><div><div className="ui-overline">ORDER ENTRY</div><h3 className="mt-1 font-display text-[17px] font-medium">Trade perpetuals</h3></div><SlidersHorizontal className="h-4 w-4 text-[#8aac97]" /></div><div className="space-y-3.5 p-4"><div className="grid grid-cols-2 gap-1 rounded-lg border border-[#2e3e40] bg-[#0e171b] p-1"><button type="button" onClick={() => setSide("LONG")} className={`flex items-center justify-center gap-1 rounded-md py-2 text-[11px] font-semibold transition ${side === "LONG" ? "bg-[#2c4d39] text-[#d9f2df]" : "text-[#84988b]"}`}><TrendingUp className="h-3.5 w-3.5" /> Long</button><button type="button" onClick={() => setSide("SHORT")} className={`flex items-center justify-center gap-1 rounded-md py-2 text-[11px] font-semibold transition ${side === "SHORT" ? "bg-[#503337] text-[#f2c8c2]" : "text-[#84988b]"}`}><TrendingDown className="h-3.5 w-3.5" /> Short</button></div><div className="flex items-center justify-between gap-2"><div className="flex gap-1">{(["MARKET", "LIMIT"] as const).map((option) => <button type="button" key={option} onClick={() => { setOrderType(option); if (option === "LIMIT" && !limitInput) setLimitInput(String(mark)); }} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${orderType === option ? "bg-[#294338] text-[#d6ebd8]" : "text-[#809586] hover:bg-[#1d2c30]"}`}>{option === "MARKET" ? "Market" : "Limit"}</button>)}</div><button type="button" onClick={() => setMarginMode(marginMode === "CROSS" ? "ISOLATED" : "CROSS")} className="inline-flex items-center gap-1 rounded-md border border-[#314349] px-2.5 py-1.5 text-[10px] text-[#a2b9a9]">{marginMode === "CROSS" ? "Cross" : "Isolated"}<ChevronDown className="h-3 w-3" /></button></div><div className="ui-divider" /><div><span className="ui-label">Margin source</span><div className="grid grid-cols-3 gap-1">{(["USDC", "HYPE", "X_MONEY"] as const).map((rail) => <button type="button" key={rail} onClick={() => setCollateralSource(rail)} className={`rounded-md border px-1 py-2 text-[10px] font-semibold ${collateralSource === rail ? "border-[#709981] bg-[#263f32] text-[#d5eeda]" : "border-[#314249] text-[#809589]"}`}>{rail === "X_MONEY" ? "X Money" : rail}</button>)}</div><div className="mt-1.5 text-right font-mono text-[9px] text-[#839a8b]">Available: {available}</div></div>{orderType === "LIMIT" && <label className="block"><span className="ui-label">Limit price · USD</span><input type="number" step="any" min="0.000001" required value={limitInput} onChange={(event) => setLimitInput(event.target.value)} className="ui-field font-mono" /></label>}<label className="block"><span className="ui-label">Collateral · USD equivalent</span><input type="number" min="10" step="any" value={collateralInput} onChange={(event) => setCollateralInput(event.target.value)} className="ui-field font-mono !text-[15px]" /></label><div className="flex gap-1">{[100, 500, 1500, 5000].map((value) => <button type="button" key={value} onClick={() => setCollateralInput(String(value))} className="flex-1 rounded-md border border-[#314249] bg-[#152228] py-1.5 font-mono text-[9px] text-[#a2b4a7]">${value}</button>)}</div><div><div className="mb-2 flex justify-between text-[11px]"><span className="text-[#9caf9f]">Leverage</span><span className="font-mono font-medium text-[#c4e4cd]">{leverage}x <span className="text-[#6f8978]">/ {market.maxLeverage}x</span></span></div><input type="range" min="1" max={market.maxLeverage} value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} className="w-full cursor-pointer accent-[#a8dfba]" /></div><div className="grid grid-cols-2 gap-2"><label><span className="ui-label">Take profit · USD</span><input type="number" step="any" min="0" value={tpInput} onChange={(event) => setTpInput(event.target.value)} placeholder="Optional" className="ui-field !min-h-[36px] !px-2.5 font-mono !text-[11px]" /></label><label><span className="ui-label">Stop loss · USD</span><input type="number" step="any" min="0" value={slInput} onChange={(event) => setSlInput(event.target.value)} placeholder="Optional" className="ui-field !min-h-[36px] !px-2.5 font-mono !text-[11px]" /></label></div><div className="ui-card-soft space-y-2 p-3 text-[10px]"><div className="flex justify-between"><span className="text-[#8ca396]">Position size</span><span className="font-mono text-[#e0ebe3]">${size.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-[#8ca396]">Est. liquidation</span><span className="font-mono text-[#e4bd9c]">{fmt(Math.max(0.0001, liquidation))}</span></div><div className="flex justify-between"><span className="text-[#8ca396]">Demo fee (0.025%)</span><span className="font-mono text-[#d2e1d5]">${fee.toFixed(2)}</span></div></div><button type="submit" disabled={submitting || collateral < 10} className={`w-full ${side === "LONG" ? "ui-btn-primary" : "ui-btn-secondary !border-[#794d50] !bg-[#6b3f43] !text-[#fff0ed] hover:!bg-[#805054]"}`}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : side === "LONG" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{submitting ? "Submitting demo order..." : user ? `${side === "LONG" ? "Long" : "Short"} ${market.ticker} · ${leverage}x` : "Sign in to trade"}</button><p className="text-center text-[10px] leading-[1.5] text-[#71887b]">Orders execute only in the app’s sandbox database.</p></div></form>
      </div>

      <section className="ui-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#26353b] px-4 py-3 sm:px-5"><div className="flex gap-1">{[{ id: "OPEN", title: "Positions", count: open.length }, { id: "PENDING", title: "Open orders", count: pending.length }, { id: "CLOSED", title: "History", count: closed.length }].map((tab) => <button type="button" key={tab.id} onClick={() => setPositionsTab(tab.id as typeof positionsTab)} className={`rounded-md px-3 py-2 text-[11px] font-semibold transition ${positionsTab === tab.id ? "bg-[#264134] text-[#d7edde]" : "text-[#82988b] hover:text-white"}`}>{tab.title} <span className="ml-1 font-mono text-[9px] opacity-70">{tab.count}</span></button>)}</div><span className="text-[10px] text-[#748b7e]">Your simulated trading activity</span></div><div className="ui-scroll overflow-x-auto">{currentPositions.length === 0 ? <div className="flex min-h-[145px] flex-col items-center justify-center gap-2 text-center"><ShieldAlert className="h-5 w-5 text-[#6d8877]" /><p className="text-[11px] text-[#859a8d]">{positionsTab === "OPEN" ? "No open positions. Create a demo order to get started." : positionsTab === "PENDING" ? "No pending limit orders." : "No closed positions yet."}</p></div> : <table className="w-full min-w-[850px] text-left"><thead className="ui-table-head"><tr><th className="px-5 py-3">Market</th><th className="px-3 py-3">Side</th><th className="px-3 py-3 text-right">Notional</th><th className="px-3 py-3 text-right">Entry</th><th className="px-3 py-3 text-right">Mark / Exit</th><th className="px-3 py-3 text-right">PnL</th><th className="px-3 py-3 text-right">TP / SL</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody>{currentPositions.map((position) => { const related = tokens.find((token) => token.id === position.tokenId); const currentMark = related ? markFor(related) : position.entryPrice; const pnl = position.status === "CLOSED" ? position.realizedPnlUsd : (position.side === "LONG" ? currentMark - position.entryPrice : position.entryPrice - currentMark) * position.sizeUnits; return <tr key={position.id} className="ui-table-row"><td className="px-5 py-3.5 text-[11px] font-semibold text-[#e2eee4]">{position.symbol}</td><td className="px-3 py-3.5"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${position.side === "LONG" ? "bg-[#264333] text-[#bde4c4]" : "bg-[#4b3033] text-[#edb2ac]"}`}>{position.side} {position.leverage}x</span></td><td className="px-3 py-3.5 text-right font-mono text-[10px] text-[#c7d7c9]">${position.sizeUsd.toLocaleString()}</td><td className="px-3 py-3.5 text-right font-mono text-[10px] text-[#aebfb1]">{fmt(position.entryPrice)}</td><td className="px-3 py-3.5 text-right font-mono text-[10px] text-[#aebfb1]">{fmt(position.status === "CLOSED" ? position.closePrice || position.entryPrice : currentMark)}</td><td className={`px-3 py-3.5 text-right font-mono text-[10px] ${pnl >= 0 ? "text-[#a6dfb8]" : "text-[#e39b97]"}`}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</td><td className="px-3 py-3.5 text-right font-mono text-[10px] text-[#8fa798]">{position.takeProfitPrice || "—"} / {position.stopLossPrice || "—"}</td><td className="px-5 py-3.5 text-right">{position.status !== "CLOSED" && <div className="inline-flex gap-1">{position.status === "OPEN" && <button type="button" aria-label={`Edit triggers for ${position.symbol}`} onClick={() => { setEditing(position); setEditTp(String(position.takeProfitPrice || "")); setEditSl(String(position.stopLossPrice || "")); }} className="ui-btn-quiet !h-7 !min-h-0 !px-2"><Edit3 className="h-3 w-3" /></button>}<button type="button" disabled={closingId === position.id} onClick={() => closePosition(position)} className="rounded-md border border-[#6c4a4c] px-2.5 py-1.5 text-[10px] font-semibold text-[#e1a7a4] transition hover:bg-[#3b262a] disabled:opacity-50">{closingId === position.id ? "Processing..." : position.status === "LIMIT_PENDING" ? "Cancel" : "Close"}</button></div>}</td></tr>; })}</tbody></table>}</div></section>

      {editing && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#020609]/85 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="trigger-title" className="ui-card w-full max-w-[390px] p-5"><div className="flex items-center justify-between"><h2 id="trigger-title" className="font-display text-[18px] font-medium">Edit triggers</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close trigger editor" className="ui-btn-quiet !h-8 !w-8 !min-h-0 !p-0"><X className="h-4 w-4" /></button></div><p className="mt-1 text-[11px] text-[#879c8e]">{editing.symbol} · {editing.side} · demo position</p><div className="mt-5 space-y-3"><label className="block"><span className="ui-label">Take profit · USD</span><input type="number" step="any" min="0" value={editTp} onChange={(event) => setEditTp(event.target.value)} placeholder="Optional" className="ui-field font-mono" /></label><label className="block"><span className="ui-label">Stop loss · USD</span><input type="number" step="any" min="0" value={editSl} onChange={(event) => setEditSl(event.target.value)} placeholder="Optional" className="ui-field font-mono" /></label><button type="button" onClick={saveTriggers} disabled={saving} className="ui-btn-primary mt-2 w-full">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save trigger levels</button></div></div></div>}
    </div>
  );
}
