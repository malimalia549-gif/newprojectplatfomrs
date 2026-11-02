"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Pipeline } from "@/components/pipeline";
import { MarketChart } from "@/components/market-chart";
import { Badge, Btn, Copyable, Delta, EmptyState, Field, Input, Live, Modal, Progress, Segmented, Skeleton, TokenGlyph, stageText, stageTone } from "@/components/ui";
import { ELYSIUM, cn, fmtCompact, fmtHype, fmtNum, fmtPrice, fmtUsd, shortAddr, timeAgo } from "@/lib/util";
import type { LaunchDetail } from "@/lib/dto";

type Quote = { out: number; fee: number; priceAfter: number; impactPct: number; progress: number };

export default function TokenPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? "");
  const { user, refresh, push, setAuthModal } = useForge();
  const { data, loading, error, mutate, reload } = useLive<{ detail: LaunchDetail }>(`/api/launches/${slug}`, 4000);
  const detail = data?.detail;

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.5");
  const [sellUnit, setSellUnit] = useState<"percent" | "tokens">("percent");
  const [slip, setSlip] = useState(50);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"trades" | "holders" | "lifecycle" | "contract">("trades");
  const [cashtagOpen, setCashtagOpen] = useState(false);

  const net = useLive<{ prices: { hypeUsd: number }; network: { headBlock: number } }>("/api/network", 8000);
  const hypeUsd = net.data?.prices.hypeUsd ?? 28.4;

  const sellTokens = useMemo(() => {
    const n = Number(amount) || 0;
    const bag = detail?.myBalance ?? 0;
    if (side !== "sell" || n <= 0) return 0;
    return sellUnit === "percent" ? (bag * Math.min(100, n)) / 100 : n;
  }, [amount, side, sellUnit, detail?.myBalance]);

  useEffect(() => setQuote(null), [amount, side, slip, sellUnit]);

  const quoteStage = detail?.stage;
  const quoteSold = detail?.soldTokens;

  useEffect(() => {
    if (!quoteStage || quoteStage !== "trading") return;
    let alive = true;
    const id = window.setTimeout(async () => {
      try {
        const parsed = Number(amount) || 0;
        const input = side === "sell" ? sellTokens : parsed;
        if (input <= 0) return setQuote(null);
        const res = await api<Quote>("/api/launches", { json: { action: "quote", slug, side, amount: input } });
        if (alive) setQuote(res);
      } catch {
        if (alive) setQuote(null);
      }
    }, 260);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [amount, side, slip, slug, sellTokens, quoteStage, quoteSold]);

  const submit = async () => {
    if (!user) return setAuthModal("login");
    const n = side === "buy" ? Number(amount) || 0 : sellTokens;
    if (n <= 0) return push({ kind: "error", title: "Enter an amount" });
    const sold = detail?.soldTokens ?? 0;
    const optimisticSold = side === "buy" ? Math.min(800_000_000, sold + (quote?.out ?? 0)) : Math.max(0, sold - n);
    mutate((prev) =>
      prev
        ? {
            ...prev,
            detail: {
              ...prev.detail,
              soldTokens: optimisticSold,
              progressPct: Math.min(100, (optimisticSold / 800_000_000) * 100),
              priceHype: quote?.priceAfter ?? prev.detail.priceHype,
              myBalance: side === "buy" ? prev.detail.myBalance + (quote?.out ?? 0) : Math.max(0, prev.detail.myBalance - n),
            },
          }
        : prev,
    );
    setBusy(true);
    try {
      const res = await api<{ tx: string; tokensOut: number; hypeOut: number }>(`/api/launches/${slug}/action`, { json: { action: side, amount: n, slippageBps: slip } });
      push({
        kind: "tx",
        title: side === "buy" ? `Bought ${fmtCompact(res.tokensOut, 2)} ${detail?.symbol}` : `Sold ${fmtCompact(res.tokensOut, 2)} ${detail?.symbol}`,
        body: `${fmtNum(res.hypeOut, 4)} HYPE · ${shortAddr(res.tx, 6)}`,
      });
      await refresh();
      await reload();
    } catch (e) {
      push({ kind: "error", title: "Trade not executed", body: (e as Error).message });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const advance = async (action: string) => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      const res = await api<{ tx: string }>(`/api/launches/${slug}/action`, { json: { action } });
      push({ kind: "success", title: "Lifecycle step completed", body: `${action} · ${shortAddr(res.tx, 6)}` });
      await reload();
    } catch (e) {
      push({ kind: "error", title: "Step failed", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="forge-page">
        <EmptyState title="Launch not found" body={error} action={<Btn href="/launch">Back to launchpad</Btn>} />
      </div>
    );

  if (loading && !detail)
    return (
      <div className="forge-page space-y-5">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-[440px] rounded-xl" />
          <Skeleton className="h-[440px] rounded-xl" />
        </div>
      </div>
    );

  if (!detail) return null;
  const l = detail;
  const tradable = l.stage === "trading" || l.stage === "created";
  const pipeCurrent = l.stage === "graduating" ? "graduate" : l.stage === "perp_listed" ? "hip3" : l.stage === "graduated" ? "pool" : l.stage;
  const usdChartSeries = l.curve.map((c) => c.price * hypeUsd);

  return (
    <div className="forge-page space-y-5">
      {/* Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-[#6a7d60]" aria-label="Breadcrumb">
          <Link href="/launch" className="font-medium hover:text-[#1d472f]">
            Launchpad
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-[#1d472f]">${l.symbol}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {l.stage === "perp_listed" && !l.cashtag ? (
            <Btn variant="outline" size="sm" onClick={() => setCashtagOpen(true)}>
              List ${l.symbol} on X
            </Btn>
          ) : null}
          <Btn variant="outline" size="sm" href={`/terminal?mode=swap&to=${l.symbol}`}>
            Swap {l.symbol} ⇄
          </Btn>
          {l.perpMarketId ? (
            <Btn variant="primary" size="sm" href={`/terminal?m=${l.perpMarketId}`}>
              Trade {l.symbol}-PERP ↗
            </Btn>
          ) : null}
        </div>
      </div>

      {/* Unified Token Identity & 5-KPI Header Card */}
      <div className="surface overflow-hidden">
        <div className="flex flex-col justify-between gap-5 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <TokenGlyph glyph={l.glyph} accent={l.accent} size={52} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate !text-2xl sm:!text-[30px]">{l.name}</h1>
                <span className="rounded-md border border-[#dce6d2] bg-[#f3f7ee] px-2 py-0.5 font-mono text-xs font-semibold text-[#2d5330]">
                  ${l.symbol}
                </span>
                <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
                {l.cashtag ? <Badge tone="gold">${l.cashtag} on X</Badge> : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#697c60]">
                {l.creatorName ? <span>Created by <strong className="font-medium text-[#2b482e]">{l.creatorName}</strong></span> : null}
                <span>·</span>
                <span>Launched {timeAgo(l.createdAt)}</span>
                <span>·</span>
                <Copyable text={l.tokenAddress ?? "0x"} label={shortAddr(l.tokenAddress, 5)} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start border-t border-[#e5ecde] pt-4 md:items-end md:border-t-0 md:pt-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#6e8166]">Spot / Curve Price</div>
            <div className="mt-1 flex items-baseline gap-2">
              <Live value={l.priceHype} render={fmtPrice} className="tabular font-mono text-2xl font-bold tracking-tight text-[#183225] sm:text-[28px]" />
              <span className="text-xs font-semibold text-[#5b7054]">HYPE</span>
            </div>
            <div className="tabular mt-1 flex items-center gap-2 text-xs">
              <span className="font-mono text-[#5c7054]">≈ {fmtUsd(l.priceHype * hypeUsd)}</span>
              <Delta pct={l.change24h} className="font-semibold" />
            </div>
          </div>
        </div>

        {/* 5-Column KPI Strip Inside Header Card */}
        <div className="grid grid-cols-2 gap-4 border-t border-[#e3eadc] bg-[#fafcf8] px-5 py-4 sm:grid-cols-3 lg:grid-cols-5 sm:px-6">
          <div>
            <div className="text-[11px] text-[#6d8065]">Market cap</div>
            <div className="tabular mt-1 text-sm font-bold text-[#183225]">{fmtCompact(l.marketCapHype, 2)} HYPE</div>
            <div className="tabular text-[11px] text-[#6b7e63]">{fmtUsd(l.marketCapHype * hypeUsd)}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#6d8065]">Capital raised</div>
            <div className="tabular mt-1 text-sm font-bold text-[#183225]">
              <Live value={l.raisedHype} render={(v) => fmtNum(v, 3)} /> HYPE
            </div>
            <div className="tabular text-[11px] text-[#6b7e63]">Target {fmtNum(l.graduationHype, 0)} HYPE</div>
          </div>
          <div>
            <div className="text-[11px] text-[#6d8065]">Cumulative volume</div>
            <div className="tabular mt-1 text-sm font-bold text-[#183225]">{fmtHype(l.volumeHype)}</div>
            <div className="tabular text-[11px] text-[#6b7e63]">{fmtNum(l.tradesCount, 0)} executions</div>
          </div>
          <div>
            <div className="text-[11px] text-[#6d8065]">Active holders</div>
            <div className="tabular mt-1 text-sm font-bold text-[#183225]">{fmtNum(l.holdersCount, 0)}</div>
            <div className="tabular text-[11px] text-[#6b7e63]">Curve fee {(l.feeBps / 100).toFixed(2)}%</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#6d8065]">Curve graduation</span>
              <span className="tabular font-bold text-[#1d472f]">{l.progressPct.toFixed(1)}%</span>
            </div>
            <Progress pct={l.progressPct} accent={l.accent} height={6} />
            <div className="tabular mt-1 text-[10px] text-[#6d8065]">{fmtCompact(l.soldTokens, 1)} / 800M sold</div>
          </div>
        </div>
      </div>

      {/* Horizontal Lifecycle Progress Bar */}
      <Pipeline current={pipeCurrent} compact />

      {/* Main 2-Column Aligned Workspace */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_364px]">
        {/* Left Column: Chart Card + Tabbed Blotter Card */}
        <div className="min-w-0 space-y-5">
          {/* Card 1: Bonding Curve Price Chart & Reserve Telemetry */}
          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3eadc] px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-[#183225]">Price & Bonding Curve Trajectory</h2>
                <p className="text-[11px] text-[#6c7f64]">Constant-product reserve pricing on Elysium ({ELYSIUM.chainId})</p>
              </div>
              <Badge tone="ice">{stageText[l.stage] ?? l.stage}</Badge>
            </div>

            <div className="px-2 py-2">
              <MarketChart data={usdChartSeries} symbol={`${l.symbol}/USD`} height={240} />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#e3eadc] bg-[#fafcf8] px-5 py-3.5 text-xs sm:grid-cols-3">
              <div>
                <div className="text-[11px] text-[#6d8065]">Virtual HYPE reserve</div>
                <div className="tabular mt-0.5 font-semibold text-[#213c27]">{fmtNum(l.raisedHype + (l.graduationHype * 273) / 800, 4)} HYPE</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6d8065]">Virtual token reserve</div>
                <div className="tabular mt-0.5 font-semibold text-[#213c27]">{fmtCompact(1_073_000_000 - l.soldTokens, 2)} {l.symbol}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6d8065]">Creator / Treasury fees</div>
                <div className="tabular mt-0.5 font-semibold text-[#213c27]">
                  {fmtNum(l.creatorHype, 3)} / {fmtNum(l.treasuryHype, 3)} HYPE
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Unified Tabbed Blotter (Trades, Holders, Lifecycle, Contract & About) */}
          <div className="surface overflow-hidden">
            <div className="flex items-center gap-6 overflow-x-auto border-b border-[#e3eadc] px-5 py-3">
              {(
                [
                  { id: "trades", label: `Recent trades (${l.trades.length})` },
                  { id: "holders", label: `Top holders (${l.holders.length})` },
                  { id: "lifecycle", label: `Lifecycle log (${l.events.length})` },
                  { id: "contract", label: "About & contract" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "-mb-[13px] whitespace-nowrap border-b-2 pb-3 text-xs font-semibold transition",
                    tab === t.id ? "border-[#1d472f] text-[#1d472f]" : "border-transparent text-[#6a7c62] hover:text-[#1d472f]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "trades" ? (
                !l.trades.length ? (
                  <div className="py-10 text-center text-xs text-[#6c7e64]">No trades recorded yet. Be the first buyer on the curve.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                          <th className="pb-2.5">Side</th>
                          <th className="pb-2.5">HYPE amount</th>
                          <th className="pb-2.5">Token amount</th>
                          <th className="pb-2.5 text-right">Price after</th>
                          <th className="pb-2.5 text-right">Age</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eaf0e3]">
                        {l.trades.slice(0, 16).map((t) => (
                          <tr key={t.id} className={cn("hover:bg-[#fafcf8]", t.mine && "bg-[#eef4e7]/60")}>
                            <td className="py-2.5">
                              <span
                                className={cn(
                                  "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                  t.side === "buy" ? "bg-[#e5f1de] text-up" : "bg-[#f9e7e9] text-down",
                                )}
                              >
                                {t.side}
                              </span>
                            </td>
                            <td className="tabular py-2.5 font-medium text-[#183225]">{fmtNum(t.hypeAmount, 4)} HYPE</td>
                            <td className="tabular py-2.5 text-[#496045]">
                              {fmtCompact(t.tokenAmount, 2)} {l.symbol}
                            </td>
                            <td className="tabular py-2.5 text-right font-mono text-[#233d29]">{fmtPrice(t.priceAfter)} HYPE</td>
                            <td className="py-2.5 text-right text-[#6d8065]">{timeAgo(t.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : tab === "holders" ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                        <th className="pb-2.5">Rank</th>
                        <th className="pb-2.5">Account / Contract</th>
                        <th className="pb-2.5 text-right">Balance</th>
                        <th className="pb-2.5 text-right">Supply share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaf0e3]">
                      {l.holders.map((h) => (
                        <tr key={`${h.wallet}-${h.rank}`} className={cn("hover:bg-[#fafcf8]", h.isPool && "text-[#697c60]")}>
                          <td className="tabular py-2.5 font-medium">#{h.rank}</td>
                          <td className="py-2.5">
                            {h.isPool ? (
                              <span className="inline-flex items-center gap-2 font-medium text-[#2c5330]">
                                {h.name} <Badge tone="slate">Protocol</Badge>
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-[#223d27]">{shortAddr(h.wallet, 6)}</span>
                            )}
                          </td>
                          <td className="tabular py-2.5 text-right font-medium text-[#183225]">{fmtCompact(h.amount, 2)}</td>
                          <td className="tabular py-2.5 text-right font-semibold text-[#2d5330]">{h.pct.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : tab === "lifecycle" ? (
                <ol className="space-y-4">
                  {l.events.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#e5ecde] bg-[#fafcf8] p-3.5 text-xs">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1a7248]" />
                        <div>
                          <div className="font-semibold text-[#183225]">{e.label}</div>
                          {e.detail ? <p className="mt-0.5 leading-relaxed text-[#5f7358]">{e.detail}</p> : null}
                          {e.txHash ? <Copyable className="mt-1" text={e.txHash} label={`Tx ${shortAddr(e.txHash, 8)}`} /> : null}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#6d8065]">{timeAgo(e.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 text-xs">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6a7d60]">Project overview</h3>
                    <p className="leading-relaxed text-[#334d36]">{l.description || "No project description provided."}</p>
                    <div className="rounded-lg border border-[#e3eadc] bg-[#f8faf5] p-3 text-[11px] leading-relaxed text-[#64775c]">
                      Immutable 1,000,000,000 fixed supply. 800,000,000 distributed on the bonding curve; 200,000,000 reserved for locked liquidity upon graduation.
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6a7d60]">Onchain specifications</h3>
                    <div className="divide-y divide-[#e4ecdc] rounded-lg border border-[#e3eadc] bg-[#fafcf8] px-3.5">
                      <SpecRow k="Token contract" v={<Copyable text={l.tokenAddress ?? "0x"} label={shortAddr(l.tokenAddress, 6)} />} />
                      <SpecRow k="Liquidity pool" v={l.poolAddress ? <Copyable text={l.poolAddress} label={shortAddr(l.poolAddress, 6)} /> : "Pending graduation"} />
                      <SpecRow k="Total supply" v="1,000,000,000" />
                      <SpecRow k="Network" v={`${ELYSIUM.name} Testnet (${ELYSIUM.chainId})`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Trade & Lifecycle Ticket (Aligned top-to-top with Left Column!) */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
              <span className="text-xs font-semibold text-[#183225]">{tradable ? `Trade $${l.symbol}` : "Lifecycle settlement"}</span>
              <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
            </div>

            <div className="p-5">
              {tradable ? (
                <div className="space-y-4">
                  {/* Buy / Sell Toggle */}
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#eef3e8] p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSide("buy");
                        setAmount("0.5");
                      }}
                      className={cn(
                        "h-9 rounded-md text-xs font-bold transition",
                        side === "buy" ? "bg-[#1d472f] text-white shadow-xs" : "text-[#5c7055] hover:text-[#183225]",
                      )}
                    >
                      Buy {l.symbol}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSide("sell");
                        setAmount("25");
                      }}
                      className={cn(
                        "h-9 rounded-md text-xs font-bold transition",
                        side === "sell" ? "bg-[#b54859] text-white shadow-xs" : "text-[#5c7055] hover:text-[#183225]",
                      )}
                    >
                      Sell {l.symbol}
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <Field
                      label={side === "buy" ? "Pay amount (HYPE)" : "Sell amount"}
                      right={
                        side === "buy" ? (
                          <span className="tabular text-[11px] text-[#687b60]">Avail: {fmtNum(user?.hype ?? 0, 3)} HYPE</span>
                        ) : (
                          <Segmented
                            size="sm"
                            value={sellUnit}
                            onChange={(v) => setSellUnit(v)}
                            options={[
                              { value: "percent", label: "%" },
                              { value: "tokens", label: "Tokens" },
                            ]}
                          />
                        )
                      }
                    >
                      <Input
                        value={amount}
                        onChange={setAmount}
                        type="number"
                        step="0.1"
                        suffix={side === "buy" ? "HYPE" : sellUnit === "percent" ? "%" : l.symbol}
                      />
                    </Field>

                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {(side === "buy" ? [0.25, 0.5, 1, 2] : [25, 50, 75, 100]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            if (side === "sell") setSellUnit("percent");
                            setAmount(String(v));
                          }}
                          className="h-7 rounded border border-[#dce5d3] bg-[#fafcf8] text-[11px] font-medium text-[#5c7054] transition hover:border-[#b3c8a6] hover:bg-[#eef4e7]"
                        >
                          {side === "buy" ? `${v} HYPE` : `${v}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compact Slippage Selector */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-[#53684d]">Max slippage</span>
                      <span className="tabular font-mono text-[11px] font-semibold text-[#1d472f]">{(slip / 100).toFixed(2)}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[50, 100, 250, 500].map((bps) => (
                        <button
                          key={bps}
                          type="button"
                          onClick={() => setSlip(bps)}
                          className={cn(
                            "h-7 rounded border text-[11px] font-semibold transition",
                            slip === bps
                              ? "border-[#1d472f] bg-[#eef4e7] text-[#1d472f]"
                              : "border-[#dce5d3] bg-white text-[#62755b] hover:border-[#b5c9ab]",
                          )}
                        >
                          {(bps / 100).toFixed(1)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quote Breakdown */}
                  <div className="rounded-lg border border-[#dfe8d6] bg-[#f8faf5] px-3.5 py-2.5 text-xs">
                    {quote ? (
                      <>
                        <SpecRow k="Estimated output" v={`${fmtCompact(quote.out, 3)} ${side === "buy" ? l.symbol : "HYPE"}`} strong />
                        <SpecRow k="Post-trade price" v={`${fmtPrice(quote.priceAfter)} HYPE`} />
                        <SpecRow k="Price impact" v={`${quote.impactPct.toFixed(2)}%`} />
                        <SpecRow k="Protocol fee (1%)" v={`${fmtNum(quote.fee, 5)} HYPE`} />
                      </>
                    ) : (
                      <div className="py-2 text-center text-xs text-[#6d8065]">Enter a valid amount to preview execution quote.</div>
                    )}
                  </div>

                  {user ? (
                    <Btn full size="lg" loading={busy} onClick={submit} variant={side === "buy" ? "primary" : "danger"}>
                      {side === "buy" ? `Buy ${l.symbol}` : `Sell ${l.symbol}`}
                    </Btn>
                  ) : (
                    <Btn full size="lg" onClick={() => setAuthModal("login")}>
                      Sign in to trade
                    </Btn>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#dfe8d6] bg-[#f8faf5] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7e63]">Next milestone</div>
                    <div className="mt-1 font-serif-display text-xl font-bold text-[#183225]">{l.nextAction?.label ?? "Graduation complete"}</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5c7055]">
                      {l.nextAction?.hint ?? "The bonding curve is complete. Liquidity is locked and secondary markets are active."}
                    </p>
                  </div>

                  {l.nextAction ? (
                    <Btn
                      full
                      size="lg"
                      loading={busy}
                      onClick={() => advance(l.nextAction!.action)}
                      variant={l.nextAction.action === "confirm" ? "gold" : "primary"}
                    >
                      {l.nextAction.label}
                      {l.nextAction.costHype ? ` · ${fmtNum(l.nextAction.costHype, 2)} HYPE` : ""}
                    </Btn>
                  ) : null}

                  {l.stage === "graduating" ? (
                    <Btn full variant="danger" loading={busy} onClick={() => advance("abort")}>
                      Abort and reopen curve
                    </Btn>
                  ) : null}

                  {(l.stage === "graduated" || l.stage === "perp_listed") ? (
                    <Btn full variant="primary" href={`/terminal?mode=swap&to=${l.symbol}`}>
                      Swap {l.symbol} on Spot Pool ⇄
                    </Btn>
                  ) : null}
                  {l.perpMarketId ? (
                    <Btn full variant="outline" href={`/terminal?m=${l.perpMarketId}`}>
                      Open {l.symbol}-PERP terminal ↗
                    </Btn>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3 border-t border-[#e3eadc] pt-4 text-xs">
                    <div className="rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3">
                      <div className="text-[11px] text-[#6d8065]">Locked HYPE</div>
                      <div className="tabular mt-1 font-bold text-[#183225]">{fmtNum(l.poolLiquidityHype, 3)}</div>
                    </div>
                    <div className="rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3">
                      <div className="text-[11px] text-[#6d8065]">Pool reserve</div>
                      <div className="tabular mt-1 font-bold text-[#183225]">{fmtCompact(l.poolTokens, 0)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Your Position Footer */}
            <div className="flex items-center justify-between border-t border-[#e3eadc] bg-[#fafcf8] px-5 py-3 text-xs">
              <span className="text-[#697c60]">Your balance</span>
              <span className="tabular font-semibold text-[#183225]">
                {fmtCompact(l.myBalance, 2)} {l.symbol}{" "}
                <span className="font-normal text-[#6b7e63]">({fmtUsd(l.myBalance * l.priceHype * hypeUsd)})</span>
              </span>
            </div>
          </div>
        </aside>
      </div>

      <CashtagModal open={cashtagOpen} onClose={() => setCashtagOpen(false)} slug={slug} symbol={l.symbol} onDone={() => advance("listCashtag")} />
    </div>
  );
}

function SpecRow({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-2 text-xs", strong && "font-semibold text-[#183225]")}>
      <span className="text-[#697c60]">{k}</span>
      <span className="tabular font-medium text-[#223d27]">{v}</span>
    </div>
  );
}

function CashtagModal({ open, onClose, slug, symbol, onDone }: { open: boolean; onClose: () => void; slug: string; symbol: string; onDone: () => Promise<void> }) {
  const { user, push } = useForge();
  const [handle, setHandle] = useState(user?.xHandle ?? "");
  const [intent, setIntent] = useState<{ reference: string; code?: string; amountUsd: number; deeplink: string; memo: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={`List $${symbol} on X`}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-400">
          A cashtag displays live price, chart, and a Trade button on X. The listing fee is <span className="font-semibold text-white">0.75 HYPE</span> equivalent via X Money.
        </p>
        <Field label="Payment handle">
          <Input value={handle} onChange={setHandle} placeholder="@handle" />
        </Field>
        {!intent ? (
          <Btn
            full
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await api<{ reference: string; code?: string; amountUsd: number; deeplink: string; memo: string }>(`/api/launches/${slug}/action`, {
                  json: { action: "cashtagCheckout", handle, hype: 0.75 },
                });
                setIntent(res);
              } catch (e) {
                push({ kind: "error", title: "Checkout failed", body: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            Request payment
          </Btn>
        ) : (
          <div className="space-y-4 rounded-xl border border-[#dfe8d6] bg-[#f8faf5] p-4">
            <div className="text-sm text-slate-300">
              Send <span className="font-semibold text-white">{fmtUsd(intent.amountUsd)}</span> to <span className="font-semibold text-white">@{handle || "handle"}</span> with memo{" "}
              <span className="font-mono text-xs text-gold">{intent.memo}</span>
            </div>
            <a href={intent.deeplink} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-ice-400 hover:underline">
              Open X ↗
            </a>
            <Field label="Confirmation code" hint={intent.code ? `Sandbox code: ${intent.code}` : "Confirmed automatically by the live rail."}>
              <Input value={code} onChange={setCode} placeholder="6 digits" maxLength={6} />
            </Field>
            <Btn
              full
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/x`, { json: { action: "confirm", reference: intent.reference, code } });
                  await onDone();
                  onClose();
                } catch (e) {
                  push({ kind: "error", title: "Could not confirm", body: (e as Error).message });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm and list
            </Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}
