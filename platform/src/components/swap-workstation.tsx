"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { MarketChart } from "@/components/market-chart";
import { Badge, Btn, Delta, EmptyState, Input, Modal, Skeleton, TokenGlyph } from "@/components/ui";
import { cn, fmtCompact, fmtNum, fmtPrice, fmtUsd, shortAddr, timeAgo } from "@/lib/util";
import type { RecentSwapRow, SwapAsset, SwapQuote } from "@/lib/swap";

type SwapStateResponse = {
  prices: { hypeUsd: number; stokeUsd: number; headBlock: number };
  assets: SwapAsset[];
  recentSwaps: RecentSwapRow[];
};

function fmtAssetPx(usd: number) {
  if (!Number.isFinite(usd) || usd === 0) return "$0.00";
  if (usd >= 100) return `$${fmtNum(usd, 2)}`;
  if (usd >= 1) return `$${fmtNum(usd, 4)}`;
  if (usd >= 0.001) return `$${usd.toFixed(5)}`;
  return `$${fmtPrice(usd)}`;
}

function fmtTokenQty(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return fmtCompact(n, 3);
  if (abs >= 100) return fmtNum(n, 2);
  if (abs >= 1) return fmtNum(n, 4);
  return fmtPrice(n);
}

export function SwapWorkstation(props: Parameters<typeof SwapControls>[0]) {
  return <SwapControls key={`${props.initialFrom}-${props.initialTo}`} {...props} />;
}

function SwapControls({
  initialFrom,
  initialTo,
  onSwitchToPerp,
}: {
  initialFrom?: string | null;
  initialTo?: string | null;
  onSwitchToPerp: (perpMarketId?: string | null) => void;
}) {
  const { user, push, refresh, setAuthModal } = useForge();
  const state = useLive<SwapStateResponse>("/api/swap", 4500);

  let [fromSym, setFromSym] = useState<string>(initialFrom?.toUpperCase() || "HYPE");
  let [toSym, setToSym] = useState<string>(initialTo?.toUpperCase() || "ORBT");
  const [amountIn, setAmountIn] = useState<string>("1");
  const [slippageBps, setSlippageBps] = useState<number>(50);
  const [invertRate, setInvertRate] = useState(false);

  const [quoteState, setQuoteState] = useState<{ key: string; value: SwapQuote } | null>(null);
  const quoteKey = `${fromSym}:${toSym}:${amountIn}:${slippageBps}`;
  const quote = quoteState?.key === quoteKey ? quoteState.value : null;
  const setQuote = useCallback((value: SwapQuote | null) => setQuoteState(value ? { key: quoteKey, value } : null), [quoteKey]);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pickerSide, setPickerSide] = useState<null | "from" | "to">(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState<"all" | "coin" | "spot" | "curve">("all");
  const [blotterTab, setBlotterTab] = useState<"markets" | "balances" | "swaps">("markets");
  const [marketSearch, setMarketSearch] = useState("");


  const assets = useMemo(() => state.data?.assets ?? [], [state.data]);
  const swappableAssets = useMemo(() => assets.filter((a) => a.swappable), [assets]);

  const resolvedFrom = swappableAssets.some((a) => a.symbol === fromSym) ? fromSym : swappableAssets[0]?.symbol ?? fromSym;
  const resolvedTo = swappableAssets.some((a) => a.symbol === toSym && a.symbol !== resolvedFrom) ? toSym : swappableAssets.find((a) => a.symbol !== resolvedFrom)?.symbol ?? toSym;
  fromSym = resolvedFrom; toSym = resolvedTo;
  const fromAsset = useMemo(() => assets.find((a) => a.symbol === fromSym) ?? null, [assets, fromSym]);
  const toAsset = useMemo(() => assets.find((a) => a.symbol === toSym) ?? null, [assets, toSym]);

  // Choose primary charted asset (prefer non-USDC asset so chart has meaningful price movement)
  const focusAsset = useMemo(() => {
    if (toAsset && toAsset.symbol !== "USDC") return toAsset;
    if (fromAsset && fromAsset.symbol !== "USDC") return fromAsset;
    return toAsset ?? fromAsset ?? null;
  }, [fromAsset, toAsset]);

  // Live debounced quote fetch
  useEffect(() => {
    const parsed = Number(amountIn);
    if (!fromSym || !toSym || fromSym === toSym || !Number.isFinite(parsed) || parsed <= 0) {
      const clear = window.setTimeout(() => { setQuote(null); setQuoteErr(null); setQuoting(false); }, 0);
      return () => window.clearTimeout(clear);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await api<{ quote: SwapQuote }>("/api/swap", {
          json: { action: "quote", from: fromSym, to: toSym, amount: parsed, slippageBps, expectedOut: quote?.amountOut },
        });
        if (!alive) return;
        setQuote(res.quote);
        setQuoteErr(null);
      } catch (e) {
        if (!alive) return;
        setQuote(null);
        setQuoteErr((e as Error).message);
      } finally {
        if (alive) setQuoting(false);
      }
    }, 200);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [fromSym, toSym, amountIn, slippageBps, state.data?.prices.headBlock, quoteKey, quote?.amountOut, setQuote]);

  const flipPair = () => {
    const prevFrom = fromSym;
    const prevTo = toSym;
    setFromSym(prevTo);
    setToSym(prevFrom);
    if (quote && quote.amountOut > 0) {
      setAmountIn(
        quote.amountOut >= 100
          ? quote.amountOut.toFixed(2)
          : quote.amountOut >= 1
            ? quote.amountOut.toFixed(4)
            : Number(quote.amountOut.toPrecision(4)).toString(),
      );
    }
  };

  const applyPct = (pct: number) => {
    const bal = fromAsset?.balance ?? 0;
    if (bal <= 0) return;
    // Leave tiny gas reserve when maxing HYPE
    const usable = fromSym === "HYPE" && pct === 100 ? Math.max(0, bal - 0.01) : (bal * pct) / 100;
    setAmountIn(usable >= 100 ? usable.toFixed(2) : usable >= 1 ? usable.toFixed(4) : Number(usable.toPrecision(5)).toString());
  };

  const executeSwapOrder = async () => {
    if (!user) return setAuthModal("login");
    const parsed = Number(amountIn);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return push({ kind: "error", title: "Enter an amount to swap" });
    }
    setBusy(true);
    try {
      const res = await api<{
        txHash: string;
        fromSymbol: string;
        toSymbol: string;
        amountIn: number;
        amountOut: number;
        venues: string[];
        state: SwapStateResponse;
      }>("/api/swap", {
        json: { action: "execute", from: fromSym, to: toSym, amount: parsed, slippageBps, expectedOut: quote?.amountOut },
      });
      state.setData(res.state);
      push({
        kind: "tx",
        title: `Swapped ${fmtTokenQty(res.amountIn)} ${res.fromSymbol} → ${fmtTokenQty(res.amountOut)} ${res.toSymbol}`,
        body: `${res.venues.join(" → ")} · ${shortAddr(res.txHash, 6)}`,
      });
      await refresh();
      await state.reload();
    } catch (e) {
      push({ kind: "error", title: "Swap declined", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const loadPair = (paySym: string, receiveSym: string) => {
    if (paySym === receiveSym) {
      setFromSym(paySym === "USDC" ? "HYPE" : "USDC");
      setToSym(receiveSym);
    } else {
      setFromSym(paySym);
      setToSym(receiveSym);
    }
  };

  const filteredDirectory = useMemo(() => {
    const q = marketSearch.trim().toLowerCase();
    return assets.filter((a) => !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.venue.toLowerCase().includes(q));
  }, [assets, marketSearch]);

  const heldAssets = useMemo(() => assets.filter((a) => a.balance > 0.00001), [assets]);

  const pickerAssets = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return swappableAssets.filter((a) => {
      if (pickerFilter === "coin" && a.kind !== "coin") return false;
      if (pickerFilter === "spot" && !(a.stage === "graduated" || a.stage === "perp_listed")) return false;
      if (pickerFilter === "curve" && !(a.stage === "trading" || a.stage === "created")) return false;
      if (!q) return true;
      return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    });
  }, [swappableAssets, pickerFilter, pickerSearch]);

  const insufficientBalance = Boolean(user && fromAsset && Number(amountIn) > fromAsset.balance + 1e-8);

  return (
    <div className="min-w-0 space-y-5">
      {/* Horizontal Coin & Token Market Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1" role="tablist" aria-label="Spot coins and tokens">
        {!assets.length
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[58px] w-44 shrink-0 rounded-xl" />)
          : swappableAssets.map((a) => {
              const active = a.symbol === toSym || (toSym === "USDC" && a.symbol === fromSym);
              return (
                <button
                  key={a.symbol}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (a.symbol === fromSym) {
                      setFromSym(a.symbol === "USDC" ? "HYPE" : "USDC");
                      setToSym(a.symbol);
                    } else {
                      setToSym(a.symbol);
                    }
                  }}
                  className={cn(
                    "flex min-w-[184px] shrink-0 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition",
                    active
                      ? "border-[#1d472f] bg-[#eef4e8] shadow-[0_1px_3px_rgba(24,60,39,0.08)]"
                      : "border-[#dfe7d7] bg-white hover:border-[#b9ccb0] hover:bg-[#fafcf8]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TokenGlyph glyph={a.glyph} accent={a.accent} size={30} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-bold text-[#183225]">{a.symbol}</span>
                        <span className="rounded bg-[#e5eee0] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#315d37]">
                          {a.kind === "coin" ? "Coin" : a.stage === "trading" ? "Curve" : "Spot"}
                        </span>
                      </div>
                      <div className="tabular mt-0.5 text-xs font-medium text-[#556950]">{fmtAssetPx(a.priceUsd)}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Delta pct={a.change24h} className="text-xs" />
                    <div className="tabular mt-0.5 text-[10px] text-[#6d7f66]">
                      {a.balance > 0 ? `${fmtCompact(a.balance, 1)} held` : fmtCompact(a.liquidityUsd, 1)}
                    </div>
                  </div>
                </button>
              );
            })}
      </div>

      {/* Aligned 2-Column Spot & Swap Workstation */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_408px]">
        {/* Left Column: Spot Chart Card + Markets / Balances / Swaps Blotter */}
        <div className="min-w-0 space-y-5">
          {/* Card 1: Spot Asset Telemetry & Interactive Chart */}
          <div className="surface overflow-hidden">
            {!focusAsset ? (
              <div className="p-6">
                <Skeleton className="h-[340px] w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e3eadc] px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <TokenGlyph glyph={focusAsset.glyph} accent={focusAsset.accent} size={42} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-serif-display text-xl font-bold text-[#183225]">{focusAsset.name}</h2>
                        <span className="rounded border border-[#dce6d2] bg-[#f3f7ee] px-2 py-0.5 font-mono text-xs font-semibold text-[#2d5330]">
                          {focusAsset.symbol}
                        </span>
                        <Badge tone={focusAsset.kind === "coin" ? "ice" : "up"}>{focusAsset.venue}</Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#66785f]">
                        <span>Pair: {fromSym} → {toSym}</span>
                        <span>·</span>
                        <span>Venue fee {(focusAsset.feeBps / 100).toFixed(2)}%</span>
                        {focusAsset.slug ? (
                          <>
                            <span>·</span>
                            <Link href={`/token/${focusAsset.slug}`} className="font-medium text-[#1a7248] hover:underline">
                              Token lifecycle & holders ↗
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="tabular font-mono text-2xl font-bold tracking-tight text-[#183225]">{fmtAssetPx(focusAsset.priceUsd)}</div>
                    <div className="tabular mt-0.5 flex items-center gap-2 text-xs sm:justify-end">
                      <span className="font-mono text-[#5c7054]">{fmtPrice(focusAsset.priceHype)} HYPE</span>
                      <Delta pct={focusAsset.change24h} className="font-semibold" />
                    </div>
                  </div>
                </div>

                {/* 4-Column Spot Telemetry Bar */}
                <div className="grid grid-cols-2 gap-4 border-b border-[#e3eadc] bg-[#fafcf8] px-5 py-3.5 text-xs sm:grid-cols-4">
                  <div>
                    <div className="text-[11px] text-[#6d8065]">Spot price (USD)</div>
                    <div className="tabular mt-0.5 font-mono font-bold text-[#183225]">{fmtAssetPx(focusAsset.priceUsd)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6d8065]">Pool / Reserve depth</div>
                    <div className="tabular mt-0.5 font-bold text-[#183225]">{fmtUsd(focusAsset.liquidityUsd)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6d8065]">Market cap</div>
                    <div className="tabular mt-0.5 font-bold text-[#183225]">{fmtUsd(focusAsset.marketCapUsd)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#6d8065]">Your {focusAsset.symbol} balance</div>
                    <div className="tabular mt-0.5 font-bold text-[#1d472f]">
                      {fmtTokenQty(focusAsset.balance)} {focusAsset.symbol}
                    </div>
                  </div>
                </div>

                {/* Interactive Spot Chart */}
                <div className="px-2 py-2">
                  <MarketChart data={focusAsset.trail} symbol={`${focusAsset.symbol}/USD`} height={248} />
                </div>

                {/* Cross-Market Bridge Footer (Spot <-> Perp) */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3eadc] bg-[#fafcf8] px-5 py-3 text-xs">
                  <span className="text-[#66795e]">
                    {focusAsset.kind === "coin"
                      ? "Instant settlement across native Elysium & HyperCore liquidity reserves."
                      : focusAsset.stage === "trading"
                        ? "Swaps route directly through the Elysium constant-product bonding curve."
                        : "Graduated asset — swaps execute against the locked Uniswap V3 & HyperCore spot pool."}
                  </span>
                  {focusAsset.perpMarketId ? (
                    <button
                      type="button"
                      onClick={() => onSwitchToPerp(focusAsset.perpMarketId)}
                      className="font-semibold text-[#1a7248] hover:underline"
                    >
                      Trade {focusAsset.symbol}-PERP with leverage →
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* Card 2: Markets Directory, Wallet Balances & Recent Swaps Blotter */}
          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3eadc] px-5 py-3">
              <div className="flex items-center gap-5 overflow-x-auto">
                {(
                  [
                    { id: "markets", label: `All coins & tokens (${assets.length})` },
                    { id: "balances", label: `Your balances (${heldAssets.length})` },
                    { id: "swaps", label: `Recent swaps (${state.data?.recentSwaps.length ?? 0})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBlotterTab(t.id)}
                    className={cn(
                      "-mb-[13px] whitespace-nowrap border-b-2 pb-3 text-xs font-semibold transition",
                      blotterTab === t.id ? "border-[#1d472f] text-[#1d472f]" : "border-transparent text-[#6a7c62] hover:text-[#1d472f]",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {blotterTab === "markets" ? (
                <div className="w-48">
                  <Input value={marketSearch} onChange={setMarketSearch} placeholder="Filter coin or token…" className="!h-8 text-xs" />
                </div>
              ) : null}
            </div>

            <div className="p-5">
              {blotterTab === "markets" ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                        <th className="pb-2.5">Coin / Token</th>
                        <th className="pb-2.5">Liquidity venue</th>
                        <th className="pb-2.5 text-right">Spot price</th>
                        <th className="pb-2.5 text-right">24h</th>
                        <th className="pb-2.5 text-right">Your balance</th>
                        <th className="pb-2.5 text-right">Quick swap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaf0e3]">
                      {filteredDirectory.map((a) => (
                        <tr key={a.symbol} className="hover:bg-[#fafcf8]">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <TokenGlyph glyph={a.glyph} accent={a.accent} size={30} />
                              <div>
                                <div className="font-bold text-[#183225]">{a.symbol}</div>
                                <div className="text-[11px] text-[#697c60]">{a.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge tone={a.kind === "coin" ? "ice" : a.stage === "trading" ? "gold" : "up"}>{a.venue}</Badge>
                          </td>
                          <td className="tabular py-3 text-right font-mono font-semibold text-[#183225]">{fmtAssetPx(a.priceUsd)}</td>
                          <td className="py-3 text-right">
                            <Delta pct={a.change24h} className="text-xs font-semibold" />
                          </td>
                          <td className="tabular py-3 text-right font-medium text-[#2d4831]">
                            {a.balance > 0 ? `${fmtTokenQty(a.balance)} ${a.symbol}` : "—"}
                          </td>
                          <td className="py-3 text-right">
                            {a.swappable ? (
                              <div className="inline-flex gap-1.5">
                                <Btn
                                  size="sm"
                                  variant="primary"
                                  onClick={() => loadPair(a.symbol === "HYPE" ? "USDC" : "HYPE", a.symbol)}
                                >
                                  Buy
                                </Btn>
                                {a.balance > 0 ? (
                                  <Btn
                                    size="sm"
                                    variant="outline"
                                    onClick={() => loadPair(a.symbol, a.symbol === "USDC" ? "HYPE" : "USDC")}
                                  >
                                    Sell
                                  </Btn>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#6d8065]">Settling</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : blotterTab === "balances" ? (
                !user ? (
                  <EmptyState
                    title="Sign in to view your balances"
                    body="Swap between HYPE, USDC, STOKE, and any Elysium launchpad or graduated spot token."
                    action={
                      <Btn size="sm" onClick={() => setAuthModal("login")}>
                        Sign in
                      </Btn>
                    }
                  />
                ) : !heldAssets.length ? (
                  <div className="py-8 text-center text-xs text-[#6c7e64]">No balances yet — claim testnet funds from the faucet in the top bar.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                          <th className="pb-2.5">Asset</th>
                          <th className="pb-2.5 text-right">Balance</th>
                          <th className="pb-2.5 text-right">Spot price</th>
                          <th className="pb-2.5 text-right">USD value</th>
                          <th className="pb-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eaf0e3]">
                        {heldAssets.map((a) => (
                          <tr key={a.symbol} className="hover:bg-[#fafcf8]">
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <TokenGlyph glyph={a.glyph} accent={a.accent} size={28} />
                                <div>
                                  <span className="font-bold text-[#183225]">{a.symbol}</span>
                                  <span className="ml-2 text-[11px] text-[#697c60]">{a.name}</span>
                                </div>
                              </div>
                            </td>
                            <td className="tabular py-3 text-right font-semibold text-[#183225]">{fmtTokenQty(a.balance)}</td>
                            <td className="tabular py-3 text-right font-mono text-[#52674d]">{fmtAssetPx(a.priceUsd)}</td>
                            <td className="tabular py-3 text-right font-bold text-[#1d472f]">{fmtUsd(a.balance * a.priceUsd)}</td>
                            <td className="py-3 text-right">
                              <Btn
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  loadPair(a.symbol, a.symbol === "USDC" ? "HYPE" : "USDC");
                                }}
                              >
                                Swap {a.symbol} →
                              </Btn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : !(state.data?.recentSwaps.length ?? 0) ? (
                <div className="py-8 text-center text-xs text-[#6c7e64]">No recent token swaps recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[580px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                        <th className="pb-2.5">Swap</th>
                        <th className="pb-2.5">Token amount</th>
                        <th className="pb-2.5">HYPE / USD value</th>
                        <th className="pb-2.5">Venue</th>
                        <th className="pb-2.5 text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaf0e3]">
                      {(state.data?.recentSwaps ?? []).slice(0, 14).map((s) => (
                        <tr key={s.id} className={cn("hover:bg-[#fafcf8]", s.mine && "bg-[#eef4e7]/60")}>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                  s.side === "buy" ? "bg-[#e5f1de] text-up" : "bg-[#f9e7e9] text-down",
                                )}
                              >
                                {s.side === "buy" ? `HYPE → ${s.symbol}` : `${s.symbol} → HYPE`}
                              </span>
                            </div>
                          </td>
                          <td className="tabular py-2.5 font-medium text-[#183225]">
                            {fmtCompact(s.tokenAmount, 2)} {s.symbol}
                          </td>
                          <td className="tabular py-2.5 font-mono text-[#4c6247]">
                            {fmtNum(s.hypeAmount, 3)} HYPE <span className="text-[#6d8065]">({fmtUsd(s.usdAmount)})</span>
                          </td>
                          <td className="py-2.5 text-[#5b7054]">{s.venue}</td>
                          <td className="py-2.5 text-right text-[#6d8065]">{timeAgo(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Swap Tokens & Coins Execution Ticket */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <div className="surface overflow-hidden">
            {/* Swap Ticket Header */}
            <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-[#183225]">Swap Tokens & Coins</h2>
                <p className="text-[11px] text-[#6a7d60]">Instant multi-venue spot router</p>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-[#dce5d3] bg-[#f4f8ef] p-0.5 text-[11px]">
                {[
                  { bps: 50, label: "0.5%" },
                  { bps: 100, label: "1.0%" },
                  { bps: 250, label: "2.5%" },
                ].map((opt) => (
                  <button
                    key={opt.bps}
                    type="button"
                    onClick={() => setSlippageBps(opt.bps)}
                    title="Max slippage tolerance"
                    className={cn(
                      "rounded px-2 py-0.5 font-semibold transition",
                      slippageBps === opt.bps ? "bg-[#1d472f] text-white" : "text-[#617459] hover:text-[#183225]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {/* YOU PAY BOX */}
              <div className="rounded-xl border border-[#d9e3d0] bg-[#f8faf5] p-4 transition focus-within:border-[#75a76a] focus-within:bg-white">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[#63765b]">You pay</span>
                  <div className="flex items-center gap-1.5">
                    <span className="tabular text-[11px] text-[#687b60]">
                      Bal: {fromAsset ? fmtTokenQty(fromAsset.balance) : "—"}
                    </span>
                    {user && (fromAsset?.balance ?? 0) > 0 ? (
                      <div className="flex items-center gap-1">
                        {[25, 50, 100].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyPct(pct)}
                            className="rounded border border-[#d5e0cb] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#2a5233] transition hover:border-[#1d472f] hover:bg-[#eef4e7]"
                          >
                            {pct === 100 ? "Max" : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    aria-label="You pay amount"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    placeholder="0.00"
                    className="tabular min-w-0 flex-1 bg-transparent font-mono text-2xl font-bold text-[#183225] outline-none placeholder:text-[#9fb098]"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch("");
                      setPickerFilter("all");
                      setPickerSide("from");
                    }}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-[#d4dfca] bg-white px-3 py-2 text-left shadow-2xs transition hover:border-[#1d472f] hover:bg-[#eef4e7]"
                  >
                    {fromAsset ? <TokenGlyph glyph={fromAsset.glyph} accent={fromAsset.accent} size={24} /> : null}
                    <span className="text-sm font-bold text-[#183225]">{fromSym}</span>
                    <span className="text-xs text-[#687b60]">▾</span>
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7e63]">
                  <span className="tabular">
                    ≈ {fromAsset && Number(amountIn) > 0 ? fmtUsd(Number(amountIn) * fromAsset.priceUsd) : "$0.00"}
                  </span>
                  <span>{fromAsset?.venue ?? "Select asset"}</span>
                </div>
              </div>

              {/* FLIP DIRECTION BUTTON */}
              <div className="relative z-10 -my-2.5 flex justify-center">
                <button
                  type="button"
                  onClick={flipPair}
                  aria-label="Invert swap direction"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#d3dec9] bg-white text-sm font-bold text-[#1d472f] shadow-xs transition hover:rotate-180 hover:border-[#1d472f] hover:bg-[#eef4e7]"
                >
                  ⇅
                </button>
              </div>

              {/* YOU RECEIVE BOX */}
              <div className="rounded-xl border border-[#d9e3d0] bg-[#f8faf5] p-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[#63765b]">You receive (estimated)</span>
                  <span className="tabular text-[11px] text-[#687b60]">
                    Bal: {toAsset ? fmtTokenQty(toAsset.balance) : "—"}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {quoting ? (
                      <Skeleton className="h-8 w-36" />
                    ) : (
                      <div className="tabular truncate font-mono text-2xl font-bold text-[#1d472f]">
                        {quote ? fmtTokenQty(quote.amountOut) : "0.00"}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch("");
                      setPickerFilter("all");
                      setPickerSide("to");
                    }}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-[#d4dfca] bg-white px-3 py-2 text-left shadow-2xs transition hover:border-[#1d472f] hover:bg-[#eef4e7]"
                  >
                    {toAsset ? <TokenGlyph glyph={toAsset.glyph} accent={toAsset.accent} size={24} /> : null}
                    <span className="text-sm font-bold text-[#183225]">{toSym}</span>
                    <span className="text-xs text-[#687b60]">▾</span>
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#6b7e63]">
                  <span className="tabular">≈ {quote ? fmtUsd(quote.amountOutUsd) : "$0.00"}</span>
                  <span>{toAsset?.venue ?? "Select asset"}</span>
                </div>
              </div>

              {/* Quote Error or Route Breakdown */}
              {quoteErr ? (
                <div className="mt-4 rounded-lg border border-[#e7c4ca] bg-[#f9e7e9] px-3.5 py-2.5 text-xs font-medium text-down">
                  {quoteErr}
                </div>
              ) : quote ? (
                <div className="mt-4 rounded-xl border border-[#dfe8d6] bg-white px-3.5 py-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-[#697c60]">Exchange rate</span>
                    <button
                      type="button"
                      onClick={() => setInvertRate((v) => !v)}
                      className="tabular font-mono font-semibold text-[#183225] hover:underline"
                    >
                      {invertRate
                        ? `1 ${toSym} = ${fmtTokenQty(1 / Math.max(quote.rate, 1e-18))} ${fromSym}`
                        : `1 ${fromSym} = ${fmtTokenQty(quote.rate)} ${toSym}`}{" "}
                      ⇄
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[#ebf1e4] py-1.5">
                    <span className="text-[#697c60]">Smart route</span>
                    <span className="font-mono text-[11px] font-semibold text-[#1d472f]">{quote.route.join(" → ")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[#ebf1e4] py-1.5">
                    <span className="text-[#697c60]">Minimum received</span>
                    <span className="tabular font-medium text-[#223d27]">
                      {fmtTokenQty(quote.minOut)} {toSym}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[#ebf1e4] py-1.5">
                    <span className="text-[#697c60]">Price impact · Fee</span>
                    <span className="tabular font-medium">
                      <span className={cn(quote.priceImpactPct > 2.5 ? "text-down" : "text-up")}>
                        {quote.priceImpactPct < 0.01 ? "<0.01%" : `${quote.priceImpactPct.toFixed(2)}%`}
                      </span>
                      <span className="mx-1.5 text-[#c2d0b8]">·</span>
                      <span className="text-[#223d27]">{fmtUsd(quote.feeUsd)}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-[#dfe8d6] bg-[#fafcf8] px-3.5 py-3 text-center text-xs text-[#6d8065]">
                  Enter an amount above to calculate live multi-venue routing.
                </div>
              )}

              {/* Primary CTA */}
              <div className="mt-4">
                {user ? (
                  <Btn
                    full
                    size="lg"
                    loading={busy}
                    disabled={!quote || quoting || insufficientBalance}
                    variant={insufficientBalance ? "danger" : "primary"}
                    onClick={executeSwapOrder}
                  >
                    {insufficientBalance
                      ? `Insufficient ${fromSym} balance`
                      : `Swap ${fromSym} for ${toSym}`}
                  </Btn>
                ) : (
                  <Btn full size="lg" onClick={() => setAuthModal("login")}>
                    Sign in to swap
                  </Btn>
                )}
              </div>

              {/* Popular Pair Quick Shortcuts */}
              <div className="mt-4 border-t border-[#e5ecde] pt-3.5">
                <div className="mb-2 flex items-center justify-between text-[11px] text-[#6c7f64]">
                  <span>Popular pairs</span>
                  <span>0.05%–1.00% fee</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["HYPE", "USDC"],
                    ["USDC", "HYPE"],
                    ["HYPE", "STOKE"],
                    ["HYPE", "LAVA"],
                    ["USDC", "ORBT"],
                  ].map(([a, b]) => (
                    <button
                      key={`${a}-${b}`}
                      type="button"
                      onClick={() => loadPair(a!, b!)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[10px] font-semibold transition",
                        fromSym === a && toSym === b
                          ? "border-[#1d472f] bg-[#eef4e7] text-[#1d472f]"
                          : "border-[#dde6d4] bg-[#fafcf8] text-[#566a50] hover:border-[#b5c9ab]",
                      )}
                    >
                      {a} → {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Asset Selector Modal */}
      <Modal
        open={Boolean(pickerSide)}
        onClose={() => setPickerSide(null)}
        title={pickerSide === "from" ? "Select asset to pay" : "Select asset to receive"}
      >
        <div className="space-y-4">
          <Input
            value={pickerSearch}
            onChange={setPickerSearch}
            placeholder="Search by symbol or name (e.g. HYPE, USDC, ORBT)…"
          />

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "all", label: "All assets" },
                { id: "coin", label: "Coins" },
                { id: "spot", label: "Pool / Spot" },
                { id: "curve", label: "Bonding curve" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPickerFilter(f.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                  pickerFilter === f.id ? "bg-[#1d472f] text-white" : "bg-[#eef3e8] text-[#5e7257] hover:text-[#183225]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-[340px] divide-y divide-[#eaf0e3] overflow-y-auto rounded-xl border border-[#dfe8d6] bg-white">
            {pickerAssets.map((a) => {
              const selected = (pickerSide === "from" && a.symbol === fromSym) || (pickerSide === "to" && a.symbol === toSym);
              return (
                <button
                  key={a.symbol}
                  type="button"
                  onClick={() => {
                    if (pickerSide === "from") {
                      if (a.symbol === toSym) setToSym(fromSym);
                      setFromSym(a.symbol);
                    } else {
                      if (a.symbol === fromSym) setFromSym(toSym);
                      setToSym(a.symbol);
                    }
                    setPickerSide(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f6faf2]",
                    selected && "bg-[#eef4e7]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenGlyph glyph={a.glyph} accent={a.accent} size={34} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#183225]">{a.symbol}</span>
                        <Badge tone={a.kind === "coin" ? "ice" : "slate"}>{a.venue}</Badge>
                      </div>
                      <div className="truncate text-xs text-[#697c60]">{a.name}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular font-mono text-xs font-bold text-[#183225]">{fmtTokenQty(a.balance)}</div>
                    <div className="tabular text-[11px] text-[#6b7e63]">{fmtAssetPx(a.priceUsd)}</div>
                  </div>
                </button>
              );
            })}
            {!pickerAssets.length ? (
              <div className="py-8 text-center text-xs text-[#6c7e64]">No swappable coins or tokens match your search.</div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
