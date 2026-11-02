"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CandlestickChart,
  Coins,
  FileCode2,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ELYSIUM_NETWORK_CONFIG } from "@/lib/constants";
import type { ActiveTab, UserProfile } from "@/types/platform";

interface TopNavHeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: UserProfile | null;
  networkMode: "testnet" | "mainnet_preview";
  onToggleNetworkMode: (mode: "testnet" | "mainnet_preview") => void;
  hypePriceUsd: number;
  hip1AuctionHype: number;
  openPerpCount: number;
  onOpenAuthModal: () => void;
  onQuickDemoLogin: () => void;
  demoLoading: boolean;
  onOpenWalletModal: () => void;
  onLogout: () => void;
}

const navItems: {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  { id: "LAUNCHPAD", label: "Markets overview", icon: <LayoutDashboard className="h-[17px] w-[17px]" /> },
  { id: "STOCK_TOKENS", label: "Tokenized equities", icon: <TrendingUp className="h-[17px] w-[17px]" />, badge: "xStocks" },
  { id: "LIFECYCLE_PIPELINE", label: "Launch lifecycle", icon: <GitBranch className="h-[17px] w-[17px]" /> },
  { id: "HIP3_PERPS", label: "Perpetuals", icon: <CandlestickChart className="h-[17px] w-[17px]" />, badge: "HIP-3" },
  { id: "DOCS_ELYSIUM", label: "Network & docs", icon: <FileCode2 className="h-[17px] w-[17px]" /> },
];

function getPageName(activeTab: ActiveTab) {
  if (activeTab === "CREATE_TOKEN") return "Create an asset";
  return navItems.find((item) => item.id === activeTab)?.label || "Markets overview";
}

export function TopNavHeader({
  activeTab,
  onSelectTab,
  user,
  networkMode,
  onToggleNetworkMode,
  hypePriceUsd,
  hip1AuctionHype,
  openPerpCount,
  onOpenAuthModal,
  onQuickDemoLogin,
  demoLoading,
  onOpenWalletModal,
  onLogout,
}: TopNavHeaderProps) {
  const [blockHeight, setBlockHeight] = useState(18492310);
  const net = ELYSIUM_NETWORK_CONFIG[networkMode];

  useEffect(() => {
    const timer = setInterval(() => {
      setBlockHeight((prev) => prev + Math.floor(Math.random() * 3 + 2));
    }, 650);
    return () => clearInterval(timer);
  }, []);

  const renderNav = (mobile = false) => (
    <nav className={mobile ? "flex min-w-max items-center gap-1 px-3 py-2" : "space-y-1"} aria-label="Primary navigation">
      {navItems.map((item) => {
        const active = activeTab === item.id;
        const badge = item.id === "HIP3_PERPS" && openPerpCount > 0 ? `${openPerpCount}` : item.badge;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            aria-current={active ? "page" : undefined}
            className={mobile
              ? `inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition ${active ? "bg-[#e6efe9] text-[#14573f]" : "text-[#66736c] hover:bg-[#f4f6f3] hover:text-[#18231f]"}`
              : `group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? "bg-[#e6efe9] text-[#14573f]" : "text-[#a9b5ae] hover:bg-white/[0.06] hover:text-white"}`}
          >
            <span className={active && !mobile ? "text-[#176b4d]" : ""}>{item.icon}</span>
            <span>{item.label}</span>
            {badge && (
              <span className={mobile ? "rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-mono text-[#52645a]" : `ml-auto rounded px-1.5 py-0.5 font-mono text-[9px] ${active ? "bg-white/70 text-[#176b4d]" : "bg-white/[0.08] text-[#b5c1ba]"}`}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onSelectTab("CREATE_TOKEN")}
        className={mobile
          ? `inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${activeTab === "CREATE_TOKEN" ? "bg-[#176b4d] text-white" : "bg-[#edf3ef] text-[#176b4d] hover:bg-[#e2ece5]"}`
          : `group mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition ${activeTab === "CREATE_TOKEN" ? "bg-[#176b4d] text-white" : "bg-white/[0.06] text-[#e2ebe5] hover:bg-white/[0.1]"}`}
      >
        <Plus className="h-[17px] w-[17px]" />
        <span>Launch an asset</span>
      </button>
    </nav>
  );

  return (
    <>
      {/* Desktop workspace sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[264px] flex-col border-r border-white/[0.07] bg-[#14231e] text-white lg:flex">
        <button
          type="button"
          onClick={() => onSelectTab("LAUNCHPAD")}
          className="flex h-[78px] items-center gap-3 border-b border-white/[0.07] px-6 text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#8ab49a]/30 bg-[#1c392c] font-display text-xs font-bold tracking-wide text-[#d6e9db]">EF</span>
          <span className="min-w-0">
            <span className="block font-display text-[15px] font-semibold tracking-[0.06em] text-white">ELYSIUM<span className="text-[#a5c9ad]">FORGE</span></span>
            <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-[#95a79b]">Digital asset markets</span>
          </span>
        </button>

        <div className="px-4 pt-7">
          <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7f9587]">Workspace</div>
          {renderNav(false)}
        </div>

        <div className="mt-auto space-y-4 px-4 pb-4">
          <div className="rounded-lg border border-white/[0.08] bg-black/[0.13] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#97a99d]">Network</span>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#a8d0b2]">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-[#8dbb98]" />
                {networkMode === "testnet" ? "TESTNET" : "STAGING"}
              </span>
            </div>
            <div className="font-mono text-xs font-medium text-white">Elysium {networkMode === "testnet" ? "99801" : "Mainnet"}</div>
            <div className="mt-1 text-[10px] text-[#96a79b]">{net.blockTimeMs}ms blocks · HYPE gas</div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-black/20 p-1">
              <button type="button" onClick={() => onToggleNetworkMode("testnet")} className={`rounded px-2 py-1.5 text-[9px] font-semibold transition ${networkMode === "testnet" ? "bg-[#dfece2] text-[#14573f]" : "text-[#a7b5aa] hover:bg-white/[0.07]"}`}>Testnet</button>
              <button type="button" onClick={() => onToggleNetworkMode("mainnet_preview")} className={`rounded px-2 py-1.5 text-[9px] font-semibold transition ${networkMode === "mainnet_preview" ? "bg-[#dfece2] text-[#14573f]" : "text-[#a7b5aa] hover:bg-white/[0.07]"}`}>Mainnet prep</button>
            </div>
          </div>

          {user ? (
            <button type="button" onClick={onOpenWalletModal} className="flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.08]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dce9df] text-[11px] font-bold text-[#14573f]">{user.username.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{user.username}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-[#9eafa3]">{user.xHandle} · Wallet</span>
              </span>
              <Wallet className="h-4 w-4 text-[#a5c9ad]" />
            </button>
          ) : (
            <div className="space-y-2">
              <button type="button" disabled={demoLoading} onClick={onQuickDemoLogin} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d9e8dc] px-3 py-2.5 text-xs font-semibold text-[#14573f] transition hover:bg-white disabled:opacity-50">
                <Coins className="h-4 w-4" />
                {demoLoading ? "Connecting…" : "Open demo account"}
              </button>
              <button type="button" onClick={onOpenAuthModal} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs font-semibold text-[#d0dbd3] transition hover:bg-white/[0.06]">
                <ShieldCheck className="h-4 w-4" /> Sign in / Create account
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 font-mono text-[9px] text-[#84968a]">
            <span>HYPE ${hypePriceUsd.toFixed(2)}</span>
            <span>HIP-1 {hip1AuctionHype} HYPE</span>
          </div>
        </div>
      </aside>

      {/* Main top bar */}
      <header className="sticky top-0 z-40 border-b border-[#e5e9e4] bg-white/95 backdrop-blur lg:ml-[264px]">
        <div className="mx-auto flex min-h-[66px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7">
          <div className="min-w-0">
            <button type="button" onClick={() => onSelectTab("LAUNCHPAD")} className="mb-0.5 flex items-center gap-2 lg:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-[#dce7dc] bg-[#eef4ef] text-[8px] font-bold text-[#315f42]">EF</span>
              <span className="font-display text-[11px] font-semibold tracking-[0.05em] text-[#26372c]">ELYSIUM<span className="text-[#4e8060]">FORGE</span></span>
            </button>
            <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#89948d] sm:flex">
              <span>ELYSIUMFORGE</span><span className="text-[#bdc5bf]">/</span><span className="text-[#52635a]">{getPageName(activeTab)}</span>
            </div>
            <div className="flex items-center gap-2 sm:mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3b8a62]" />
              <span className="font-mono text-[11px] text-[#52635a]">{networkMode === "testnet" ? "Elysium Testnet · 99801" : "Mainnet preparation · 999"}</span>
              <span className="hidden text-[#aab2ac] sm:inline">·</span>
              <span className="hidden items-center gap-1 text-[11px] text-[#7a8780] sm:inline-flex"><Activity className="h-3 w-3" /> {net.blockTimeMs}ms block time</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 border-r border-[#e5e9e4] pr-3 font-mono text-[11px] text-[#68756e] xl:flex">
              <span>Block</span><span className="font-semibold text-[#28372f]">#{blockHeight.toLocaleString()}</span>
            </div>
            <div className="hidden items-center gap-1.5 font-mono text-[11px] text-[#68756e] md:flex">
              <span className="text-[#8a948e]">HYPE</span><span className="font-semibold text-[#28372f]">${hypePriceUsd.toFixed(2)}</span>
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={onOpenWalletModal} className="flex h-9 items-center gap-2 rounded-md border border-[#dfe5df] bg-[#fbfcfa] px-3 text-xs transition hover:border-[#b9cabe] hover:bg-[#f3f7f3]">
                  <Wallet className="h-3.5 w-3.5 text-[#176b4d]" />
                  <span className="font-mono font-semibold text-[#26352d]">{user.hypeBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} HYPE</span>
                  <span className="hidden text-[#aab2ac] sm:inline">|</span>
                  <span className="hidden font-mono text-[#59675f] sm:inline">${user.usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </button>
                <button type="button" title="Sign out" onClick={onLogout} className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dfe5df] text-[#7e8982] transition hover:bg-[#f7e9e7] hover:text-[#a44539]"><LogOut className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" disabled={demoLoading} onClick={onQuickDemoLogin} className="hidden h-9 items-center gap-2 rounded-md bg-[#176b4d] px-3 text-xs font-semibold text-white transition hover:bg-[#125a40] disabled:opacity-50 sm:flex">
                  <Coins className="h-3.5 w-3.5" />{demoLoading ? "Connecting…" : "Demo account"}
                </button>
                <button type="button" disabled={demoLoading} onClick={onQuickDemoLogin} aria-label="Open demo account" className="flex h-9 w-9 items-center justify-center rounded-md bg-[#176b4d] text-white sm:hidden"><Coins className="h-4 w-4" /></button>
                <button type="button" onClick={onOpenAuthModal} className="h-9 rounded-md border border-[#dfe5df] bg-white px-3 text-xs font-semibold text-[#28372f] transition hover:bg-[#f6f8f5]">Sign in</button>
              </div>
            )}
          </div>
        </div>
        {/* Mobile navigation */}
        <div className="border-t border-[#f0f1ee] lg:hidden">
          <div className="overflow-x-auto">{renderNav(true)}</div>
        </div>
      </header>
    </>
  );
}
