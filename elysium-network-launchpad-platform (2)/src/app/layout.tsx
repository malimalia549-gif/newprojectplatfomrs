import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./forge.css";
import { AppProviders } from "@/components/providers";
import { TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Toasts } from "@/components/ui";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Forge — Launch, graduate & trade on Elysium",
  description: "The launchpad for Elysium. Create tokens, graduate to HyperCore liquidity, trade HIP-3 perpetuals, and earn with the Forge platform token, STOKE.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/manrope-bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter-regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AppProviders>
          <AppShell>
            <div className="flex min-h-dvh flex-col">
              <a href="#main-content" className="skip-link">Skip to content</a>
              <TopNav />
              <main id="main-content" className="forge-main mx-auto w-full max-w-[1280px] flex-1 px-5 pb-24 sm:px-8">{children}</main>
              <Footer />
            </div>
            <Toasts />
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
