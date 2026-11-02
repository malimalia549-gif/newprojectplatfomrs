"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CandlestickChart,
  CheckCircle2,
  Flame,
  GitBranch,
  PlusCircle,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { LIFECYCLE_STAGES_META } from "@/lib/constants";
import type {
  ActiveTab,
  BootstrapPayload,
  PerpPositionRecord,
  PlatformToken,
  SpotTradeRecord,
  TickerAuctionRecord,
  TokenHoldingRecord,
  UserProfile,
  XMoneyReceiptRecord,
} from "@/types/platform";
import { TopNavHeader } from "./TopNavHeader";
import { LaunchpadDashboard } from "./LaunchpadDashboard";
import { TokenTradeModal } from "./TokenTradeModal";
import { CreateTokenView } from "./CreateTokenView";
import { GraduationPipelineView } from "./GraduationPipelineView";
import { Hip3PerpsTerminal } from "./Hip3PerpsTerminal";
import { StockTokensHub } from "./StockTokensHub";
import { ElysiumDocsView } from "./ElysiumDocsView";
import { AuthModal, WalletAndXMoneyModal } from "./AuthAndWalletModals";

interface ToastItem {
  id: number;
  title: string;
  detail?: string;
  tone: "success" | "error" | "info";
}

export function ElysiumForgeApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("LAUNCHPAD");
  const [createDefaultCategory, setCreateDefaultCategory] =
    useState<string>("CRYPTO");

  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [networkMode, setNetworkMode] = useState<"testnet" | "mainnet_preview">(
    "testnet"
  );
  const [tokens, setTokens] = useState<PlatformToken[]>([]);
  const [recentTrades, setRecentTrades] = useState<SpotTradeRecord[]>([]);
  const [tickerAuctions, setTickerAuctions] = useState<TickerAuctionRecord[]>(
    []
  );
  const [holdings, setHoldings] = useState<TokenHoldingRecord[]>([]);
  const [perpPositions, setPerpPositions] = useState<PerpPositionRecord[]>([]);
  const [xReceipts, setXReceipts] = useState<XMoneyReceiptRecord[]>([]);
  const [hypePriceUsd, setHypePriceUsd] = useState<number>(78.5);
  const [hip1AuctionHype, setHip1AuctionHype] = useState<number>(41.2);

  // Filters on Launchpad
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "VOLUME" | "BONDING" | "MCAP" | "GAINERS"
  >("VOLUME");

  // Modals & Selected States
  const [selectedSpotTokenId, setSelectedSpotTokenId] = useState<number | null>(
    null
  );
  const [selectedPerpTokenId, setSelectedPerpTokenId] = useState<number | null>(
    null
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (title: string, detail?: string, tone: ToastItem["tone"] = "success") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-3), { id, title, detail, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) return;
      const data: BootstrapPayload = await res.json();
      setUser(data.user);
      if (
        data.user?.networkMode === "mainnet_preview" ||
        data.user?.networkMode === "testnet"
      ) {
        setNetworkMode(data.user.networkMode);
      }
      setTokens(data.tokens);
      setRecentTrades(data.recentTrades);
      setTickerAuctions(data.tickerAuctions);
      setHoldings(data.holdings);
      setPerpPositions(data.perpPositions);
      setXReceipts(data.xMoneyReceipts);
      setHypePriceUsd(data.hypePriceUsd);
      setHip1AuctionHype(data.hip1CurrentAuctionHype);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const selectedSpotToken = useMemo(
    () => tokens.find((t) => t.id === selectedSpotTokenId) || null,
    [tokens, selectedSpotTokenId]
  );

  const handleQuickDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      if (res.ok) {
        await refreshState();
        pushToast(
          "Connected Demo Whale (@elysium_whale)",
          "Loaded 3,200 HYPE · $85,000 USDC · $35,000 𝕏 Money + Live HIP-3 Perps"
        );
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setHoldings([]);
    setPerpPositions([]);
    setXReceipts([]);
    pushToast("Signed Out", "Disconnected session cleanly", "info");
  };

  const handleToggleNetworkMode = async (
    mode: "testnet" | "mainnet_preview"
  ) => {
    setNetworkMode(mode);
    pushToast(
      mode === "testnet"
        ? "Switched to Elysium Testnet (Chain 99801)"
        : "Switched to Elysium Mainnet Pre-Launch Staging (999)",
      mode === "testnet"
        ? "RPC: testnet-rpc.elysium.kinetiq.xyz · 128ms ArbOS 61"
        : "Pre-launch staging with HyperCore Market-Data Precompile & ElysiumCoreWriter",
      "info"
    );
    if (user) {
      await fetch("/api/wallet/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_NETWORK", networkMode: mode }),
      });
    }
  };

  const handleClaimFaucet = async () => {
    const res = await fetch("/api/wallet/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "FAUCET" }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setUser(data.user);
      pushToast(
        "Elysium Testnet Faucet Credited!",
        "+1,000 HYPE · +$25,000 USDC · +200 kHYPE settled in 128ms"
      );
    }
  };

  const handleTopUpXMoney = async (xHandle: string) => {
    const res = await fetch("/api/wallet/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "X_MONEY_TOPUP",
        xHandle,
        amountUsd: 10000,
      }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      setUser(data.user);
      pushToast(
        "𝕏 Money Account Topped Up!",
        `+$10,000.00 USD credited to ${data.user.xHandle} via Cross River rails`
      );
    }
  };

  // Spot / Bonding Curve Trade with Optimistic UI Update
  const handleExecuteSpotTrade = async (params: {
    tokenId: number;
    side: "BUY" | "SELL";
    amount: number;
    paymentMethod: string;
  }) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const target = tokens.find((t) => t.id === params.tokenId);
    const prevTokens = tokens;

    // Optimistic micro-bump on token volume
    if (target) {
      const estUsd =
        params.side === "BUY"
          ? params.paymentMethod === "HYPE"
            ? params.amount * hypePriceUsd
            : params.amount
          : params.amount * target.priceUsd;

      setTokens((curr) =>
        curr.map((t) =>
          t.id === params.tokenId
            ? {
                ...t,
                volume24hUsd: t.volume24hUsd + estUsd,
              }
            : t
        )
      );
    }

    const res = await fetch(`/api/tokens/${params.tokenId}/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();

    if (!res.ok) {
      setTokens(prevTokens);
      pushToast("Trade Reverted", data.error || "Execution failed", "error");
      return;
    }

    await refreshState();
    if (data.graduatedNow) {
      pushToast(
        `🎓 ${data.token.ticker} GRADUATED TO UNISWAP V3!`,
        `100% HYPE Curve filled! Pool ${data.token.uniswapPoolAddress.slice(
          0,
          12
        )}... live — ready for HIP-1 Beli Ticker!`
      );
    } else {
      pushToast(
        `${params.side} ${data.token.ticker} Executed (128ms)`,
        `${data.trade.amountToken.toFixed(3)} ${
          data.token.ticker
        } @ $${data.token.priceUsd}`
      );
    }
  };

  // Graduation Lifecycle Step Execution
  const handleExecuteLifecycleAction = async (params: {
    tokenId: number;
    action: "ACCELERATE_GRADUATE" | "BUY_TICKER_HYPERCORE" | "DEPLOY_HIP3_PERP";
    paymentMethod: string;
  }) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const res = await fetch(`/api/tokens/${params.tokenId}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();

    if (!res.ok) {
      pushToast("Lifecycle Step Failed", data.error, "error");
      return;
    }

    await refreshState();

    if (params.action === "ACCELERATE_GRADUATE") {
      pushToast(
        `🎓 ${data.token.ticker} Graduated → Elysium Uniswap V3 Pool!`,
        data.token.targetPath === "UNISWAP_ONLY"
          ? "Liquidity locked on Uniswap V3 — SELESAI ✓"
          : "Uniswap V3 live! Next: Beli Ticker (HIP-1 Auction) → HyperCore Orderbook"
      );
    } else if (params.action === "BUY_TICKER_HYPERCORE") {
      pushToast(
        `⚡ Ticker $${data.token.ticker} Won on HIP-1 Auction!`,
        `Mirror Bridge + Deposit Wallet linked → HyperCore Spot (${data.token.hyperCoreSpotId}) LIVE!`
      );
    } else if (params.action === "DEPLOY_HIP3_PERP") {
      pushToast(
        `🚀 ${data.token.hip3PerpSymbol} Live on HIP-3 Perps!`,
        `Backed by 500,000 HYPE Builder Vault (${data.token.maxLeverage}x leverage ready now!)`
      );
    }
  };

  // Open HIP-3 Perp Order with Optimistic UI
  const handleOpenPerpOrder = async (payload: {
    tokenId: number;
    side: "LONG" | "SHORT";
    marginMode: "CROSS" | "ISOLATED";
    orderType: "MARKET" | "LIMIT";
    collateralSource: "USDC" | "HYPE" | "X_MONEY";
    collateralUsd: number;
    leverage: number;
    clientMarkPrice: number;
    limitPrice?: number | null;
    takeProfitPrice?: number | null;
    stopLossPrice?: number | null;
  }) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const market = tokens.find((t) => t.id === payload.tokenId);
    const tempId = -Date.now();
    const entry = payload.limitPrice || payload.clientMarkPrice;
    const sizeUsd = payload.collateralUsd * payload.leverage;

    // Optimistic insert
    const optimisticPos: PerpPositionRecord = {
      id: tempId,
      userId: user.id,
      tokenId: payload.tokenId,
      symbol: market?.hip3PerpSymbol || `${market?.ticker || "ASSET"}-PERP`,
      side: payload.side,
      marginMode: payload.marginMode,
      orderType: payload.orderType,
      status: payload.orderType === "LIMIT" ? "LIMIT_PENDING" : "OPEN",
      leverage: payload.leverage,
      collateralUsd: payload.collateralUsd,
      sizeUsd,
      sizeUnits: Number((sizeUsd / entry).toFixed(4)),
      entryPrice: entry,
      limitPrice: payload.limitPrice || null,
      liquidationPrice:
        payload.side === "LONG"
          ? Number((entry * (1 - 0.9 / payload.leverage)).toFixed(4))
          : Number((entry * (1 + 0.9 / payload.leverage)).toFixed(4)),
      takeProfitPrice: payload.takeProfitPrice || null,
      stopLossPrice: payload.stopLossPrice || null,
      realizedPnlUsd: 0,
      closePrice: null,
      createdAt: new Date().toISOString(),
      closedAt: null,
    };

    setPerpPositions((prev) => [optimisticPos, ...prev]);

    const res = await fetch("/api/perps/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setPerpPositions((prev) => prev.filter((p) => p.id !== tempId));
      pushToast("HIP-3 Order Rejected", data.error, "error");
      return;
    }

    await refreshState();
    pushToast(
      `HIP-3 ${data.position.side} ${data.position.symbol} (${data.position.leverage}x)`,
      `$${data.position.sizeUsd.toLocaleString()} Notional settled on HyperCore (~70ms)`
    );
  };

  // Close HIP-3 Perp Position with Optimistic Update
  const handleClosePerpPosition = async (params: {
    positionId: number;
    clientMarkPrice: number;
  }) => {
    const prev = perpPositions;
    setPerpPositions((curr) =>
      curr.map((p) =>
        p.id === params.positionId ? { ...p, status: "CLOSED" } : p
      )
    );

    const res = await fetch("/api/perps/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();

    if (!res.ok) {
      setPerpPositions(prev);
      pushToast("Close Failed", data.error, "error");
      return;
    }

    await refreshState();
    const pnlSign = data.realizedPnl >= 0 ? "+" : "";
    pushToast(
      `Closed ${data.position.symbol} Position`,
      `Settled $${data.payoutUsd.toFixed(2)} USDC (${pnlSign}$${data.realizedPnl.toFixed(
        2
      )} PnL)`
    );
  };

  const handleUpdateTpSl = async (params: {
    positionId: number;
    takeProfitPrice: number | null;
    stopLossPrice: number | null;
  }) => {
    const res = await fetch(`/api/perps/${params.positionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      await refreshState();
      pushToast("TP / SL Updated", "HyperCore trigger order synced");
    }
  };

  const handleJumpToPerps = (token: PlatformToken) => {
    setSelectedPerpTokenId(token.id);
    setActiveTab("HIP3_PERPS");
  };

  // Filtered & Sorted Launchpad Tokens
  const filteredTokens = useMemo(() => {
    return tokens
      .filter((t) => {
        if (categoryFilter !== "ALL" && t.category !== categoryFilter) {
          return false;
        }
        if (stageFilter !== "ALL" && t.stage !== stageFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            t.ticker.toLowerCase().includes(q) ||
            (t.underlyingTicker &&
              t.underlyingTicker.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "BONDING") {
          const aScore = a.stage === "BONDING" ? a.bondingProgress + 100 : a.bondingProgress;
          const bScore = b.stage === "BONDING" ? b.bondingProgress + 100 : b.bondingProgress;
          return bScore - aScore;
        }
        if (sortBy === "MCAP") return b.marketCapUsd - a.marketCapUsd;
        if (sortBy === "GAINERS") return b.change24h - a.change24h;
        return b.volume24hUsd - a.volume24hUsd;
      });
  }, [tokens, categoryFilter, stageFilter, searchQuery, sortBy]);

  const totalMcap = useMemo(
    () => tokens.reduce((s, t) => s + t.marketCapUsd, 0),
    [tokens]
  );
  const totalVol = useMemo(
    () => tokens.reduce((s, t) => s + t.volume24hUsd, 0),
    [tokens]
  );
  const totalOi = useMemo(
    () => tokens.reduce((s, t) => s + t.openInterestUsd, 0),
    [tokens]
  );
  const openPerpCount = useMemo(
    () => perpPositions.filter((p) => p.status === "OPEN").length,
    [perpPositions]
  );

  const tapeItems = useMemo(
    () => [...recentTrades.slice(0, 8), ...recentTrades.slice(0, 8)],
    [recentTrades]
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f3f4f0] text-[#18231f]">
      <TopNavHeader
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === "CREATE_TOKEN") setCreateDefaultCategory("CRYPTO");
          setActiveTab(tab);
        }}
        user={user}
        networkMode={networkMode}
        onToggleNetworkMode={handleToggleNetworkMode}
        hypePriceUsd={hypePriceUsd}
        hip1AuctionHype={hip1AuctionHype}
        openPerpCount={openPerpCount}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onQuickDemoLogin={handleQuickDemoLogin}
        demoLoading={demoLoading}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Live Execution Tape — infinite marquee */}
      {recentTrades.length > 0 && (
        <div className="relative ml-0 flex animate-fade-in items-stretch border-b border-[#e5e9e4] bg-white lg:ml-[264px]">
          <div className="z-10 flex items-center gap-1.5 border-r border-[#e8ece7] bg-white py-1.5 pl-3 pr-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#176b4d] sm:pl-6">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-emerald-400" />
            LIVE TAPE
          </div>
          <div className="flex-1 overflow-hidden py-1.5">
            <div className="flex w-max animate-marquee items-center gap-3 pr-6 font-mono text-[11px] whitespace-nowrap">
              {tapeItems.map((tr, idx) => {
                const tk = tokens.find((x) => x.id === tr.tokenId);
                return (
                  <button
                    key={`${tr.id}-${idx}`}
                    type="button"
                    onClick={() => tk && setSelectedSpotTokenId(tk.id)}
                    className="inline-flex items-center gap-1.5 rounded border border-[#e8ece7] bg-[#fafbf9] px-2.5 py-1 transition hover:bg-[#f0f5f1]"
                  >
                    <span
                      className={
                        tr.side === "BUY"
                          ? "font-bold text-emerald-400"
                          : "font-bold text-rose-400"
                      }
                    >
                      {tr.side}
                    </span>
                    <span className="font-semibold text-white">
                      ${tk?.ticker || "TOKEN"}
                    </span>
                    <span className="text-slate-400">
                      ${tr.amountUsd.toLocaleString()}
                    </span>
                    {tr.paymentMethod === "X_MONEY" && (
                      <span className="rounded bg-white/15 px-1 text-[9px] text-white">
                        𝕏
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
        </div>
      )}

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 pb-12 sm:px-7 lg:ml-[264px] lg:mr-0 lg:w-[calc(100%-264px)] lg:px-8">
        {initialLoading ? (
          <div className="space-y-6">
            <div className="panel relative h-56 overflow-hidden bg-[#e9ede8]">
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent bg-[length:200%_100%]" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="panel relative h-56 overflow-hidden bg-[#e9ede8]">
                  <div
                    className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent bg-[length:200%_100%]"
                    style={{ animationDelay: `${n * 0.12}s` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "LAUNCHPAD" ? (
          <LaunchpadDashboard
            tokens={filteredTokens}
            holdings={holdings}
            networkMode={networkMode}
            hypePriceUsd={hypePriceUsd}
            hip1AuctionHype={hip1AuctionHype}
            totalMcap={totalMcap}
            totalVol={totalVol}
            totalOi={totalOi}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            stageFilter={stageFilter}
            onStageChange={setStageFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onSelectTab={(tab) => {
              if (tab === "CREATE_TOKEN") setCreateDefaultCategory("CRYPTO");
              setActiveTab(tab);
            }}
            onSelectToken={(token) => setSelectedSpotTokenId(token.id)}
            onJumpToPerps={handleJumpToPerps}
          />
        ) : activeTab === "STOCK_TOKENS" ? (
          <StockTokensHub
            tokens={tokens}
            onSelectToken={(t) => setSelectedSpotTokenId(t.id)}
            onJumpToPerps={handleJumpToPerps}
            onLaunchNewStockToken={() => {
              setCreateDefaultCategory("STOCK_TOKEN");
              setActiveTab("CREATE_TOKEN");
            }}
          />
        ) : activeTab === "LIFECYCLE_PIPELINE" ? (
          <GraduationPipelineView
            tokens={tokens}
            tickerAuctions={tickerAuctions}
            hip1AuctionHype={hip1AuctionHype}
            hypePriceUsd={hypePriceUsd}
            onSelectToken={(t) => setSelectedSpotTokenId(t.id)}
            onExecuteLifecycleAction={handleExecuteLifecycleAction}
            onJumpToPerps={handleJumpToPerps}
          />
        ) : activeTab === "HIP3_PERPS" ? (
          <Hip3PerpsTerminal
            tokens={tokens}
            selectedMarketTokenId={selectedPerpTokenId}
            onSelectMarketTokenId={setSelectedPerpTokenId}
            user={user}
            positions={perpPositions}
            hypePriceUsd={hypePriceUsd}
            onOpenPerpOrder={handleOpenPerpOrder}
            onClosePerpPosition={handleClosePerpPosition}
            onUpdateTpSl={handleUpdateTpSl}
          />
        ) : activeTab === "CREATE_TOKEN" ? (
          <CreateTokenView
            user={user}
            hypePriceUsd={hypePriceUsd}
            defaultCategory={createDefaultCategory}
            onRequireAuth={() => setAuthModalOpen(true)}
            onTokenCreated={async (created, xReceipt) => {
              await refreshState();
              pushToast(
                `🚀 Launched $${created.ticker} on Elysium!`,
                xReceipt
                  ? `Settled via 𝕏 Money (Receipt ${xReceipt} · 3% Visa Cashback)`
                  : `Deployed to Elysium Chain 99801 (${created.contractAddress.slice(
                      0,
                      10
                    )}...)`
              );
              setActiveTab("LAUNCHPAD");
              setSelectedSpotTokenId(created.id);
            }}
          />
        ) : (
          <ElysiumDocsView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e3e8e2] bg-white px-4 py-4 text-xs text-[#7a857d] sm:px-6 lg:ml-[264px]">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#557a60]" />
            <span className="font-semibold text-[#415148]">ELYSIUMFORGE</span>
            <span>
              · Arbitrum Orbit (ArbOS 61) → HyperEVM (999) → HyperCore HIP-3
            </span>
          </div>
          <div>
            Testnet 99801 · Native HYPE gas · Demo payment rails · Verify integrations before mainnet
          </div>
        </div>
      </footer>

      {/* Spot & Lifecycle Token Modal */}
      <TokenTradeModal
        token={selectedSpotToken}
        onClose={() => setSelectedSpotTokenId(null)}
        user={user}
        holding={holdings.find((h) => h.tokenId === selectedSpotTokenId)}
        trades={recentTrades}
        hypePriceUsd={hypePriceUsd}
        hip1AuctionHype={hip1AuctionHype}
        onExecuteSpotTrade={handleExecuteSpotTrade}
        onExecuteLifecycleAction={handleExecuteLifecycleAction}
        onJumpToPerps={handleJumpToPerps}
      />

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={async (authedUser) => {
          setUser(authedUser);
          await refreshState();
          pushToast(
            `Welcome, ${authedUser.username}!`,
            `Wallet & 𝕏 Money (${authedUser.xHandle}) connected`
          );
        }}
      />

      {/* Multi-Rail Wallet & X Money Modal */}
      <WalletAndXMoneyModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        user={user}
        receipts={xReceipts}
        onClaimFaucet={handleClaimFaucet}
        onTopUpXMoney={handleTopUpXMoney}
      />

      {/* Floating Toast Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-toast-in items-start gap-2.5 rounded-lg border bg-white p-3.5 shadow-[0_10px_34px_-14px_rgba(22,36,26,0.35)] ${
              t.tone === "error"
                ? "border-[#efd9d4] text-[#7f3f37]"
                : t.tone === "info"
                ? "border-[#dce6e9] text-[#3d5c6c]"
                : "border-[#dce8dc] text-[#345d40]"
            }`}
          >
            <CheckCircle2
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                t.tone === "error"
                  ? "text-rose-400"
                  : t.tone === "info"
                  ? "text-cyan-400"
                  : "text-emerald-400"
              }`}
            />
            <div className="text-xs">
              <div className="font-bold">{t.title}</div>
              {t.detail && (
                <div className="text-[11px] opacity-85 mt-0.5 leading-snug">
                  {t.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
