"use client";

import type { ReactNode } from "react";

/** Shared presentation shell. Trading, launch and portfolio keep one semantic theme. */
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell min-h-dvh" data-theme="light">{children}</div>;
}
