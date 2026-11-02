"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/util";

/**
 * The exchange terminal needs a wider canvas than editorial pages.
 * All other routes keep the established 1280px reading width.
 */
export function MainFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isExchange = path === "/terminal" || path === "/trade";

  return (
    <main
      id="main-content"
      className={cn(
        "forge-main mx-auto w-full flex-1 pb-24",
        isExchange
          ? "exchange-main max-w-[1680px] px-3 py-0 sm:px-5 lg:px-6"
          : "max-w-[1280px] px-5 sm:px-8",
      )}
    >
      {children}
    </main>
  );
}
