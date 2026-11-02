import type { ReactNode } from "react";

/** Shared presentation shell. Trading, launch and portfolio keep one semantic theme. */
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell min-h-dvh" data-theme="light"><div className="sandbox-ribbon"><strong>SANDBOX</strong><span>Saldo & order simulasi · tanpa dana nyata</span><a href="/about">Tentang platform</a></div>
      {children}</div>;
}
