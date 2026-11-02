"use client";

/** One market-list navigation, never a separate trading page. */
export function MarketSourceTabs({ active, onChange }: { active: "hyperliquid" | "launchpad"; onChange: () => void }) {
  return <div className="ex-rail-tabs" role="tablist" aria-label="Market source">
    {(["hyperliquid", "launchpad"] as const).map(source => <button key={source} type="button" role="tab" aria-selected={source === active} className="ex-rail-tab" data-active={source === active} onClick={() => { if (source !== active) onChange(); }}>{source === "hyperliquid" ? "Hyperliquid" : "Launchpad"}</button>)}
  </div>;
}
