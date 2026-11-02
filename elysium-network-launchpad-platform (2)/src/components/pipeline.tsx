"use client";

import { cn } from "@/lib/util";

const MAIN = [
  { key: "create", label: "Create", caption: "Fixed supply minted" },
  { key: "trading", label: "Trade", caption: "HYPE bonding curve" },
  { key: "graduate", label: "Graduate", caption: "800M absorbed" },
  { key: "pool", label: "Liquidity pool", caption: "Liquidity locked 4 years" },
  { key: "done", label: "Complete", caption: "Open market access" },
];
const BRANCH = [
  { key: "ticker", label: "Ticker", caption: "HyperCore auction" },
  { key: "book", label: "Spot book", caption: "TOKEN / USDC" },
  { key: "hip3", label: "HIP-3 perp", caption: "Isolated margin, 20x" },
];
const ORDER = [...MAIN.map((s) => s.key), ...BRANCH.map((s) => s.key)];

export function Pipeline({ current = "create", compact }: { current?: string; compact?: boolean }) {
  const idx = ORDER.indexOf(current);
  const reached = (key: string) => idx >= 0 && ORDER.indexOf(key) <= idx;

  return (
    <div>
      <ol className={cn("grid overflow-hidden rounded-lg border border-[#dfe9d4] bg-white", compact ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-1 sm:grid-cols-5")}>
        {MAIN.map((s, i) => {
          const on = reached(s.key);
          return (
            <li key={s.key} className={cn("relative border-b border-[#e0ead5] p-4 sm:border-b-0 sm:border-r", on ? "bg-[#f0f6e9]" : "bg-[#fcfdf9]")}>
              <div className="flex items-center gap-2.5"><span className={cn("tabular grid h-6 w-6 place-items-center rounded-full text-[10px] font-medium", on ? "bg-[#daebc9] text-[#497830]" : "bg-[#edf3e5] text-[#647354]")}>{i + 1}</span><span className={cn("text-xs font-medium", on ? "text-[#426c2e]" : "text-[#667658]")}>{s.label}</span></div>
              {!compact ? <div className="mt-2 pl-8 text-[10px] leading-relaxed text-[#647456]">{s.caption}</div> : null}
              {i < MAIN.length - 1 ? <span className="absolute -right-2 top-5 z-10 hidden h-4 w-4 items-center justify-center rounded-full border border-[#e1ebd6] bg-[#fcfef8] text-[9px] text-[#69775b] sm:flex">›</span> : null}
            </li>
          );
        })}
      </ol>
      {!compact ? <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3"><span className="text-[11px] text-[#647457]">Then, on HyperCore</span>{BRANCH.map((s) => <div key={s.key} className={cn("inline-flex items-center gap-2 text-xs", reached(s.key) ? "text-[#487633]" : "text-[#627851]")}><span className="h-1.5 w-1.5 rounded-full bg-[#b5cd99]" />{s.label}<span className="text-[10px] text-[#67755a]">{s.caption}</span></div>)}</div> : null}
    </div>
  );
}
