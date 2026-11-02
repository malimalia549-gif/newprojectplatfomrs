import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElysiumForge — Elysium Launchpad, Stock Tokens, HyperCore & HIP-3 Perps",
  description:
    "Institutional-style asset launchpad on Elysium Testnet with Uniswap graduation, HIP-1 ticker workflow, HyperCore spot markets, HIP-3 perpetual trading, tokenized equities and demo payment rails.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f3f4f0] font-sans text-[#18231f] antialiased">
        {children}
      </body>
    </html>
  );
}
