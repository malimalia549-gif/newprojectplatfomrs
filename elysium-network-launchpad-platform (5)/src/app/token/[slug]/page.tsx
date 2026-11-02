"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowLeftRight, AtSign, Copy, Droplets, GraduationCap, Info, Layers, Lock, Rocket, TrendingUp, Users, Wallet,
} from "lucide-react";
import { api, useForge, useLive } from "@/components/providers";
import { MarketChart } from "@/components/market-chart";
import { Badge, Btn, Copyable, Delta, EmptyState, Field, Input, Modal, Progress, Segmented, Skeleton, TokenGlyph, stageText, stageTone } from "@/components/ui";
import { ELYSIUM, cn, fmtCompact, fmtHype, fmtNum, fmtPrice, fmtUsd, shortAddr, timeAgo } from "@/lib/util";
import type { LaunchDetail } from "@/lib/dto";

type Quote = { out: number; fee: number; priceAfter: number; impactPct: number; progress: number };
type Tab = "holders" | "trades" | "lifecycle" | "about";

const LIFECYCLE = [
  { key: "create", label: "Create", icon: Rocket },
  { key: "trade", label: "Curve", icon: TrendingUp },
  { key: "graduate", label: "Graduate", icon: GraduationCap },
  { key: "pool", label: "Pool", icon: Layers },
  { key: "perp", label: "HIP-3", icon: Activity },
];

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
  const [tab, setTab] = useState<Tab>("holders");
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

  useEffect(() => {
    if (!detail || detail.stage !== "trading") return;
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
    }, 300);
    return () => { alive = false; window.clearTimeout(id); };
  }, [amount, side, slip, slug, sellTokens, detail?.stage, detail?.soldTokens]);

  const submit = async () => {
    if (!user) return setAuthModal("login");
    const n = side === "buy" ? Number(amount) || 0 : sellTokens;
    if (n <= 0) return push({ kind: "error", title: "Enter an amount" });
    const sold = detail?.soldTokens ?? 0;
    const optimisticSold = side === "buy" ? Math.min(800_000_000, sold + (quote?.out ?? 0)) : Math.max(0, sold - n);
    mutate((prev) => prev ? { ...prev, detail: { ...prev.detail, soldTokens: optimisticSold, progressPct: Math.min(100, (optimisticSold / 800_000_000) * 100), priceHype: quote?.priceAfter ?? prev.detail.priceHype, myBalance: side === "buy" ? prev.detail.myBalance + (quote?.out ?? 0) : Math.max(0, prev.detail.myBalance - n) } } : prev);
    setBusy(true);
    try {
      const res = await api<{ tx: string; tokensOut: number; hypeOut: number }>(`/api/launches/${slug}/action`, { json: { action: side, amount: n, slippageBps: slip } });
      push({ kind: "tx", title: side === "buy" ? `Bought ${fmtCompact(res.tokensOut, 2)} ${detail?.symbol}` : `Sold ${fmtCompact(res.tokensOut, 2)} ${detail?.symbol}`, body: `${fmtNum(res.hypeOut, 4)} HYPE · ${shortAddr(res.tx, 6)}` });
      await refresh();
      await reload();
    } catch (e) {
      push({ kind: "error", title: "Trade not executed", body: (e as Error).message });
      await reload();
    } finally { setBusy(false); }
  };

  const advance = async (action: string) => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      const res = await api<{ tx: string }>(`/api/launches/${slug}/action`, { json: { action } });
      push({ kind: "success", title: "Step completed", body: `${action} · ${shortAddr(res.tx, 6)}` });
      await reload();
    } catch (e) {
      push({ kind: "error", title: "Step failed", body: (e as Error).message });
    } finally { setBusy(false); }
  };

  if (error) return <div className="forge-page pt-16"><EmptyState title="Launch not found" body={error} action={<Btn href="/launch">Back to launchpad</Btn>} /></div>;

  if (loading && !detail)
    return (
      <div className="forge-page space-y-5">
        <Skeleton className="h-24 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" /></div>
      </div>
    );

  if (!detail) return null;
  const l = detail;
  const tradable = l.stage === "trading" || l.stage === "created";
  const stageIdx = l.stage === "created" ? 0 : l.stage === "trading" || l.stage === "frozen" ? 1 : l.stage === "graduating" ? 2 : l.stage === "graduated" ? 3 : 4;
  const curvePct = Math.min(100, (l.soldTokens / 800_000_000) * 100);

  return (
    <div className="forge-page ls-ambient">
      {/* Instrument header */}
      <div className="tk-head ls-reveal">
        <div className="flex min-w-0 items-center gap-4">
          <TokenGlyph glyph={l.glyph} accent={l.accent} size={56} />
          <div className="min-w-0">
            <nav className="ls-crumb !mb-1"><Link href="/launch">Launchpad</Link><span>/</span><b>${l.symbol}</b></nav>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="!text-[30px] sm:!text-[36px]">{l.name}</h1>
              <span className="font-mono text-sm font-semibold text-[#5c7054]">${l.symbol}</span>
              <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
              {l.cashtag ? <Badge tone="gold"><AtSign size={10} />{l.cashtag}</Badge> : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#697c60]">
              <span>by {l.creatorName ?? "anon"}</span>
              {l.xHandle ? <a className="inline-flex items-center gap-1 font-semibold text-[#1a7248] hover:underline" href={`https://x.com/${l.xHandle}`} target="_blank" rel="noreferrer"><AtSign size={10} />{l.xHandle}</a> : null}
              <span>{timeAgo(l.createdAt)}</span>
              {l.tokenAddress ? <Copyable text={l.tokenAddress} label={shortAddr(l.tokenAddress, 6)} /> : null}
            </div>
          </div>
        </div>
        <div className="tk-price">
          <div className="text-[11px] font-medium text-[#6d8065]">Mark price</div>
          <div className="tabular font-mono text-[30px] font-bold leading-none tracking-tight text-[#183225]">{fmtPrice(l.priceHype)}<span className="ml-1 text-xs font-semibold text-[#5f7358]">HYPE</span></div>
          <div className="mt-1 flex items-center justify-end gap-2 text-[11px]">
            <span className="tabular text-[#6d8065]">{fmtUsd(l.priceHype * hypeUsd)}</span>
            <Delta pct={l.change24h} className="font-semibold" />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="tk-kpis ls-reveal" style={{ animationDelay: "60ms" }}>
        <div><span><Layers size={11} /> Market cap</span><strong>{fmtHype(l.marketCapHype)}</strong><small>{fmtUsd(l.marketCapHype * hypeUsd)}</small></div>
        <div><span><Droplets size={11} /> Raised</span><strong>{fmtNum(l.raisedHype, 2)}</strong><small>of {fmtNum(l.graduationHype, 0)} HYPE target</small></div>
        <div><span><Activity size={11} /> Volume</span><strong>{fmtHype(l.volumeHype)}</strong><small>{fmtNum(l.tradesCount, 0)} trades</small></div>
        <div><span><Users size={11} /> Holders</span><strong>{fmtNum(l.holdersCount, 0)}</strong><small>fee {(l.feeBps / 100).toFixed(2)}%</small></div>
        <div><span><Wallet size={11} /> Your balance</span><strong>{fmtCompact(l.myBalance, 2)}</strong><small>{fmtUsd(l.myBalance * l.priceHype * hypeUsd)}</small></div>
      </div>

      {/* Lifecycle rail */}
      <div className="tk-life ls-reveal" style={{ animationDelay: "100ms" }}>
        <ol>
          {LIFECYCLE.map((s, i) => (
            <li key={s.key} data-state={i < stageIdx ? "done" : i === stageIdx ? "active" : "todo"}>
              <span className="tk-life-ico">{i < stageIdx ? <Lock size={12} /> : <s.icon size={13} />}</span>
              <span className="tk-life-label">{s.label}</span>
            </li>
          ))}
        </ol>
        <div className="tk-life-progress">
          <div className="flex items-center justify-between text-[11px] text-[#6d8065]">
            <span>Curve absorption</span>
            <span className="tabular font-mono font-semibold text-[#1d472f]">{l.soldTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} / 800,000,000 · {curvePct.toFixed(1)}%</span>
          </div>
          <Progress pct={curvePct} accent={l.accent} height={6} />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: chart + tabs */}
        <div className="min-w-0 space-y-5">
          <div className="surface ls-reveal overflow-hidden" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#183225]"><TrendingUp size={13} /> Price history</span>
              <span className="font-mono text-[10px] text-[#6d8065]">{l.curve.length} prints · live</span>
            </div>
            <div className="p-4">
              <MarketChart data={l.curve.map((c) => c.price)} symbol={`${l.symbol}/HYPE`} height={260} />
            </div>
          </div>

          <div className="surface ls-reveal overflow-hidden" style={{ animationDelay: "160ms" }}>
            <div className="border-b border-[#e3eadc] px-5 pt-3">
              <Segmented
                underline
                value={tab}
                onChange={(v) => setTab(v)}
                options={[
                  { value: "holders", label: `Holders (${l.holders.length})` },
                  { value: "trades", label: `Trades (${l.trades.length})` },
                  { value: "lifecycle", label: "Lifecycle" },
                  { value: "about", label: "About & contract" },
                ]}
              />
            </div>
            <div className="p-5" key={tab}>
              {tab === "holders" ? (
                !l.holders.length ? <EmptyState title="No holders yet" body="Be the first to buy on the bonding curve." /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-xs">
                      <thead><tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]"><th className="pb-2.5">#</th><th className="pb-2.5">Holder</th><th className="pb-2.5 text-right">Balance</th><th className="pb-2.5 text-right">Share</th></tr></thead>
                      <tbody className="divide-y divide-[#eaf0e3]">
                        {l.holders.map((h) => (
                          <tr key={`${h.wallet}-${h.rank}`} className="ls-reveal">
                            <td className="tabular py-3 text-[#6d8065]">{h.rank}</td>
                            <td className="py-3">{h.isPool ? <span className="inline-flex items-center gap-1.5 font-semibold text-[#183225]"><Layers size={12} />{h.name}</span> : <span className="font-mono">{shortAddr(h.wallet, 6)}</span>}</td>
                            <td className="tabular py-3 text-right font-semibold text-[#183225]">{fmtCompact(h.amount, 2)}</td>
                            <td className="tabular py-3 text-right">{h.pct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : tab === "trades" ? (
                !l.trades.length ? <EmptyState title="No trades yet" body="The curve is open — first trade sets the opening print." /> : (
                  <div className="max-h-[420px] divide-y divide-[#eaf0e3] overflow-y-auto">
                    {l.trades.map((t) => (
                      <div key={t.id} className={cn("tabular grid grid-cols-[64px_1fr_1fr_auto] items-center gap-3 py-2.5 text-xs", t.mine && "rounded bg-[#eef4e7] px-2")}>
                        <span className={cn("inline-flex items-center gap-1 font-bold", t.side === "buy" ? "text-up" : "text-down")}>{t.side === "buy" ? <TrendingUp size={11} /> : <ArrowLeftRight size={11} />}{t.side}</span>
                        <span className="text-[#334d36]">{fmtNum(t.hypeAmount, 4)} HYPE</span>
                        <span className="text-[#6d8065]">{fmtCompact(t.tokenAmount, 1)} @ {fmtPrice(t.priceAfter)}</span>
                        <span className="text-[10px] text-[#6d8065]">{timeAgo(t.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : tab === "lifecycle" ? (
                <ol className="space-y-3">
                  {l.events.map((e, i) => (
                    <li key={e.id} className="ls-reveal flex items-start justify-between gap-4 rounded-lg border border-[#e5ecde] bg-[#fafcf8] p-3.5 text-xs" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#e8f0e2] text-[#1d472f]"><GraduationCap size={12} /></span>
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
                <div className="grid gap-6 text-xs md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#6a7d60]"><Info size={12} /> Project overview</h3>
                    <p className="leading-relaxed text-[#334d36]">{l.description || "No project description provided."}</p>
                    <div className="rounded-lg border border-[#e3eadc] bg-[#f8faf5] p-3 text-[11px] leading-relaxed text-[#64775c]">
                      Immutable 1,000,000,000 fixed supply. 800,000,000 distributed on the bonding curve; 200,000,000 reserved for locked liquidity upon graduation.
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#6a7d60]"><Copy size={12} /> Onchain specifications</h3>
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

        {/* Right: sticky ticket */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="surface ls-reveal overflow-hidden" style={{ animationDelay: "140ms" }}>
            <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#183225]"><Wallet size={13} />{tradable ? `Trade $${l.symbol}` : "Lifecycle settlement"}</span>
              <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
            </div>
            <div className="p-5">
              {tradable ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#eef3e8] p-1">
                    <button type="button" onClick={() => { setSide("buy"); setAmount("0.5"); }} className={cn("h-9 rounded-md text-xs font-bold transition", side === "buy" ? "bg-[#1d472f] text-white shadow-xs" : "text-[#5c7055] hover:text-[#183225]")}>Buy {l.symbol}</button>
                    <button type="button" onClick={() => { setSide("sell"); setAmount("25"); }} className={cn("h-9 rounded-md text-xs font-bold transition", side === "sell" ? "bg-[#b54859] text-white shadow-xs" : "text-[#5c7055] hover:text-[#183225]")}>Sell {l.symbol}</button>
                  </div>
                  <div>
                    <Field
                      label={side === "buy" ? "Pay amount (HYPE)" : "Sell amount"}
                      right={side === "buy" ? <span className="tabular text-[11px] text-[#687b60]">Avail: {fmtNum(user?.hype ?? 0, 3)} HYPE</span> : <Segmented size="sm" value={sellUnit} onChange={(v) => setSellUnit(v)} options={[{ value: "percent", label: "%" }, { value: "tokens", label: "Tokens" }]} />}
                    >
                      <Input value={amount} onChange={setAmount} type="number" step="0.1" suffix={side === "buy" ? "HYPE" : sellUnit === "percent" ? "%" : l.symbol} />
                    </Field>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {(side === "buy" ? [0.25, 0.5, 1, 2] : [25, 50, 75, 100]).map((v) => (
                        <button key={v} type="button" onClick={() => { if (side === "sell") setSellUnit("percent"); setAmount(String(v)); }} className="h-7 rounded border border-[#dce5d3] bg-[#fafcf8] text-[11px] font-medium text-[#5c7054] transition hover:border-[#b3c8a6] hover:bg-[#eef4e7]">
                          {side === "buy" ? `${v} HYPE` : `${v}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-[#53684d]">Max slippage</span><span className="tabular font-mono text-[11px] font-semibold text-[#1d472f]">{(slip / 100).toFixed(2)}%</span></div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[50, 100, 250, 500].map((bps) => (
                        <button key={bps} type="button" onClick={() => setSlip(bps)} className={cn("h-7 rounded border text-[11px] font-semibold transition", slip === bps ? "border-[#1d472f] bg-[#eef4e7] text-[#1d472f]" : "border-[#dce5d3] bg-white text-[#62755b] hover:border-[#b5c9ab]")}>{(bps / 100).toFixed(1)}%</button>
                      ))}
                    </div>
                  </div>
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
                    <Btn full size="lg" loading={busy} onClick={submit} variant={side === "buy" ? "primary" : "danger"}>{side === "buy" ? `Buy ${l.symbol}` : `Sell ${l.symbol}`}</Btn>
                  ) : (
                    <Btn full size="lg" onClick={() => setAuthModal("login")}>Sign in to trade</Btn>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#dfe8d6] bg-[#f8faf5] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7e63]">Next milestone</div>
                    <div className="font-serif-display mt-1 text-xl font-bold text-[#183225]">{l.nextAction?.label ?? "Graduation complete"}</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5c7055]">{l.nextAction?.hint ?? "The bonding curve is complete. Liquidity is locked and secondary markets are active."}</p>
                  </div>
                  {l.nextAction ? (
                    <Btn full size="lg" loading={busy} onClick={() => advance(l.nextAction!.action)} variant={l.nextAction.action === "confirm" ? "gold" : "primary"}>
                      {l.nextAction.label}{l.nextAction.costHype ? ` · ${fmtNum(l.nextAction.costHype, 2)} HYPE` : ""}
                    </Btn>
                  ) : null}
                  {l.stage === "graduating" ? <Btn full variant="danger" loading={busy} onClick={() => advance("abort")}>Abort and reopen curve</Btn> : null}
                  {(l.stage === "graduated" || l.stage === "perp_listed") ? <Btn full variant="primary" href={`/terminal?mode=swap&to=${l.symbol}`}><ArrowLeftRight size={14} /> Swap {l.symbol} on Spot Pool</Btn> : null}
                  {l.perpMarketId ? <Btn full variant="outline" href={`/terminal?m=${l.perpMarketId}`}><Activity size={14} /> Open {l.symbol}-PERP terminal</Btn> : null}
                  <div className="grid grid-cols-2 gap-3 border-t border-[#e3eadc] pt-4 text-xs">
                    <div className="rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3"><div className="inline-flex items-center gap-1 text-[11px] text-[#6d8065]"><Lock size={10} /> Locked HYPE</div><div className="tabular mt-1 font-bold text-[#183225]">{fmtNum(l.poolLiquidityHype, 3)}</div></div>
                    <div className="rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3"><div className="inline-flex items-center gap-1 text-[11px] text-[#6d8065]"><Layers size={10} /> Pool reserve</div><div className="tabular mt-1 font-bold text-[#183225]">{fmtCompact(l.poolTokens, 0)}</div></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[#e3eadc] bg-[#fafcf8] px-5 py-3 text-xs">
              <span className="text-[#697c60]">Your balance</span>
              <span className="tabular font-semibold text-[#183225]">{fmtCompact(l.myBalance, 2)} {l.symbol} <span className="font-normal text-[#6b7e63]">({fmtUsd(l.myBalance * l.priceHype * hypeUsd)})</span></span>
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
        <p className="text-sm leading-relaxed text-[#5f7358]">
          A cashtag displays live price, chart, and a Trade button on X. The listing fee is <span className="font-semibold text-[#183225]">0.75 HYPE</span> equivalent via X Money.
        </p>
        <Field label="Payment handle"><Input value={handle} onChange={setHandle} placeholder="@handle" /></Field>
        {!intent ? (
          <Btn full loading={busy} onClick={async () => {
            setBusy(true);
            try {
              const res = await api<{ reference: string; code?: string; amountUsd: number; deeplink: string; memo: string }>(`/api/launches/${slug}/action`, { json: { action: "cashtagCheckout", handle, hype: 0.75 } });
              setIntent(res);
            } catch (e) { push({ kind: "error", title: "Checkout failed", body: (e as Error).message }); }
            finally { setBusy(false); }
          }}>Request payment</Btn>
        ) : (
          <div className="space-y-4 rounded-xl border border-[#dfe8d6] bg-[#f8faf5] p-4">
            <div className="text-sm text-[#334d36]">Send <span className="font-semibold text-[#183225]">{fmtUsd(intent.amountUsd)}</span> to <span className="font-semibold text-[#183225]">@{handle || "handle"}</span> with memo <span className="font-mono text-xs text-gold">{intent.memo}</span></div>
            <a href={intent.deeplink} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-[#1a7248] hover:underline">Open X ↗</a>
            <Field label="Confirmation code" hint={intent.code ? `Sandbox code: ${intent.code}` : "Confirmed automatically by the live rail."}><Input value={code} onChange={setCode} placeholder="6 digits" maxLength={6} /></Field>
            <Btn full loading={busy} onClick={async () => {
              setBusy(true);
              try { await api(`/api/x`, { json: { action: "confirm", reference: intent.reference, code } }); await onDone(); onClose(); }
              catch (e) { push({ kind: "error", title: "Could not confirm", body: (e as Error).message }); }
              finally { setBusy(false); }
            }}>Confirm and list</Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}
