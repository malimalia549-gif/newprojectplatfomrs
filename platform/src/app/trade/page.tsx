"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExchangeWorkstation } from "@/components/exchange-workstation";
import { HyperliquidWorkstation } from "@/components/hyperliquid-workstation";

type Source = "live" | "sandbox";

function TradeRouter() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const explicit = sp.get("data");
  const sandboxLink = Boolean(sp.get("m") || sp.get("from") || sp.get("to") || sp.get("mode") === "swap");
  const source: Source = explicit === "sandbox" || (explicit !== "live" && sandboxLink) ? "sandbox" : "live";

  const switchTo = (next: Source) => {
    const params = new URLSearchParams(sp.toString());
    params.set("data", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return source === "live"
    ? <HyperliquidWorkstation onSwitchToSandbox={() => switchTo("sandbox")} />
    : <ExchangeWorkstation onSwitchToLive={() => switchTo("live")} />;
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="exchange-page py-20 text-center text-sm text-[#6d8065]">Loading Trade & Markets workstation…</div>}>
      <TradeRouter />
    </Suspense>
  );
}
