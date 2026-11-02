"use client";

import { Suspense } from "react";
import { ExchangeWorkstation } from "@/components/exchange-workstation";

export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="exchange-page py-20 text-center text-sm text-[#6d8065]">Loading Trade & Markets workstation…</div>}>
      <ExchangeWorkstation />
    </Suspense>
  );
}
