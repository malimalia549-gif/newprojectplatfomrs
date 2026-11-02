import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./forge.css";
import "./unified.css";
import { AppProviders } from "@/components/providers";
import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Toasts } from "@/components/ui";
import { AppShell } from "@/components/app-shell";
import { MainFrame } from "@/components/main-frame";
import { BuildGuard } from "@/components/build-guard";

export const dynamic = "force-dynamic";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export const metadata: Metadata = {
  title: "Forge Unified — Elysium Sandbox",
  description: "One sandbox for token launches, swaps, a unified Trade workstation with read-only Hyperliquid mainnet market data, portfolio and token economics. Simulated balances and orders; no real funds.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head><meta name="forge-build" content={BUILD_ID} /></head>
      <body className="antialiased">
        <BuildGuard />
        <AppProviders>
          <AppShell>
            <div className="flex min-h-dvh flex-col">
              <a href="#main-content" className="skip-link">Skip to content</a>
              <TopNav />
              <MainFrame>{children}</MainFrame>
              <Footer />
            </div>
            <Toasts />
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
