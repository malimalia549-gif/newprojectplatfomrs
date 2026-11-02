"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, useForge, useLive } from "@/components/providers";
import { Badge, Btn, Delta, EmptyState, Field, Input, Live, Modal, Panel, Segmented, Skeleton, Sparkline, stageText } from "@/components/ui";
import { MarketChart } from "@/components/market-chart";
import { ELYSIUM, cn, fmtCompact, fmtNum, fmtUsd, timeAgo } from "@/lib/util";
import type { BookSnapshot, PerpMarket, PerpPosition } from "@/lib/dto";

type PanelData = {
  market: PerpMarket | null;
  book: BookSnapshot;
  tape: Array<{ id: string; side: "buy" | "sell"; price: number; size: number; at: number }>;
  launch: { slug: string; symbol: string; stage: string; cashtag: string | null; holders: number } | null;
  fills: Array<{ id: string; action: string; side: string; size: number; price: number; pnlUsd: number; traderName: string | null; txHash: string; blockNumber: number; createdAt: string; mine: boolean }>;
  markets: PerpMarket[];
  positions?: PerpPosition[];
  restingOrders?: Array<{ id: string; symbol: string; side: string; kind: string; size: number; limitPrice: number | null; leverage: number; status: string }>;
};

const px = (v: number) => (v < 1 ? `$${v.toPrecision(5)}` : `$${fmtNum(v, 4)}`);

export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="pt-24 text-center text-sm text-slate-500">Loading terminal</div>}>
      <Terminal />
    </Suspense>
  );
}

function Terminal() {
  const sp = useSearchParams();
  const { user, push, refresh, setAuthModal } = useForge();
  const [marketId, setMarketId] = useState<string | null>(sp.get("m"));
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(10);
  const [sizeMode, setSizeMode] = useState<"usdc" | "tokens">("usdc");
  const [amount, setAmount] = useState("500");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  const markets = useLive<{ markets: PerpMarket[] }>("/api/perp", 4000);
  const activeId = marketId ?? markets.data?.markets?.[0]?.id ?? null;
  const panel = useLive<PanelData>(activeId ? `/api/perp/${activeId}` : null, 2600);

  const m = panel.data?.market ?? markets.data?.markets?.find((x) => x.id === activeId) ?? null;
  const positions = panel.data?.positions ?? [];
  const orders = panel.data?.restingOrders ?? [];
  const list = markets.data?.markets ?? [];

  const est = useMemo(() => {
    const price = m?.markPrice ?? 0;
    const notional = sizeMode === "usdc" ? Number(amount) || 0 : (Number(amount) || 0) * price;
    const size = price ? notional / price : 0;
    const margin = notional / Math.max(1, leverage);
    const fee = notional * ((m?.takerFeeBps ?? 4.5) / 10_000);
    const liq = side === "long" ? price * (1 - 1 / leverage + 0.005) : price * (1 + 1 / leverage - 0.005);
    return { notional, size, margin, fee, liq, fundingPerHour: (m?.fundingHour ?? 0) * notional };
  }, [amount, sizeMode, leverage, m, side]);

  const placeOrder = async () => {
    if (!user) return setAuthModal("login");
    if (!m) return;
    setBusy(true);
    try {
      await api(`/api/perp`, {
        json: {
          action: orderType === "market" ? "open" : "limit",
          marketId: m.id,
          side: orderType === "market" ? side : side === "long" ? "buy" : "sell",
          size: orderType === "limit" ? est.size : sizeMode === "tokens" ? Number(amount) || 0 : 0,
          notionalUsd: orderType === "market" && sizeMode === "usdc" ? Number(amount) || 0 : 0,
          leverage,
          limitPrice: orderType === "limit" ? Number(limitPrice) || 0 : 0,
          tpPct: tp ? Number(tp) : 0,
          slPct: sl ? Number(sl) : 0,
        },
      });
      push({
        kind: "success",
        title: orderType === "market" ? `${side === "long" ? "Long" : "Short"} ${m.symbol} opened` : `${m.symbol} limit order placed`,
        body: `${fmtUsd(est.notional)} notional · ${leverage}x · liquidation ${est.liq.toPrecision(4)}`,
      });
      await panel.reload();
      await refresh();
    } catch (e) {
      push({ kind: "error", title: "Order rejected", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      push({ kind: "success", title: label });
      await panel.reload();
      await refresh();
    } catch (e) {
      push({ kind: "error", title: `${label} failed`, body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const maxNotional = Math.max(0, (user?.usdc ?? 0) * leverage);

  return (
    <div className="pt-14 sm:pt-20">
      <div className="app-title-row mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3 text-xs font-medium text-slate-500">Perpetuals · HIP-3</div>
          <h1 className="font-serif-display text-[40px] leading-[1.05] text-white sm:text-5xl">Terminal</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Isolated margin in USDC, up to {m?.maxLeverage ?? 20}x. Funding settles hourly and liquidations are checked on every mark update.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Btn variant="ghost" size="sm" onClick={() => setHelp(true)}>
            How margin works
          </Btn>
          <Btn variant="outline" size="sm" href="/launch">
            Launchpad
          </Btn>
        </div>
      </div>

      <div className="workspace-terminal grid gap-6 xl:grid-cols-[180px_minmax(0,1fr)_320px]">
        {/* ------------------------------------------------ markets */}
        <Panel className="self-start overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-3 text-xs font-medium text-slate-500">Markets</div>
          <div className="max-h-[560px] divide-y divide-white/[0.05] overflow-y-auto">
            {!list.length ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="m-4 h-10" />) : null}
            {list.map((x) => (
              <button key={x.id} onClick={() => setMarketId(x.id)} className={cn("block w-full px-4 py-3.5 text-left transition", x.id === m?.id ? "bg-white/[0.05]" : "hover:bg-white/[0.025]")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{x.symbol}</span>
                  <Delta pct={x.change24h} className="text-xs" />
                </div>
                <div className="tabular mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{px(x.markPrice)}</span>
                  <span>{x.fundingAnnual >= 0 ? "+" : ""}{x.fundingAnnual.toFixed(1)}% APR</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* ------------------------------------------ chart + book */}
        <div className="min-w-0 space-y-6 workspace-chart">
          <Panel className="p-6">
            {!m ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-serif-display text-3xl text-white">{m.symbol}-PERP</span>
                      <Badge tone={m.status === "live" ? "up" : "gold"}>{m.status === "live" ? "Live" : m.status}</Badge>
                      {m.cashtag ? <Badge tone="gold">${m.cashtag}</Badge> : null}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Taker {(m.takerFeeBps / 100).toFixed(3)}% · Maker {(m.makerFeeBps / 100).toFixed(3)}% · Max {m.maxLeverage}x
                    </div>
                  </div>
                  <div className="text-right">
                    <Live value={m.markPrice} render={px} className="tabular text-3xl font-medium tracking-tight text-white" />
                    <div className="mt-1 flex justify-end gap-2 text-xs">
                      <Delta pct={m.change24h} />
                      <span className="text-slate-500">24h</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 chart-grid">
                  <MarketChart data={m.trail ?? []} symbol={m.symbol} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6 border-t border-white/[0.06] pt-6 sm:grid-cols-4">
                  <Mini label="Index" value={px(m.indexPrice)} />
                  <Mini label="Open interest" value={fmtUsd(m.openInterestUsd)} />
                  <Mini label="Funding / hour" value={`${(m.fundingHour * 100).toFixed(4)}%`} tone={m.fundingHour >= 0 ? "up" : "down"} />
                  <Mini label="24h volume" value={fmtUsd(m.volume24hUsd)} />
                </div>
                {panel.data?.launch ? (
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 text-sm ring-1 ring-inset ring-white/[0.06]">
                    <span className="text-slate-400">
                      Listed from launch <span className="text-white">${panel.data.launch.symbol}</span> · {stageText[panel.data.launch.stage] ?? panel.data.launch.stage} · {fmtNum(panel.data.launch.holders, 0)} holders
                    </span>
                    <Link href={`/token/${panel.data.launch.slug}`} className="font-medium text-ice-400 hover:underline">
                      View token
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Order book</span>
                <span className="text-xs text-slate-500">Spread {(panel.data?.book.spreadBps ?? 0).toFixed(1)} bps</span>
              </div>
              <BookTable book={panel.data?.book} mark={m?.markPrice ?? 0} />
            </Panel>
            <Panel className="p-6">
              <div className="mb-4 text-sm font-medium text-white">Recent trades</div>
              <div className="space-y-1">
                {(panel.data?.fills ?? []).slice(0, 12).map((f) => (
                  <div key={f.id} className={cn("tabular grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-xs", f.mine && "bg-white/[0.04]")}>
                    <span className={cn("font-medium", f.action === "liquidate" ? "text-down" : f.side === "long" ? "text-up" : "text-down")}>{f.action === "liquidate" ? "Liquidated" : f.side === "long" ? "Long" : "Short"}</span>
                    <span className="text-slate-300">
                      {fmtCompact(f.size, 1)} @ {px(f.price)}
                    </span>
                    <span className="text-slate-600">{timeAgo(f.createdAt)}</span>
                  </div>
                ))}
                {!panel.data?.fills.length
                  ? (panel.data?.tape ?? []).slice(0, 10).map((t) => (
                      <div key={t.id} className="tabular grid grid-cols-[72px_1fr_auto] items-center gap-3 px-2 py-1.5 text-xs">
                        <span className={t.side === "buy" ? "font-medium text-up" : "font-medium text-down"}>{t.side === "buy" ? "Buy" : "Sell"}</span>
                        <span className="text-slate-300">
                          {fmtCompact(t.size, 1)} @ {px(t.price)}
                        </span>
                        <span className="text-slate-600">{timeAgo(t.at)}</span>
                      </div>
                    ))
                  : null}
              </div>
            </Panel>
          </div>

          {/* --------------------------------------------- positions */}
          <Panel className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-medium text-white">Positions</span>
              {user ? <span className="tabular text-xs text-slate-500">Available {fmtUsd(user.usdc)} USDC</span> : null}
            </div>
            {!user ? (
              <EmptyState title="Sign in to trade" body="Your margin and open positions appear here." action={<Btn size="sm" onClick={() => setAuthModal("login")}>Sign in</Btn>} />
            ) : !positions.length ? (
              <div className="py-10 text-center text-sm text-slate-500">No open positions on {m?.symbol ?? "this market"}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr className="border-b border-white/[0.06]">
                      <th className="pb-3 font-medium">Market</th>
                      <th className="pb-3 font-medium">Size</th>
                      <th className="pb-3 font-medium">Entry</th>
                      <th className="pb-3 font-medium">Mark</th>
                      <th className="pb-3 font-medium">Liq.</th>
                      <th className="pb-3 text-right font-medium">PnL</th>
                      <th className="pb-3 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {positions.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3.5">
                          <span className="text-white">{p.marketSymbol}</span>
                          <span className={cn("ml-2 text-xs", p.side === "long" ? "text-up" : "text-down")}>
                            {p.side === "long" ? "Long" : "Short"} {p.leverage}x
                          </span>
                        </td>
                        <td className="tabular py-3.5">{fmtCompact(p.size, 2)}</td>
                        <td className="tabular py-3.5 text-slate-300">{px(p.entryPrice)}</td>
                        <td className="tabular py-3.5 text-slate-300">{px(p.markPrice)}</td>
                        <td className="tabular py-3.5 text-down/90">{px(p.liqPrice)}</td>
                        <td className="tabular py-3.5 text-right">
                          <div className={cn("font-medium", p.unrealized >= 0 ? "text-up" : "text-down")}>{fmtUsd(p.unrealized)}</div>
                          <div className="text-xs text-slate-500">{p.roe.toFixed(2)}%</div>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <Btn size="sm" variant="outline" loading={busy} onClick={() => act(`Reduced ${p.marketSymbol} by half`, () => api("/api/perp", { json: { action: "close", positionId: p.id, fraction: 0.5 } }))}>
                              Half
                            </Btn>
                            <Btn size="sm" variant="danger" loading={busy} onClick={() => act(`Closed ${p.marketSymbol}`, () => api("/api/perp", { json: { action: "close", positionId: p.id, fraction: 1 } }))}>
                              Close
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {orders.length ? (
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <div className="mb-3 text-xs font-medium text-slate-500">Open orders</div>
                <div className="divide-y divide-white/[0.05]">
                  {orders.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <span className="text-slate-300">
                        {o.kind} · {o.side === "buy" ? "Buy" : "Sell"} {fmtCompact(o.size, 1)} {o.symbol} @ {o.limitPrice ? px(o.limitPrice) : "—"} · {o.leverage}x
                      </span>
                      <Btn size="sm" variant="ghost" loading={busy} onClick={() => act("Order cancelled", () => api("/api/perp", { json: { action: "cancel", orderId: o.id } }))}>
                        Cancel
                      </Btn>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </div>

        {/* ------------------------------------------------- ticket */}
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel className="p-6">
            <div className="space-y-6">
              <Segmented
                underline
                value={orderType}
                onChange={(v) => setOrderType(v)}
                options={[
                  { value: "market", label: "Market" },
                  { value: "limit", label: "Limit" },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSide("long")} className={cn("h-11 rounded-xl text-sm font-medium ring-1 ring-inset transition", side === "long" ? "bg-up/15 text-up ring-up/30" : "text-slate-400 ring-white/[0.08] hover:text-white")}>
                  Long
                </button>
                <button onClick={() => setSide("short")} className={cn("h-11 rounded-xl text-sm font-medium ring-1 ring-inset transition", side === "short" ? "bg-down/15 text-down ring-down/30" : "text-slate-400 ring-white/[0.08] hover:text-white")}>
                  Short
                </button>
              </div>

              <Field label={`Leverage · ${leverage}x`}>
                <input type="range" min={1} max={m?.maxLeverage ?? 20} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="w-full" />
              </Field>

              <Field label="Size" right={<Segmented size="sm" value={sizeMode} onChange={(v) => setSizeMode(v)} options={[{ value: "usdc", label: "USDC" }, { value: "tokens", label: "Tokens" }]} />}>
                <Input value={amount} onChange={setAmount} type="number" step={sizeMode === "usdc" ? "10" : "1000"} suffix={sizeMode === "usdc" ? "USDC" : m?.symbol} />
              </Field>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((p) => (
                  <button key={p} onClick={() => setAmount(String(Math.round(((maxNotional * p) / 100 / (leverage || 1)) * 100) / 100))} className="h-8 rounded-lg text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.05] hover:text-white">
                    {p}%
                  </button>
                ))}
              </div>

              {orderType === "limit" ? (
                <Field label="Limit price" hint="Fills as maker when the mark reaches this price.">
                  <Input value={limitPrice} onChange={setLimitPrice} type="number" step="0.000001" placeholder={(m?.markPrice ?? 1).toPrecision(4)} />
                </Field>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Take profit">
                  <Input value={tp} onChange={setTp} type="number" placeholder="25" suffix="%" />
                </Field>
                <Field label="Stop loss">
                  <Input value={sl} onChange={setSl} type="number" placeholder="10" suffix="%" />
                </Field>
              </div>

              <div className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.02] px-4 ring-1 ring-inset ring-white/[0.05]">
                <Row k="Notional" v={fmtUsd(est.notional)} />
                <Row k="Position size" v={`${fmtCompact(est.size, 2)} ${m?.symbol ?? ""}`} />
                <Row k="Margin" v={fmtUsd(est.margin)} strong />
                <Row k="Fee" v={fmtUsd(est.fee)} />
                <Row k="Liquidation price" v={est.liq ? px(est.liq) : "—"} />
                <Row k="Funding / hour" v={fmtUsd(est.fundingPerHour)} />
              </div>

              {user ? (
                <Btn full size="lg" loading={busy} variant={side === "long" ? "primary" : "danger"} onClick={placeOrder} disabled={!m || (m.status !== "live" && orderType === "market")}>
                  {m?.status !== "live" && orderType === "market" ? "Market closed for pre-listing" : `${side === "long" ? "Long" : "Short"} ${m?.symbol ?? ""}`}
                </Btn>
              ) : (
                <Btn full size="lg" onClick={() => setAuthModal("login")}>
                  Sign in to trade
                </Btn>
              )}
              {user ? (
                <div className="tabular text-center text-xs text-slate-500">
                  {fmtUsd(user.usdc)} USDC available ·{" "}
                  <Link href="/docs#payments" className="text-ice-400 hover:underline">
                    Add funds
                  </Link>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="mb-4 text-sm font-medium text-white">Venue</div>
            <dl className="divide-y divide-white/[0.06] text-sm">
              <Row k="Venue" v={m?.venue ?? "forge-hip3"} />
              <Row k="Margin mode" v="Isolated" />
              <Row k="Settlement" v="HyperCore" />
              <Row k="Network" v={`${ELYSIUM.name} · ${ELYSIUM.chainId}`} />
            </dl>
          </Panel>
        </div>
      </div>

      <Modal open={help} onClose={() => setHelp(false)} title="Margin and liquidation" wide>
        <div className="space-y-5 text-[15px] leading-relaxed text-slate-400">
          <p>
            <span className="text-white">Isolated margin.</span> Opening a position locks notional divided by leverage in USDC. That amount is the most you can lose on the position.
          </p>
          <p>
            <span className="text-white">Liquidation.</span> Maintenance margin is 0.5% of notional. Longs liquidate at entry × (1 − 1/L + 0.005). Shorts liquidate at entry × (1 + 1/L − 0.005).
          </p>
          <p>
            <span className="text-white">Funding.</span> Charged every hour and proportional to book imbalance. It is deducted from your margin as it accrues.
          </p>
          <p>
            <span className="text-white">Orders.</span> Limit and stop orders rest on the book and fill as maker once the mark crosses your trigger. Take-profit and stop-loss are monitored on every tick.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn("tabular mt-1 text-[15px] font-medium text-white", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</div>
    </div>
  );
}

function BookTable({ book, mark }: { book?: BookSnapshot; mark: number }) {
  if (!book)
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
    );
  const max = Math.max(...book.asks.map((a) => a.total), ...book.bids.map((b) => b.total), 1);
  return (
    <div className="tabular font-mono text-xs">
      <div className="mb-2 grid grid-cols-3 text-[11px] text-slate-600">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>
      {[...book.asks].reverse().slice(0, 7).map((a, i) => (
        <div key={`a${i}`} className="relative grid grid-cols-3 py-[3px]">
          <span className="absolute inset-y-0 right-0 bg-down/[0.08]" style={{ width: `${(a.total / max) * 100}%` }} />
          <span className="relative text-down">{px(a.price)}</span>
          <span className="relative text-right text-slate-400">{fmtCompact(a.size, 1)}</span>
          <span className="relative text-right text-slate-600">{fmtCompact(a.total, 1)}</span>
        </div>
      ))}
      <div className="my-2 flex items-center justify-between border-y border-white/[0.06] py-2">
        <span className="text-sm font-medium text-white">{px(mark)}</span>
        <span className="text-[11px] text-slate-500">Mid</span>
      </div>
      {book.bids.slice(0, 7).map((b, i) => (
        <div key={`b${i}`} className="relative grid grid-cols-3 py-[3px]">
          <span className="absolute inset-y-0 right-0 bg-up/[0.08]" style={{ width: `${(b.total / max) * 100}%` }} />
          <span className="relative text-up">{px(b.price)}</span>
          <span className="relative text-right text-slate-400">{fmtCompact(b.size, 1)}</span>
          <span className="relative text-right text-slate-600">{fmtCompact(b.total, 1)}</span>
        </div>
      ))}
    </div>
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
