"use client";

import Link from "next/link";
import { useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Badge, Btn, Copyable, EmptyState, Field, Input, Segmented, Skeleton, TokenGlyph, stageText, stageTone } from "@/components/ui";
import { ELYSIUM, cn, fmtCompact, fmtHype, fmtNum, fmtUsd, shortAddr, timeAgo } from "@/lib/util";
import type { LaunchSummary, PerpPosition } from "@/lib/dto";

type Dash = {
  tier: string;
  prices: { hypeUsd: number; stokeUsd: number; headBlock: number };
  launches: LaunchSummary[];
  bags: Array<{ launchId: string; symbol: string; name: string; slug: string; amount: number; stage: string; accent: string; glyph: string }>;
  positions: PerpPosition[];
  restingOrders: Array<{ id: string; symbol: string; side: string; kind: string; size: number; limitPrice: number | null; leverage: number; status: string }>;
  points: Array<{ id: string; delta: number; reason: string; createdAt: string }>;
  payments: Array<{ id: string; provider: string; purpose: string; status: string; amountUsd: number; amountHype: number; reference: string; live: boolean; createdAt: string }>;
  notifications: Array<{ id: string; kind: string; title: string; body: string; href: string | null; read: boolean; createdAt: string }>;
  curveVolume: number;
  curveTrades: number;
  stoke: { totalStaked: number; apy: number; myPositions?: Array<{ principal: number; rewards: number }> };
};

type Tab = "holdings" | "positions" | "payments" | "activity";

export default function DashboardPage() {
  const { user, ready, setAuthModal, refresh, push } = useForge();
  const { data, loading, reload } = useLive<Dash>(user ? "/api/account" : null, 6000);
  const [tab, setTab] = useState<Tab>("holdings");
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const pnl = data?.positions.reduce((a, p) => a + p.unrealized, 0) ?? 0;
  const hypeUsd = data?.prices.hypeUsd ?? 28.4;

  const convert = async (from: "hype" | "usdc") => {
    setBusy(true);
    try {
      await api("/api/auth/convert", { json: { from, amount: (Number(amount) || 0) * (from === "usdc" ? hypeUsd : 1) } });
      push({ kind: "success", title: `Converted to ${from === "usdc" ? "HYPE" : "USDC"}` });
      await refresh();
      await reload();
    } catch (e) { push({ kind: "error", title: "Conversion declined", body: (e as Error).message }); }
    finally { setBusy(false); }
  };

  if (!ready) return <div className="forge-page"><Skeleton className="h-24 w-64" /><Skeleton className="mt-8 h-64 w-full" /></div>;
  if (!user) return <div className="forge-page"><div className="app-title-row"><div><div className="eyebrow">Portfolio</div><h1>Your activity, all in one place.</h1><p>Sign in to manage token holdings, positions, launch receipts, balances and rewards.</p></div></div><EmptyState title="Your portfolio is waiting" body="Use your account to see balances, track positions and manage every part of your Elysium activity." action={<div className="mt-3 flex gap-3"><Btn onClick={() => setAuthModal("login")}>Sign in</Btn><Btn variant="outline" href="/launch">Explore launches</Btn></div>} /></div>;

  return (
    <div className="forge-page">
      <div className="app-title-row"><div><div className="eyebrow">Your portfolio</div><h1>{user.name}</h1><div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#637454]"><Copyable text={user.wallet} label={shortAddr(user.wallet, 8)} /><span>·</span><span>Elysium {ELYSIUM.chainId}</span><span>·</span><Badge tone="gold">{data?.tier ?? "Connected"}</Badge></div></div><Btn href="/create" size="lg">Launch a token</Btn></div>
      <div className="metrics-strip"><div><div className="data-label">HYPE balance</div><div className="tabular mt-2 text-2xl font-semibold text-[#4f7b36]">{fmtNum(user.hype, 3)}</div><div className="mt-1 text-[11px] text-[#647458]">{fmtUsd(user.hype * hypeUsd)} estimated</div></div><div><div className="data-label">USDC balance</div><div className="tabular mt-2 text-2xl font-semibold text-[#4f7b36]">{fmtNum(user.usdc, 2)}</div><div className="mt-1 text-[11px] text-[#647458]">Available for perp margin</div></div><div><div className="data-label">Perpetual PnL</div><div className={cn("tabular mt-2 text-2xl font-semibold", pnl >= 0 ? "text-up" : "text-down")}>{fmtUsd(pnl)}</div><div className="mt-1 text-[11px] text-[#647458]">{data?.positions.length ?? 0} open positions</div></div><div><div className="data-label">Points</div><div className="tabular mt-2 text-2xl font-semibold text-[#4f7b36]">{fmtNum(user.points, 0)}</div><div className="mt-1 text-[11px] text-[#647458]">{data?.tier ?? "—"}</div></div></div>

      <div className="workspace mt-9">
        <div className="min-w-0">
          <div className="mb-6"><Segmented underline value={tab} onChange={(v) => setTab(v)} options={[{ value: "holdings", label: "Tokens" }, { value: "positions", label: `Positions (${data?.positions.length ?? 0})` }, { value: "payments", label: "Payments" }, { value: "activity", label: "Activity" }]} /></div>
          {loading && !data ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div> : tab === "holdings" ? <div className="space-y-9">
            <section><div className="mb-5 flex justify-between gap-4"><h2 className="text-sm font-semibold text-[#567c3e]">Token holdings</h2><span className="text-[11px] text-[#657858]">{data?.bags.length ?? 0} tokens</span></div>{!data?.bags.length ? <EmptyState title="No tokens yet" body="Buy from a bonding curve to start building your portfolio." action={<Btn variant="outline" href="/launch">Explore tokens</Btn>} /> : <div className="data-panel"><div className="divide-y divide-[#e3ecd8]">{data.bags.map((b) => <Link href={`/token/${b.slug}`} key={b.launchId} className="row-hover flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><TokenGlyph glyph={b.glyph} accent={b.accent} size={36} /><div className="min-w-0"><div className="truncate text-sm font-medium text-[#517935]">${b.symbol}</div><div className="mt-0.5 text-xs text-[#607651]">{stageText[b.stage] ?? b.stage}</div></div></div><div className="tabular text-right"><div className="text-sm text-[#547c39]">{fmtCompact(b.amount, 2)}</div><div className="text-[11px] text-[#647458]">tokens</div></div></Link>)}</div></div>}</section>
            <section><h2 className="mb-5 text-sm font-semibold text-[#567c3e]">Your launches</h2>{!data?.launches.length ? <div className="form-note">You have not created a token yet. <Link href="/create" className="small-link ml-1">Start a launch ↗</Link></div> : <div className="space-y-3">{data.launches.map((l) => <Link key={l.id} href={`/token/${l.slug}`} className="row-hover flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#e2ecd7] bg-white p-5"><div className="flex min-w-0 items-center gap-3"><TokenGlyph glyph={l.glyph} accent={l.accent} size={40} /><div><div className="text-sm font-medium text-[#527a39]">{l.name}</div><div className="text-xs text-[#647557]">${l.symbol}</div></div></div><Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge><div className="tabular text-right"><div className="text-sm text-[#517c38]">{fmtHype(l.raisedHype)}</div><div className="mt-0.5 text-[11px] text-[#647756]">{l.progressPct.toFixed(1)}% curve filled</div></div></Link>)}</div>}</section>
          </div> : tab === "positions" ? <div>{!data?.positions.length ? <EmptyState title="No open positions" body="Isolated margin, transparent funding and a clear liquidation price." action={<Btn variant="outline" href="/terminal">Open terminal</Btn>} /> : <div className="data-panel overflow-x-auto"><table className="position-table w-full min-w-[600px] text-left"><thead><tr><th>Market</th><th>Margin</th><th>Entry</th><th>Liq.</th><th className="text-right">PnL</th><th /></tr></thead><tbody>{data.positions.map((p) => <tr key={p.id} className="border-t border-[#e3edda]"><td><span className="font-medium">{p.marketSymbol}</span><div className={cn("mt-1 text-[11px]", p.side === "long" ? "text-up" : "text-down")}>{p.side} · {p.leverage}x</div></td><td>{fmtUsd(p.margin)}</td><td>{p.entryPrice.toPrecision(4)}</td><td>{p.liqPrice.toPrecision(4)}</td><td className={cn("text-right", p.unrealized >= 0 ? "text-up" : "text-down")}>{fmtUsd(p.unrealized)}<div className="text-[10px]">{p.roe.toFixed(2)}%</div></td><td className="text-right"><Btn size="sm" variant="outline" href="/terminal">Manage</Btn></td></tr>)}</tbody></table></div>}{data?.restingOrders?.length ? <div className="mt-6"><h3 className="mb-4 text-xs font-medium text-[#617851]">Resting orders</h3>{data.restingOrders.map((o) => <div key={o.id} className="summary-row"><span>{o.symbol} · {o.kind} {o.side}</span><strong>{fmtCompact(o.size, 1)} @ {o.limitPrice?.toPrecision(4)} · {o.leverage}x</strong></div>)}</div> : null}</div> : tab === "payments" ? <div>{!data?.payments.length ? <EmptyState title="No payment history" body="Launch fees, X Money top-ups and cashtag listing receipts appear here." /> : <div className="data-panel table-scroll"><table className="position-table w-full min-w-[580px] text-left"><thead><tr><th>Payment</th><th>Reference</th><th className="text-right">Amount</th><th>Status</th><th className="text-right">Date</th></tr></thead><tbody>{data.payments.map((p) => <tr key={p.id}><td>{p.purpose.replaceAll("_", " ")}</td><td><Copyable text={p.reference} label={p.reference} /></td><td className="text-right">{fmtUsd(p.amountUsd)}</td><td><Badge tone={p.status === "succeeded" ? "up" : "gold"}>{p.status}</Badge></td><td className="text-right text-[11px]">{timeAgo(p.createdAt)}</td></tr>)}</tbody></table></div>}</div> : <div className="grid gap-8 md:grid-cols-2"><section><h3 className="mb-4 text-sm font-medium text-[#55793e]">Recent activity</h3>{data?.notifications.length ? data.notifications.slice(0, 8).map((n) => <div key={n.id} className="border-t border-[#e3ecd8] py-4"><div className="flex items-baseline justify-between gap-3"><h4 className="text-xs font-medium text-[#587a3f]">{n.title}</h4><span className="text-[10px] text-[#647455]">{timeAgo(n.createdAt)}</span></div><p className="mt-2 text-xs leading-relaxed text-[#617451]">{n.body}</p></div>) : <p className="text-xs text-[#647556]">No activity yet.</p>}</section><section><h3 className="mb-4 text-sm font-medium text-[#55793e]">Points ledger</h3>{data?.points.length ? data.points.slice(0, 8).map((p) => <div key={p.id} className="flex justify-between gap-3 border-t border-[#e3ecd8] py-4 text-xs"><span className="capitalize text-[#627453]">{p.reason.replaceAll("_", " ")}</span><span className="tabular text-up">+{fmtNum(p.delta, 0)}</span></div>) : <p className="text-xs text-[#647556]">Start trading to earn points.</p>}</section></div>}
        </div>

        <aside className="trade-ticket space-y-6"><div className="side-ticket"><h3 className="mb-4 text-sm font-medium text-[#597744]">Balances</h3><div className="summary-row"><span>HYPE</span><strong>{fmtNum(user.hype, 4)}</strong></div><div className="summary-row"><span>USDC</span><strong>{fmtNum(user.usdc, 2)}</strong></div><div className="summary-row"><span>STOKE</span><strong>{fmtNum(user.stoke, 2)}</strong></div><div className="mt-6 border-t border-[#e3ecd7] pt-6"><Field label="Convert HYPE ↔ USDC" hint="Uses the current Elysium HYPE / USD mark."><Input value={amount} onChange={setAmount} type="number" suffix="HYPE" /></Field><div className="mt-3 grid grid-cols-2 gap-2"><Btn size="sm" loading={busy} onClick={() => convert("hype")}>To USDC</Btn><Btn size="sm" variant="outline" loading={busy} onClick={() => convert("usdc")}>To HYPE</Btn></div></div></div><div className="side-ticket"><div className="flex justify-between"><span className="text-sm font-medium text-[#5b7a42]">STOKE staking</span><Badge tone="gold">Platform token</Badge></div><div className="mt-4 summary-row"><span>Network APY</span><strong>{(data?.stoke.apy ?? 0).toFixed(1)}%</strong></div><div className="summary-row"><span>Total staked</span><strong>{fmtCompact(data?.stoke.totalStaked ?? 0, 1)}</strong></div><Btn className="mt-4" full variant="outline" href="/stoke">Manage staking</Btn></div><p className="ticket-notice">Testnet account · chain {ELYSIUM.chainId}</p></aside>
      </div>
    </div>
  );
}
