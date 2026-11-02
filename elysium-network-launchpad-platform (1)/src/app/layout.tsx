import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elysium Forge — Launchpad, Stock Tokens & Perpetuals",
  description:
    "A launchpad sandbox for Elysium testnet concepts: token launches, stock token previews, graduation workflows, spot trading simulations, and HIP-3 perpetuals simulations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080e12] font-sans text-[#e8efec] antialiased">
        {children}
      </body>
    </html>
  );
}
