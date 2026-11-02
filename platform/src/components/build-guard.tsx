"use client";

import { useEffect } from "react";

const CLIENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

/**
 * Detects a stale client bundle (old JS + new HTML, or the reverse).
 * Reload once with a cache-busting URL; never loop if a proxy keeps serving stale HTML.
 */
export function BuildGuard() {
  useEffect(() => {
    const serverBuild = document.querySelector<HTMLMetaElement>('meta[name="forge-build"]')?.content;
    const url = new URL(window.location.href);
    if (!serverBuild) return;
    if (serverBuild === CLIENT_BUILD) {
      if (url.searchParams.has("_build")) {
        url.searchParams.delete("_build");
        window.history.replaceState(null, "", url.toString());
      }
      return;
    }
    // If a cache-busted reload still mismatches, do not enter a reload loop.
    if (url.searchParams.has("_build")) return;
    const key = `forge.build-reload.${CLIENT_BUILD}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, serverBuild);
    } catch { /* Storage may be blocked; still attempt one reload. */ }
    url.searchParams.set("_build", `${serverBuild}-${Date.now()}`);
    window.location.replace(url.toString());
  }, []);
  return null;
}
