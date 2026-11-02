"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Info, RefreshCw, X } from "lucide-react";
import type { ActiveTab, BootstrapPayload, PerpPositionRecord, PlatformToken, SpotTradeRecord, TickerAuctionRecord, TokenHoldingRecord, UserProfile, XMoneyReceiptRecord } from "@/types/platform";
import { TopNavHeader } from "./TopNavHeader";
import { LaunchpadDashboard } from "./LaunchpadDashboard";
import { StockTokensHub } from "./StockTokensHub";
import { GraduationPipelineView } from "./GraduationPipelineView";
import { Hip3PerpsTerminal } from "./Hip3PerpsTerminal";
import { CreateTokenView } from "./CreateTokenView";
import { ElysiumDocsView } from "./ElysiumDocsView";
import { TokenTradeModal } from "./TokenTradeModal";
import { AuthModal, WalletAndXMoneyModal } from "./AuthAndWalletModals";

type ToastTone = "success" | "error" | "info";
interface Toast { id: number; title: string; detail?: string; tone: ToastTone; }

async function requestJson<T>(url: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "The request could not be completed.");
  return data as T;
}

export function ElysiumForgeApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("LAUNCHPAD");
  const [createDefaultCategory, setCreateDefaultCategory] = useState("CRYPTO");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [networkMode, setNetworkMode] = useState<"testnet" | "mainnet_preview">("testnet");
  const [tokens, setTokens] = useState<PlatformToken[]>([]);
  const [recentTrades, setRecentTrades] = useState<SpotTradeRecord[]>([]);
  const [tickerAuctions, setTickerAuctions] = useState<TickerAuctionRecord[]>([]);
  const [holdings, setHoldings] = useState<TokenHoldingRecord[]>([]);
  const [perpPositions, setPerpPositions] = useState<PerpPositionRecord[]>([]);
  const [xReceipts, setXReceipts] = useState<XMoneyReceiptRecord[]>([]);
  const [hypePriceUsd, setHypePriceUsd] = useState(78.5);
  const [hip1AuctionHype, setHip1AuctionHype] = useState(42.5);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"VOLUME" | "BONDING" | "MCAP" | "GAINERS">("VOLUME");
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [selectedPerpTokenId, setSelectedPerpTokenId] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((title: string, detail?: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((previous) => [...previous.slice(-3), { id, title, detail, tone }]);
    window.setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 4800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) throw new Error("The workspace could not be loaded. Please try again.");
      const data: BootstrapPayload = await response.json();
      setUser(data.user);
      if (data.user?.networkMode === "testnet" || data.user?.networkMode === "mainnet_preview") setNetworkMode(data.user.networkMode);
      setTokens(data.tokens); setRecentTrades(data.recentTrades); setTickerAuctions(data.tickerAuctions);
      setHoldings(data.holdings); setPerpPositions(data.perpPositions); setXReceipts(data.xMoneyReceipts);
      setHypePriceUsd(data.hypePriceUsd); setHip1AuctionHype(data.hip1CurrentAuctionHype);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "The workspace could not be loaded.");
    } finally { setInitialLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectedToken = useMemo(() => tokens.find((token) => token.id === selectedTokenId) || null, [tokens, selectedTokenId]);
  const filteredTokens = useMemo(() => tokens.filter((token) => {
    if (categoryFilter !== "ALL" && token.category !== categoryFilter) return false;
    if (stageFilter !== "ALL" && token.stage !== stageFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return token.name.toLowerCase().includes(query) || token.ticker.toLowerCase().includes(query) || !!token.underlyingTicker?.toLowerCase().includes(query);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "BONDING") return (b.stage === "BONDING" ? b.bondingProgress + 100 : b.bondingProgress) - (a.stage === "BONDING" ? a.bondingProgress + 100 : a.bondingProgress);
    if (sortBy === "MCAP") return b.marketCapUsd - a.marketCapUsd;
    if (sortBy === "GAINERS") return b.change24h - a.change24h;
    return b.volume24hUsd - a.volume24hUsd;
  }), [tokens, categoryFilter, stageFilter, searchQuery, sortBy]);
  const totalMcap = useMemo(() => tokens.reduce((sum, token) => sum + token.marketCapUsd, 0), [tokens]);
  const totalVol = useMemo(() => tokens.reduce((sum, token) => sum + token.volume24hUsd, 0), [tokens]);
  const totalOi = useMemo(() => tokens.reduce((sum, token) => sum + token.openInterestUsd, 0), [tokens]);
  const openPerpCount = useMemo(() => perpPositions.filter((position) => position.status === "OPEN").length, [perpPositions]);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try { await requestJson("/api/auth/login", "POST", { demo: true }); await refresh(); notify("Demo account connected", "Your sandbox balances and positions are ready."); }
    catch (error) { notify("Could not open demo account", error instanceof Error ? error.message : undefined, "error"); }
    finally { setDemoLoading(false); }
  };
  const handleLogout = async () => {
    try { await requestJson("/api/auth/logout", "POST"); setUser(null); setHoldings([]); setPerpPositions([]); setXReceipts([]); notify("Signed out", "Your session has ended.", "info"); }
    catch (error) { notify("Sign-out failed", error instanceof Error ? error.message : undefined, "error"); }
  };
  const handleNetworkChange = async (mode: "testnet" | "mainnet_preview") => {
    setNetworkMode(mode);
    if (user) {
      try { await requestJson("/api/wallet/faucet", "POST", { action: "TOGGLE_NETWORK", networkMode: mode }); }
      catch (error) { notify("Could not save preference", error instanceof Error ? error.message : undefined, "error"); }
    }
    notify(mode === "testnet" ? "Testnet configuration selected" : "Mainnet preparation preview selected", "This changes the UI configuration only. It does not switch a real wallet or network.", "info");
  };
  const handleFaucet = async () => {
    try { const data = await requestJson<{ user: UserProfile }>("/api/wallet/faucet", "POST", { action: "FAUCET" }); setUser(data.user); notify("Demo balances added", "+1,000 HYPE, +25,000 USDC, and +200 kHYPE added to your sandbox wallet."); }
    catch (error) { notify("Balance update failed", error instanceof Error ? error.message : undefined, "error"); }
  };
  const handleXTopUp = async (handle: string) => {
    try { const data = await requestJson<{ user: UserProfile }>("/api/wallet/faucet", "POST", { action: "X_MONEY_TOPUP", xHandle: handle, amountUsd: 10000 }); setUser(data.user); notify("Demo payment balance added", `$10,000 was added to the simulated X Money balance for ${data.user.xHandle}.`); }
    catch (error) { notify("Balance update failed", error instanceof Error ? error.message : undefined, "error"); }
  };

  const handleSpotTrade = async (params: { tokenId: number; side: "BUY" | "SELL"; amount: number; paymentMethod: string }) => {
    if (!user) { setAuthModalOpen(true); return; }
    const snapshot = tokens;
    const target = tokens.find((item) => item.id === params.tokenId);
    if (target) {
      const estimatedUsd = params.side === "SELL" ? params.amount * target.priceUsd : params.paymentMethod === "HYPE" ? params.amount * hypePriceUsd : params.amount;
      setTokens((previous) => previous.map((item) => item.id === target.id ? { ...item, volume24hUsd: item.volume24hUsd + estimatedUsd } : item));
    }
    try {
      const data = await requestJson<{ token: PlatformToken; trade: SpotTradeRecord; graduatedNow: boolean }>(`/api/tokens/${params.tokenId}/trade`, "POST", params);
      await refresh();
      notify(data.graduatedNow ? `${data.token.ticker} completed the pool stage` : `${params.side === "BUY" ? "Buy" : "Sell"} order recorded`, data.graduatedNow ? "The token is now ready for the optional ticker acquisition preview." : `${data.trade.amountToken.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${data.token.ticker} at an indicative ${data.token.priceUsd.toFixed(4)} USD. Sandbox execution only.`);
    } catch (error) { setTokens(snapshot); notify("Trade could not be recorded", error instanceof Error ? error.message : undefined, "error"); }
  };
  const handleLifecycleAction = async (params: { tokenId: number; action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP"; paymentMethod: string }) => {
    if (!user) { setAuthModalOpen(true); return; }
    try {
      const data = await requestJson<{ token: PlatformToken }>(`/api/tokens/${params.tokenId}/lifecycle`, "POST", params);
      await refresh();
      if (params.action === "ACCELERATE_GRADUATE") notify("Pool stage completed", `${data.token.ticker} has completed the Uniswap V3 preview stage in the sandbox.`);
      else if (params.action === "BUY_TICKER_HYPERCORE") notify("Ticker acquisition recorded", `${data.token.ticker} moved to the simulated HyperCore spot stage.`);
      else notify("Perpetual market preview active", `${data.token.ticker}-PERP is now available in the trading sandbox.`);
    } catch (error) { notify("Lifecycle action failed", error instanceof Error ? error.message : undefined, "error"); }
  };
  const handlePerpOrder = async (payload: { tokenId: number; side: "LONG" | "SHORT"; marginMode: "CROSS" | "ISOLATED"; orderType: "MARKET" | "LIMIT"; collateralSource: "USDC" | "HYPE" | "X_MONEY"; collateralUsd: number; leverage: number; clientMarkPrice: number; limitPrice?: number | null; takeProfitPrice?: number | null; stopLossPrice?: number | null }) => {
    if (!user) { setAuthModalOpen(true); return; }
    const market = tokens.find((token) => token.id === payload.tokenId);
    const temporaryId = -Date.now();
    const entry = payload.limitPrice || payload.clientMarkPrice;
    const sizeUsd = payload.collateralUsd * payload.leverage;
    const optimistic: PerpPositionRecord = { id: temporaryId, userId: user.id, tokenId: payload.tokenId, symbol: market?.hip3PerpSymbol || `${market?.ticker || "ASSET"}-PERP`, side: payload.side, marginMode: payload.marginMode, orderType: payload.orderType, status: payload.orderType === "LIMIT" ? "LIMIT_PENDING" : "OPEN", leverage: payload.leverage, collateralUsd: payload.collateralUsd, sizeUsd, sizeUnits: Number((sizeUsd / entry).toFixed(4)), entryPrice: entry, limitPrice: payload.limitPrice || null, liquidationPrice: Number((entry * (payload.side === "LONG" ? 1 - 0.9 / payload.leverage : 1 + 0.9 / payload.leverage)).toFixed(4)), takeProfitPrice: payload.takeProfitPrice || null, stopLossPrice: payload.stopLossPrice || null, realizedPnlUsd: 0, closePrice: null, createdAt: new Date().toISOString(), closedAt: null };
    setPerpPositions((previous) => [optimistic, ...previous]);
    try {
      const data = await requestJson<{ position: PerpPositionRecord }>("/api/perps/order", "POST", payload);
      await refresh();
      notify(data.position.status === "LIMIT_PENDING" ? "Limit order placed" : "Position opened", `${data.position.side} ${data.position.symbol} · ${data.position.leverage}x · ${data.position.sizeUsd.toLocaleString()} USD notional. Simulated execution.`);
    } catch (error) { setPerpPositions((previous) => previous.filter((position) => position.id !== temporaryId)); notify("Order could not be placed", error instanceof Error ? error.message : undefined, "error"); }
  };
  const handleClosePerp = async (params: { positionId: number; clientMarkPrice: number }) => {
    const snapshot = perpPositions;
    setPerpPositions((previous) => previous.map((item) => item.id === params.positionId ? { ...item, status: "CLOSED" } : item));
    try { const data = await requestJson<{ payoutUsd: number; realizedPnl: number; position: PerpPositionRecord }>("/api/perps/close", "POST", params); await refresh(); notify(data.position.orderType === "LIMIT" && data.position.realizedPnlUsd === 0 ? "Demo order closed" : "Position closed", `${data.realizedPnl >= 0 ? "+" : ""}${data.realizedPnl.toFixed(2)} USD realized PnL in the sandbox.`); }
    catch (error) { setPerpPositions(snapshot); notify("Could not close position", error instanceof Error ? error.message : undefined, "error"); }
  };
  const handleUpdateTriggers = async (params: { positionId: number; takeProfitPrice: number | null; stopLossPrice: number | null }) => {
    try { await requestJson(`/api/perps/${params.positionId}`, "PATCH", params); await refresh(); notify("Trigger levels updated", "Take-profit and stop-loss values were saved in the sandbox."); }
    catch (error) { notify("Could not update triggers", error instanceof Error ? error.message : undefined, "error"); }
  };
  const jumpToPerps = (token: PlatformToken) => { setSelectedPerpTokenId(token.id); setActiveTab("HIP3_PERPS"); };

  return (
    <div className="min-h-screen bg-[#080e12] text-[#e8efec]">
      <TopNavHeader activeTab={activeTab} onSelectTab={(tab) => { if (tab === "CREATE_TOKEN") setCreateDefaultCategory("CRYPTO"); setActiveTab(tab); }} user={user} networkMode={networkMode} onToggleNetworkMode={handleNetworkChange} hypePriceUsd={hypePriceUsd} hip1AuctionHype={hip1AuctionHype} openPerpCount={openPerpCount} onOpenAuthModal={() => setAuthModalOpen(true)} onQuickDemoLogin={handleDemoLogin} demoLoading={demoLoading} onOpenWalletModal={() => setWalletModalOpen(true)} onLogout={handleLogout} />

      {!!recentTrades.length && <div className="border-b border-[#203037] bg-[#0d161a]"><div className="ui-scroll mx-auto flex h-9 max-w-[1500px] items-center gap-5 overflow-x-auto px-4 sm:px-6 lg:px-8"><span className="flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-[#9bb9a5]"><span className="h-1.5 w-1.5 rounded-full bg-[#9ac6a7]" /> DEMO ACTIVITY</span><span className="h-3 w-px shrink-0 bg-[#2c4242]" />{recentTrades.slice(0, 6).map((trade) => { const token = tokens.find((item) => item.id === trade.tokenId); return <button key={trade.id} type="button" onClick={() => token && setSelectedTokenId(token.id)} className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] transition hover:text-white"><span className={trade.side === "BUY" ? "text-[#a6dfb8]" : "text-[#e39b97]"}>{trade.side}</span><span className="text-[#d1dfd4]">{token?.ticker || "TOKEN"}</span><span className="text-[#768f7e]">${trade.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></button>; })}</div></div>}

      <main className="mx-auto w-full max-w-[1500px] px-4 py-7 pb-16 sm:px-6 sm:py-9 lg:px-8">
        {initialLoading ? <div className="space-y-5"><div className="skeleton h-[330px] w-full" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[1, 2, 3, 4].map((index) => <div key={index} className="skeleton h-28" />)}</div><div className="skeleton h-[340px] w-full" /></div>
          : loadError ? <div className="ui-card mx-auto max-w-xl p-8 text-center"><AlertCircle className="mx-auto h-7 w-7 text-[#deb19e]" /><h2 className="mt-3 font-display text-[20px] font-medium">Could not load the workspace</h2><p className="mt-2 text-[12px] text-[#9bad9e]">{loadError}</p><button type="button" onClick={() => { setInitialLoading(true); void refresh(); }} className="ui-btn-primary mt-5"><RefreshCw className="h-4 w-4" /> Retry</button></div>
          : activeTab === "LAUNCHPAD" ? <LaunchpadDashboard tokens={filteredTokens} allTokens={tokens} holdings={holdings} networkMode={networkMode} hypePriceUsd={hypePriceUsd} hip1AuctionHype={hip1AuctionHype} totalMcap={totalMcap} totalVol={totalVol} totalOi={totalOi} searchQuery={searchQuery} onSearch={setSearchQuery} categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter} stageFilter={stageFilter} onStageChange={setStageFilter} sortBy={sortBy} onSortChange={setSortBy} onSelectTab={(tab) => { if (tab === "CREATE_TOKEN") setCreateDefaultCategory("CRYPTO"); setActiveTab(tab); }} onSelectToken={(token) => setSelectedTokenId(token.id)} onJumpToPerps={jumpToPerps} />
          : activeTab === "STOCK_TOKENS" ? <StockTokensHub tokens={tokens} onSelectToken={(token) => setSelectedTokenId(token.id)} onJumpToPerps={jumpToPerps} onLaunchNewStockToken={() => { setCreateDefaultCategory("STOCK_TOKEN"); setActiveTab("CREATE_TOKEN"); }} />
          : activeTab === "LIFECYCLE_PIPELINE" ? <GraduationPipelineView tokens={tokens} tickerAuctions={tickerAuctions} hip1AuctionHype={hip1AuctionHype} hypePriceUsd={hypePriceUsd} onSelectToken={(token) => setSelectedTokenId(token.id)} onExecuteLifecycleAction={handleLifecycleAction} onJumpToPerps={jumpToPerps} />
          : activeTab === "HIP3_PERPS" ? <Hip3PerpsTerminal tokens={tokens} selectedMarketTokenId={selectedPerpTokenId} onSelectMarketTokenId={setSelectedPerpTokenId} user={user} positions={perpPositions} hypePriceUsd={hypePriceUsd} onOpenPerpOrder={handlePerpOrder} onClosePerpPosition={handleClosePerp} onUpdateTpSl={handleUpdateTriggers} />
          : activeTab === "CREATE_TOKEN" ? <CreateTokenView user={user} hypePriceUsd={hypePriceUsd} defaultCategory={createDefaultCategory} onRequireAuth={() => setAuthModalOpen(true)} onTokenCreated={async (token, receipt) => { await refresh(); setActiveTab("LAUNCHPAD"); setSelectedTokenId(token.id); notify(`${token.ticker} created in sandbox`, receipt ? `Simulated X Money receipt ${receipt} was added to your account.` : "Your token is ready for demo trading. No on-chain contract was deployed."); }} />
          : <ElysiumDocsView />}
      </main>

      <footer className="border-t border-[#243238] bg-[#0c1418]"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[10px] text-[#7f9487] sm:px-6 lg:px-8"><span className="font-display text-[13px] font-medium text-[#dbe9df]">elysium<span className="text-[#a9d7b8]">forge.</span></span><span>Testnet concept workspace · All market and payment actions are simulated.</span><button type="button" onClick={() => setActiveTab("DOCS_ELYSIUM")} className="text-[#a9cfb6] hover:text-white">Read network guide</button></div></footer>

      <TokenTradeModal token={selectedToken} onClose={() => setSelectedTokenId(null)} user={user} holding={holdings.find((item) => item.tokenId === selectedTokenId)} trades={recentTrades} hypePriceUsd={hypePriceUsd} hip1AuctionHype={hip1AuctionHype} onExecuteSpotTrade={handleSpotTrade} onExecuteLifecycleAction={handleLifecycleAction} onJumpToPerps={jumpToPerps} />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthenticated={async (account) => { setUser(account); await refresh(); notify(`Welcome, ${account.username}`, "Your sandbox workspace is ready."); }} />
      <WalletAndXMoneyModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} user={user} receipts={xReceipts} onClaimFaucet={handleFaucet} onTopUpXMoney={handleXTopUp} />

      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-32px)] max-w-[360px] flex-col gap-2">{toasts.map((toast) => <div key={toast.id} className={`ui-card animate-enter pointer-events-auto flex items-start gap-3 !rounded-[11px] p-3.5 shadow-[0_15px_45px_-18px_rgba(0,0,0,.8)] ${toast.tone === "error" ? "!border-[#6e4948]" : toast.tone === "info" ? "!border-[#4c6762]" : "!border-[#4d7759]"}`}>{toast.tone === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e3a6a0]" /> : toast.tone === "info" ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a7c6b6]" /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#b3ebc9]" />}<div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-[#e7efe8]">{toast.title}</div>{toast.detail && <p className="mt-0.5 text-[10px] leading-[1.6] text-[#8da396]">{toast.detail}</p>}</div><button type="button" onClick={() => setToasts((previous) => previous.filter((item) => item.id !== toast.id))} className="text-[#718579] hover:text-white" aria-label="Dismiss notification"><X className="h-3.5 w-3.5" /></button></div>)}</div>
    </div>
  );
}
