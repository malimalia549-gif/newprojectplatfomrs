"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Pipeline } from "@/components/pipeline";
import { Badge, Btn, Copyable, Delta, EmptyState, Field, Input, Live, Modal, Panel, Progress, Segmented, Skeleton, Sparkline, Stat, TokenGlyph, stageText, stageTone } from "@/components/ui";
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
  const [tab, setTab] = useState<"curve" | "holders" | "trades" | "lifecycle">("curve");
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
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [amount, side, slip, slug, sellTokens, detail?.stage, detail?.soldTokens]);

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
      push({ kind: "success", title: "Step completed", body: `${action} · ${shortAddr(res.tx, 6)}` });
      await reload();
    } catch (e) {
      push({ kind: "error", title: "Step failed", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="pt-20">
        <EmptyState title="Launch not found" body={error} action={<Btn href="/launch">Back to launchpad</Btn>} />
      </div>
    );

  if (loading && !detail)
    return (
      <div className="space-y-8 pt-14">
        <Skeleton className="h-20 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-[460px]" />
          <Skeleton className="h-[460px]" />
        </div>
      </div>
    );

  if (!detail) return null;
  const l = detail;
  const tradable = l.stage === "trading" || l.stage === "created";
  const pipeCurrent = l.stage === "graduating" ? "graduate" : l.stage === "perp_listed" ? "hip3" : l.stage === "graduated" ? "pool" : l.stage;

  return (
    <div className="pt-14 sm:pt-20">
      <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/launch" className="transition hover:text-white">Launchpad</Link>
        <span>/</span>
        <span className="text-slate-300">${l.symbol}</span>
      </nav>

      {/* header */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <TokenGlyph glyph={l.glyph} accent={l.accent} size={64} />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif-display text-4xl leading-none text-white sm:text-5xl">{l.name}</h1>
              <span className="font-mono text-sm text-slate-400">${l.symbol}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
              {l.cashtag ? <Badge tone="gold">${l.cashtag} on X</Badge> : null}
              {l.creatorName ? <span className="text-xs text-slate-500">Created by {l.creatorName}</span> : null}
              <span className="text-xs text-slate-600">· {timeAgo(l.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-8">
          <div className="text-right">
            <div className="text-xs text-slate-500">Price</div>
            <div className="tabular mt-1 text-3xl font-medium tracking-tight text-white">
              <Live value={l.priceHype} render={fmtPrice} /> <span className="text-sm font-normal text-slate-500">HYPE</span>
            </div>
            <div className="tabular mt-1 flex justify-end gap-2 text-xs text-slate-500">
              <span>{fmtUsd(l.priceHype * hypeUsd)}</span>
              <Delta pct={l.change24h} />
            </div>
          </div>
          <div className="hidden gap-2 md:flex">
            {l.perpMarketId ? <Btn variant="outline" size="sm" href={`/terminal?m=${l.perpMarketId}`}>Perp</Btn> : null}
            <Btn variant="ghost" size="sm" href="/launch">All</Btn>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Pipeline current={pipeCurrent} compact />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* ----------------------------------------------- left: market */}
        <div className="min-w-0 space-y-8">
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 border-b border-white/[0.07] pb-8 sm:grid-cols-4">
            <Stat label="Market cap" value={fmtHype(l.marketCapHype)} sub={fmtUsd(l.marketCapHype * hypeUsd)} />
            <Stat label="Raised" value={<Live value={l.raisedHype} render={(v) => fmtNum(v, 3)} />} sub={`of ${fmtNum(l.graduationHype, 0)} HYPE target`} />
            <Stat label="Volume" value={fmtHype(l.volumeHype)} sub={`${fmtNum(l.tradesCount, 0)} trades`} />
            <Stat label="Holders" value={fmtNum(l.holdersCount, 0)} sub={`Fee ${(l.feeBps / 100).toFixed(2)}%`} />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">Curve absorption</span>
              <span className="tabular text-white">{l.soldTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} / 800,000,000</span>
            </div>
            <Progress pct={l.progressPct} accent={l.accent} height={6} />
          </div>

          <Panel className="p-6">
            <div className="mb-6">
              <Segmented
                underline
                value={tab}
                onChange={(v) => setTab(v)}
                options={[
                  { value: "curve", label: "Price" },
                  { value: "holders", label: "Holders" },
                  { value: "trades", label: "Trades" },
                  { value: "lifecycle", label: "Lifecycle" },
                ]}
              />
            </div>

            <div className="min-h-[260px]">
              {tab === "curve" ? (
                <div className="space-y-6">
                  <Sparkline values={l.curve.map((c) => c.price)} accent={l.accent} height={200} />
                  <div className="grid gap-x-10 sm:grid-cols-2">
                    <LiveRow items={[{ label: "Virtual HYPE", value: fmtNum(l.raisedHype + (l.graduationHype * 273) / 800, 4) }, { label: "Virtual tokens", value: fmtCompact(1_073_000_000 - l.soldTokens, 1) }, { label: "Trading fee", value: `${(l.feeBps / 100).toFixed(2)}%` }]} />
                    <LiveRow items={[{ label: "Creator earned", value: `${fmtNum(l.creatorHype, 4)} HYPE` }, { label: "Treasury", value: `${fmtNum(l.treasuryHype, 4)} HYPE` }, { label: "Graduation target", value: `${fmtNum(l.graduationHype, 0)} HYPE` }]} />
                  </div>
                </div>
              ) : null}

              {tab === "holders" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr className="border-b border-white/[0.06]">
                        <th className="pb-3 font-medium">Rank</th>
                        <th className="pb-3 font-medium">Holder</th>
                        <th className="pb-3 text-right font-medium">Balance</th>
                        <th className="pb-3 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {l.holders.map((h) => (
                        <tr key={`${h.wallet}-${h.rank}`} className={cn(h.isPool && "text-slate-500")}>
                          <td className="tabular py-3">{h.rank}</td>
                          <td className="py-3">{h.isPool ? h.name : <span className="font-mono text-[13px]">{shortAddr(h.wallet, 6)}</span>}</td>
                          <td className="tabular py-3 text-right">{fmtCompact(h.amount, 2)}</td>
                          <td className="tabular py-3 text-right">{h.pct.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {tab === "trades" ? (
                <div className="max-h-[420px] divide-y divide-white/[0.05] overflow-y-auto">
                  {l.trades.map((t) => (
                    <div key={t.id} className={cn("tabular grid grid-cols-[60px_1fr_1fr_auto] items-center gap-4 py-3 text-sm", t.mine && "text-white")}>
                      <span className={t.side === "buy" ? "font-medium text-up" : "font-medium text-down"}>{t.side === "buy" ? "Buy" : "Sell"}</span>
                      <span className="text-slate-300">{fmtNum(t.hypeAmount, 4)} HYPE</span>
                      <span className="text-slate-500">{fmtCompact(t.tokenAmount, 1)} {l.symbol} @ {fmtPrice(t.priceAfter)}</span>
                      <span className="text-xs text-slate-600">{timeAgo(t.createdAt)}</span>
                    </div>
                  ))}
                  {!l.trades.length ? <div className="py-12 text-center text-sm text-slate-500">No trades yet. Be the first buyer.</div> : null}
                </div>
              ) : null}

              {tab === "lifecycle" ? (
                <ol className="space-y-6">
                  {l.events.map((e) => (
                    <li key={e.id} className="grid grid-cols-[12px_1fr] gap-4">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-ice-400" />
                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="text-sm font-medium text-white">{e.label}</span>
                          <span className="text-xs text-slate-500">{timeAgo(e.createdAt)}</span>
                        </div>
                        {e.detail ? <p className="mt-1 text-sm leading-relaxed text-slate-400">{e.detail}</p> : null}
                        {e.txHash ? <Copyable className="mt-1" text={e.txHash} label={shortAddr(e.txHash, 8)} /> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </Panel>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-sm font-medium text-white">About</h3>
              <p className="text-sm leading-relaxed text-slate-400">{l.description || "No description provided."}</p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium text-white">Contract</h3>
              <LiveRow
                items={[
                  { label: "Token", value: <Copyable text={l.tokenAddress ?? "0x"} label={shortAddr(l.tokenAddress, 5)} /> },
                  { label: "Pool", value: l.poolAddress ? shortAddr(l.poolAddress, 5) : "Not graduated" },
                  { label: "Supply", value: "1,000,000,000" },
                  { label: "Network", value: `${ELYSIUM.name} · ${ELYSIUM.chainId}` },
                ]}
              />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------- right: trade */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Panel className="p-6">
            {tradable ? (
              <div className="space-y-6">
                <Segmented
                  underline
                  value={side}
                  onChange={(v) => {
                    setSide(v);
                    setAmount(v === "buy" ? "0.5" : "25");
                  }}
                  options={[
                    { value: "buy", label: "Buy" },
                    { value: "sell", label: "Sell" },
                  ]}
                />

                <Field
                  label={side === "buy" ? "Amount in HYPE" : "Amount to sell"}
                  right={side === "buy" ? <span className="tabular text-xs text-slate-500">Balance {fmtNum(user?.hype ?? 0, 3)}</span> : <Segmented size="sm" value={sellUnit} onChange={(v) => setSellUnit(v)} options={[{ value: "percent", label: "%" }, { value: "tokens", label: "Tokens" }]} />}
                  hint={side === "sell" ? `Holding ${fmtCompact(l.myBalance, 2)} ${l.symbol}` : undefined}
                >
                  <Input value={amount} onChange={setAmount} type="number" step="0.1" suffix={side === "buy" ? "HYPE" : sellUnit === "percent" ? "%" : l.symbol} />
                </Field>

                <div className="grid grid-cols-4 gap-2">
                  {(side === "buy" ? [0.25, 0.5, 1, 2] : [10, 25, 50, 100]).map((v) => (
                    <button key={v} onClick={() => setAmount(String(v))} className="h-8 rounded-lg text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.05] hover:text-white">
                      {side === "buy" ? v : `${v}%`}
                    </button>
                  ))}
                </div>

                <Field label={`Slippage tolerance · ${(slip / 100).toFixed(2)}%`}>
                  <input type="range" min={5} max={500} step={5} value={slip} onChange={(e) => setSlip(Number(e.target.value))} className="w-full" />
                </Field>

                <div className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.02] px-4 ring-1 ring-inset ring-white/[0.05]">
                  {quote ? (
                    <>
                      <Row k="You receive" v={`${fmtCompact(quote.out, 3)} ${side === "buy" ? l.symbol : "HYPE"}`} strong />
                      <Row k="Fee" v={`${fmtNum(quote.fee, 5)} HYPE`} />
                      <Row k="New price" v={fmtPrice(quote.priceAfter)} />
                      <Row k="Price impact" v={`${quote.impactPct.toFixed(2)}%`} />
                    </>
                  ) : (
                    <div className="py-4 text-sm text-slate-500">Enter an amount to see a quote.</div>
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
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-slate-500">Next step</div>
                  <div className="font-serif-display mt-2 text-2xl text-white">{l.nextAction?.label ?? "Complete"}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {l.nextAction?.hint ?? "The curve has closed. Trading continues on the pool, the HyperCore book and the perpetual market."}
                  </p>
                </div>
                {l.nextAction ? (
                  <Btn full size="lg" loading={busy} onClick={() => advance(l.nextAction!.action)} variant={l.nextAction.action === "confirm" ? "gold" : "primary"}>
                    {l.nextAction.label}
                    {l.nextAction.costHype ? ` · ${fmtNum(l.nextAction.costHype, 2)} HYPE` : ""}
                  </Btn>
                ) : null}
                {l.stage === "graduating" ? (
                  <Btn full variant="danger" loading={busy} onClick={() => advance("abort")}>
                    Abort and reopen curve
                  </Btn>
                ) : null}
                {l.stage === "perp_listed" && !l.cashtag ? (
                  <Btn full variant="outline" onClick={() => setCashtagOpen(true)}>
                    List ${l.symbol} on X
                  </Btn>
                ) : null}
                <div className="grid grid-cols-2 gap-6 border-t border-white/[0.06] pt-6">
                  <Stat label="Pool liquidity" value={fmtNum(l.poolLiquidityHype, 3)} sub="HYPE, locked 4 years" />
                  <Stat label="Pool tokens" value={fmtCompact(l.poolTokens, 0)} sub="From the 200M book" />
                </div>
              </div>
            )}
          </Panel>

          <p className="mt-4 px-1 text-xs leading-relaxed text-slate-500">
            Your balance: {fmtCompact(l.myBalance, 2)} {l.symbol} ({fmtUsd(l.myBalance * l.priceHype * hypeUsd)}). Settlement uses a permissionless graduation and an abort window.
          </p>
        </aside>
      </div>

      <CashtagModal open={cashtagOpen} onClose={() => setCashtagOpen(false)} slug={slug} symbol={l.symbol} onDone={() => advance("listCashtag")} />
    </div>
  );
}

function LiveRow({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="divide-y divide-white/[0.06]">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-3 py-3 text-sm">
          <dt className="text-slate-500">{i.label}</dt>
          <dd className="tabular text-slate-100">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-3 text-sm", strong && "font-medium text-white")}>
      <span className="text-slate-500">{k}</span>
      <span className="tabular text-slate-100">{v}</span>
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
          A cashtag shows the price, chart and posts beside a Trade button. The listing fee is <span className="text-white">0.75 HYPE</span> equivalent, paid through X Money.
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
          <div className="space-y-4 rounded-xl bg-white/[0.02] p-4 ring-1 ring-inset ring-white/[0.06]">
            <div className="text-sm text-slate-300">
              Send <span className="text-white">{fmtUsd(intent.amountUsd)}</span> to <span className="text-white">@{handle || "handle"}</span> with memo <span className="font-mono text-xs text-gold">{intent.memo}</span>
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
