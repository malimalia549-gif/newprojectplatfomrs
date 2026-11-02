"use client";

import React from "react";
import {
  ArrowUpRight,
  BookOpenText,
  CandlestickChart,
  ChevronDown,
  Compass,
  GitBranch,
  LogOut,
  Plus,
  Shapes,
  Wallet,
} from "lucide-react";
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

const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: "LAUNCHPAD", label: "Explore", icon: <Compass className="h-4 w-4" /> },
  { id: "STOCK_TOKENS", label: "Stock tokens", icon: <Shapes className="h-4 w-4" /> },
  { id: "LIFECYCLE_PIPELINE", label: "Lifecycle", icon: <GitBranch className="h-4 w-4" /> },
  { id: "HIP3_PERPS", label: "Perpetuals", icon: <CandlestickChart className="h-4 w-4" /> },
  { id: "DOCS_ELYSIUM", label: "Network guide", icon: <BookOpenText className="h-4 w-4" /> },
];

export function TopNavHeader({
  activeTab, onSelectTab, user, networkMode, onToggleNetworkMode,
  hypePriceUsd, hip1AuctionHype, openPerpCount,
  onOpenAuthModal, onQuickDemoLogin, demoLoading, onOpenWalletModal, onLogout,
}: TopNavHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#26353b] bg-[#0b1318]/95 backdrop-blur-xl">
      <div className="border-b border-[#202e34] bg-[#0b1318]">
        <div className="mx-auto flex h-8 max-w-[1500px] items-center justify-between gap-4 px-4 text-[10px] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 text-[#879b93]">
            <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-[#b1d6bc]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9fdfb4]" /> SANDBOX
            </span>
            <span className="h-3 w-px bg-[#2f4145]" />
            <div className="relative inline-flex items-center gap-1">
              <select
                aria-label="Network configuration"
                value={networkMode}
                onChange={(event) => onToggleNetworkMode(event.target.value as "testnet" | "mainnet_preview")}
                className="max-w-[180px] appearance-none bg-transparent pr-4 text-[10px] text-[#acbcb5] outline-none sm:max-w-none"
              >
                <option value="testnet" className="bg-[#111b20]">Elysium Testnet · 99801</option>
                <option value="mainnet_preview" className="bg-[#111b20]">Mainnet configuration preview</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 h-3 w-3 text-[#7d9789]" />
            </div>
          </div>
          <div className="hidden items-center gap-5 font-mono text-[#82958e] sm:flex">
            <span>HYPE <strong className="font-medium text-[#c6d7cf]">${hypePriceUsd.toFixed(2)}</strong></span>
            <span className="hidden md:inline">HIP-1 estimate <strong className="font-medium text-[#c6d7cf]">{hip1AuctionHype} HYPE</strong></span>
            <span className="hidden lg:inline text-[#71847b]">Illustrative market data</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => onSelectTab("LAUNCHPAD")} className="flex shrink-0 items-center gap-3 text-left" aria-label="Elysium Forge home">
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#517561] bg-[#1b3327] text-[#c9f4d6] shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 17.8 12 4l7 13.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 14h8M10 18h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="hidden leading-none min-[390px]:block">
            <span className="block font-display text-[16px] font-semibold tracking-[-0.055em] text-[#f2f5f3]">elysium<span className="font-light text-[#b3ebc9]">forge</span><span className="ml-1 text-[#b3ebc9]">.</span></span>
            <span className="mt-[5px] block text-[9px] font-medium uppercase tracking-[0.16em] text-[#778f85]">The market creation layer</span>
          </span>
        </button>

        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Main navigation">
          {navItems.map(({ id, label, icon }) => (
            <button
              type="button"
              key={id}
              onClick={() => onSelectTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className={`relative flex h-full items-center gap-2 px-3.5 text-[12px] font-medium transition ${activeTab === id ? "text-[#e8f2eb]" : "text-[#91a19b] hover:text-[#e7efea]"}`}
            >
              <span className={activeTab === id ? "text-[#b3ebc9]" : "text-[#6d817a]"}>{icon}</span>{label}
              {id === "HIP3_PERPS" && openPerpCount > 0 && <span className="rounded bg-[#254233] px-1.5 py-0.5 font-mono text-[9px] text-[#c1ecd1]">{openPerpCount}</span>}
              {activeTab === id && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#b3ebc9]" />}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <button type="button" onClick={onOpenWalletModal} className="ui-btn-secondary !min-h-[37px] !px-3" title="Open sandbox wallet">
                <Wallet className="h-3.5 w-3.5 text-[#b3ebc9]" />
                <span className="hidden font-mono text-[11px] sm:inline">{user.hypeBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })} HYPE</span>
                <span className="sm:hidden">Wallet</span>
              </button>
              <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="ui-btn-quiet !h-[37px] !w-[36px] !min-h-0 !p-0"><LogOut className="h-4 w-4" /></button>
            </>
          ) : (
            <>
              <button type="button" onClick={onQuickDemoLogin} disabled={demoLoading} className="ui-btn-secondary !min-h-[37px] !px-3 !text-[11px] disabled:opacity-50">{demoLoading ? "Connecting..." : "Try demo"}</button>
              <button type="button" onClick={onOpenAuthModal} className="hidden text-[11px] font-semibold text-[#c2d1c9] transition hover:text-white sm:block">Sign in</button>
            </>
          )}
          <button type="button" onClick={() => onSelectTab("CREATE_TOKEN")} className={`ui-btn-primary !min-h-[37px] !px-3 !text-[11px] ${activeTab === "CREATE_TOKEN" ? "!bg-[#d4f6df]" : ""}`}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create token</span><span className="sm:hidden">Create</span><ArrowUpRight className="hidden h-3.5 w-3.5 sm:block" />
          </button>
        </div>
      </div>

      <nav className="ui-scroll flex items-center gap-1 overflow-x-auto border-t border-[#1b2a30] px-4 lg:hidden" aria-label="Mobile navigation">
        {navItems.map(({ id, label }) => (
          <button type="button" key={id} onClick={() => onSelectTab(id)} aria-current={activeTab === id ? "page" : undefined} className={`relative shrink-0 px-3 py-3 text-[11px] font-medium transition ${activeTab === id ? "text-[#b8ebc9]" : "text-[#839790]"}`}>
            {label}{activeTab === id && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-[#b3ebc9]" />}
          </button>
        ))}
      </nav>
    </header>
  );
}
