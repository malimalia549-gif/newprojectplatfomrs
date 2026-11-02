"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadBook, loadCandles, loadPerpMarkets, loadSpotMarkets, loadTrades, type HlPerpMarket, type HlSpotMarket, type HlTrade } from "@/lib/hyperliquid";
import type { BookSnapshot } from "@/lib/dto";
import type { Candle } from "@/lib/chart";

export type FeedStatus = "loading" | "live" | "stale" | "error";

type MarketsState = {
  perps: HlPerpMarket[];
  spots: HlSpotMarket[];
  at: number | null;
  loading: boolean;
  error: string | null;
};

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Hyperliquid feed unavailable");

/** Read-only mainnet market list. REST polling is intentional: no wallet or signing is involved. */
export function useHyperliquidMarkets(enabled: boolean) {
  const [state, setState] = useState<MarketsState>({ perps: [], spots: [], at: null, loading: enabled, error: null });
  const [now, setNow] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;
    if (controllerRef.current && !force) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const [perps, spots] = await Promise.allSettled([loadPerpMarkets(controller.signal), loadSpotMarkets(controller.signal)]);
      if (controller.signal.aborted) return;
      setState((prev) => {
        const nextPerps = perps.status === "fulfilled" ? perps.value.markets : prev.perps;
        const nextSpots = spots.status === "fulfilled" ? spots.value : prev.spots;
        const ok = perps.status === "fulfilled" || spots.status === "fulfilled";
        const partial = perps.status === "rejected" || spots.status === "rejected";
        const error = ok ? (perps.status === "fulfilled" && perps.value.warning ? perps.value.warning : partial ? "Sebagian feed Hyperliquid gagal dimuat." : null) : errorMessage(perps.status === "rejected" ? perps.reason : spots.status === "rejected" ? spots.reason : null);
        return { perps: nextPerps, spots: nextSpots, at: ok ? Date.now() : prev.at, loading: false, error };
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const start = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { const controller = controllerRef.current; controllerRef.current = null; controller?.abort(); window.clearTimeout(start); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [enabled, load]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(tick);
  }, []);

  const status: FeedStatus = !enabled ? "error" : state.loading && !state.at ? "loading" : state.error && !state.at ? "error" : state.at && now > 0 && now - state.at > 90_000 ? "stale" : state.error ? "stale" : "live";
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    void load(true);
  }, [load]);
  return { ...state, status, reload };
}

type InstrumentState = {
  key: string;
  book: BookSnapshot | null;
  trades: HlTrade[];
  candles: Candle[];
  at: number | null;
  loading: boolean;
  error: string | null;
};

/** Selected-instrument book, trades and candles. Poll intervals stay within public IP rate limits. */
export function useHyperliquidInstrument(coin: string | null, interval: string, enabled: boolean) {
  const key = `${coin ?? ""}|${interval}`;
  const [state, setState] = useState<InstrumentState>({ key, book: null, trades: [], candles: [], at: null, loading: Boolean(coin && enabled), error: null });
  const [now, setNow] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    if (!enabled || !coin) return;
    if (controllerRef.current && !force) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const [book, trades, candles] = await Promise.allSettled([
        loadBook(coin, controller.signal),
        loadTrades(coin, controller.signal),
        loadCandles(coin, interval, 140, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setState((prev) => {
        const base = prev.key === key ? prev : { book: null, trades: [], candles: [], at: null };
        const ok = book.status === "fulfilled" || trades.status === "fulfilled" || candles.status === "fulfilled";
        const failures = [
          book.status === "rejected" ? `Orderbook: ${errorMessage(book.reason)}` : null,
          trades.status === "rejected" ? `Trades: ${errorMessage(trades.reason)}` : null,
          candles.status === "rejected" ? `Candles (${coin}, ${interval}): ${errorMessage(candles.reason)}` : candles.value.length === 0 ? `Candles (${coin}, ${interval}): API returned no candles.` : null,
        ].filter(Boolean);
        const error = failures.length ? failures.join(" · ") : null;
        return {
          key,
          book: book.status === "fulfilled" ? book.value : base.book,
          trades: trades.status === "fulfilled" ? trades.value : base.trades,
          candles: candles.status === "fulfilled" ? candles.value : base.candles,
          at: ok ? Date.now() : base.at,
          loading: false,
          error,
        };
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [coin, interval, enabled, key]);

  useEffect(() => {
    if (!enabled || !coin) return;
    const start = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 6_000);
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { const controller = controllerRef.current; controllerRef.current = null; controller?.abort(); window.clearTimeout(start); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [enabled, coin, load]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(tick);
  }, []);

  const current = state.key === key ? state : { key, book: null, trades: [], candles: [], at: null, loading: Boolean(coin && enabled), error: null };
  const status: FeedStatus = !enabled ? "error" : !coin ? "loading" : current.loading && !current.at ? "loading" : current.error && !current.at ? "error" : current.at && now > 0 && now - current.at > 30_000 ? "stale" : current.error ? "stale" : "live";
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    void load(true);
  }, [load]);
  return { ...current, status, reload };
}
