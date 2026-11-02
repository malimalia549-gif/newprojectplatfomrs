"use client";

import Image from "next/image";
import { useState } from "react";
import { TokenGlyph } from "@/components/ui";
import { hyperliquidCoinIconUrl } from "@/lib/hyperliquid";

export type OfficialIconStatus = "loading" | "loaded" | "unavailable";
type Props = {
  asset: string | null | undefined;
  candidates?: readonly string[];
  size?: number;
  accent?: string;
  priority?: boolean;
  onStatusChange?: (status: OfficialIconStatus, url: string | null) => void;
};

/** Only official CDN candidates; image decoding, not an HTTP 200 alone, proves success. */
export function HyperliquidTokenIcon(props: Props) {
  const defaultSrc = hyperliquidCoinIconUrl(props.asset);
  const candidates = [...new Set((props.candidates ?? (defaultSrc ? [defaultSrc] : [])).filter(url => {
    try {
      const u = new URL(url);
      return u.origin === "https://app.hyperliquid.xyz" && /^\/coins\/[A-Za-z0-9%:._-]+\.svg$/.test(u.pathname) && !u.search && !u.hash;
    } catch { return false; }
  }))];
  // Switching asset or metadata resets the candidate state, including failed attempts.
  return <OfficialIconAttempt key={`${props.asset}:${candidates.join("|")}`} {...props} urls={candidates} />;
}

function OfficialIconAttempt({ asset, urls, size = 26, accent = "#1d472f", priority = false, onStatusChange }: Props & { urls: string[] }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = urls[attempt];
  const label = typeof asset === "string" && asset.trim() ? asset.trim() : "Token";
  if (!src) return <span title={`${label} · official artwork unavailable`} data-icon-status="unavailable"><TokenGlyph glyph={label.slice(0, 1).toUpperCase()} accent={accent} size={size} /></span>;
  return <span className="hl-token-icon" data-loaded={loaded} data-icon-status={loaded ? "loaded" : "loading"} data-icon-url={src} style={{ width: size, height: size }} title={`${label} · ${loaded ? "official Hyperliquid icon" : "loading official artwork"}`}>
    {!loaded ? <TokenGlyph glyph={label.slice(0, 1).toUpperCase()} accent={accent} size={size} /> : null}
    <Image key={src} src={src} alt={`${label} logo`} width={size} height={size} referrerPolicy="no-referrer" unoptimized priority={priority}
      onLoad={() => { setLoaded(true); onStatusChange?.("loaded", src); }}
      onError={() => {
        setLoaded(false);
        setAttempt(n => n + 1);
        onStatusChange?.(attempt + 1 < urls.length ? "loading" : "unavailable", attempt + 1 < urls.length ? urls[attempt + 1] : src);
      }}
    />
  </span>;
}
