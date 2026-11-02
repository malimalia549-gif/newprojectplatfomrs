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
    } catch (e) {
      push({ kind: "error", title: "Conversion declined", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!ready)
    return (
      <div className="forge-page space-y-5">
        <Skeleton className="h-24 w-64" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );

  if (!user)
    return (
      <div className="forge-page space-y-6">
        <div className="app-title-row">
          <div>
            <div className="eyebrow">Portfolio</div>
            <h1>Your activity, all in one place.</h1>
            <p>Sign in to manage token holdings, perpetual positions, launch receipts, balances, and rewards.</p>
          </div>
        </div>
        <EmptyState
          title="Your portfolio is waiting"
          body="Use your account to see balances, track positions, and manage every part of your Elysium activity."
          action={
            <div className="mt-3 flex gap-3">
              <Btn onClick={() => setAuthModal("login")}>Sign in</Btn>
              <Btn variant="outline" href="/launch">
                Explore launches
              </Btn>
            </div>
          }
        />
      </div>
    );

  return (
    <div className="forge-page space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Your Portfolio</div>
          <h1 className="!text-3xl sm:!text-[36px]">{user.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-[#697c60]">
            <Copyable text={user.wallet} label={shortAddr(user.wallet, 8)} />
            <span>·</span>
            <span>Elysium {ELYSIUM.chainId}</span>
            <span>·</span>
            <Badge tone="gold">{data?.tier ?? "Connected"}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Btn variant="outline" size="md" href="/terminal">
            Trade & Swap
          </Btn>
          <Btn href="/create" size="md">
            Launch a token
          </Btn>
        </div>
      </div>

      {/* 4-Column Boxed KPI Strip */}
      <div className="surface grid grid-cols-2 divide-y divide-[#e3eadc] overflow-hidden sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">HYPE balance</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtNum(user.hype, 3)}</div>
          <div className="tabular mt-0.5 text-[11px] text-[#6d8065]">{fmtUsd(user.hype * hypeUsd)} estimated</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">USDC balance</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtNum(user.usdc, 2)}</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">Available for perp margin</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Perpetual PnL</div>
          <div className={cn("tabular mt-1.5 text-2xl font-bold", pnl >= 0 ? "text-up" : "text-down")}>{fmtUsd(pnl)}</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">{data?.positions.length ?? 0} open positions</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Platform points</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtNum(user.points, 0)}</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">{data?.tier ?? "—"}</div>
        </div>
      </div>

      {/* Aligned 2-Column Workspace */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* Left Main Tabbed Card */}
        <div className="surface min-w-0 overflow-hidden">
          <div className="border-b border-[#e3eadc] px-5 pt-3">
            <Segmented
              underline
              value={tab}
              onChange={(v) => setTab(v)}
              options={[
                { value: "holdings", label: `Tokens (${data?.bags.length ?? 0})` },
                { value: "positions", label: `Positions (${data?.positions.length ?? 0})` },
                { value: "payments", label: "Payments" },
                { value: "activity", label: "Activity" },
              ]}
            />
          </div>

          <div className="p-5">
            {loading && !data ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : tab === "holdings" ? (
              <div className="space-y-7">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#66795e]">Token Holdings</h2>
                    <span className="text-[11px] text-[#6d8065]">{data?.bags.length ?? 0} assets</span>
                  </div>
                  {!data?.bags.length ? (
                    <EmptyState
                      title="No tokens yet"
                      body="Buy from a bonding curve to start building your Elysium portfolio."
                      action={
                        <Btn variant="outline" href="/launch">
                          Explore tokens
                        </Btn>
                      }
                    />
                  ) : (
                    <div className="divide-y divide-[#e8efde] rounded-xl border border-[#e3eadc]">
                      {data.bags.map((b) => (
                        <Link href={`/token/${b.slug}`} key={b.launchId} className="row-hover flex items-center justify-between gap-4 px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <TokenGlyph glyph={b.glyph} accent={b.accent} size={36} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-[#183225]">
                                {b.name} <span className="font-mono text-xs font-normal text-[#687b60]">${b.symbol}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-[#697c60]">{stageText[b.stage] ?? b.stage}</div>
                            </div>
                          </div>
                          <div className="tabular text-right">
                            <div className="text-sm font-bold text-[#183225]">{fmtCompact(b.amount, 2)}</div>
                            <div className="text-[11px] text-[#6d8065]">tokens</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#66795e]">Launches Created</h2>
                    <Link href="/create" className="small-link">
                      New launch ↗
                    </Link>
                  </div>
                  {!data?.launches.length ? (
                    <div className="form-note">
                      You have not deployed a token yet.{" "}
                      <Link href="/create" className="small-link ml-1">
                        Start a launch ↗
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#e8efde] rounded-xl border border-[#e3eadc]">
                      {data.launches.map((l) => (
                        <Link key={l.id} href={`/token/${l.slug}`} className="row-hover flex flex-wrap items-center justify-between gap-4 px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <TokenGlyph glyph={l.glyph} accent={l.accent} size={36} />
                            <div>
                              <div className="text-sm font-bold text-[#183225]">{l.name}</div>
                              <div className="font-mono text-xs text-[#697c60]">${l.symbol}</div>
                            </div>
                          </div>
                          <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
                          <div className="tabular text-right">
                            <div className="text-sm font-bold text-[#183225]">{fmtHype(l.raisedHype)}</div>
                            <div className="mt-0.5 text-[11px] text-[#6d8065]">{l.progressPct.toFixed(1)}% curve filled</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : tab === "positions" ? (
              <div>
                {!data?.positions.length ? (
                  <EmptyState
                    title="No open positions"
                    body="Trade isolated-margin HIP-3 perpetuals with transparent hourly funding."
                    action={
                      <Btn variant="outline" href="/terminal?mode=perp">
                        Open perpetuals
                      </Btn>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[580px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                          <th className="pb-2.5">Market</th>
                          <th className="pb-2.5">Margin</th>
                          <th className="pb-2.5">Entry</th>
                          <th className="pb-2.5">Liquidation</th>
                          <th className="pb-2.5 text-right">Unrealized PnL</th>
                          <th className="pb-2.5 text-right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eaf0e3]">
                        {data.positions.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3">
                              <span className="font-bold text-[#183225]">{p.marketSymbol}-PERP</span>
                              <div className={cn("mt-0.5 text-[11px] font-semibold", p.side === "long" ? "text-up" : "text-down")}>
                                {p.side} · {p.leverage}x
                              </div>
                            </td>
                            <td className="tabular py-3">{fmtUsd(p.margin)}</td>
                            <td className="tabular py-3 font-mono">{p.entryPrice.toPrecision(4)}</td>
                            <td className="tabular py-3 font-mono text-down">{p.liqPrice.toPrecision(4)}</td>
                            <td className={cn("tabular py-3 text-right font-bold", p.unrealized >= 0 ? "text-up" : "text-down")}>
                              {fmtUsd(p.unrealized)}
                              <div className="text-[10px] font-normal text-[#6d8065]">{p.roe.toFixed(2)}%</div>
                            </td>
                            <td className="py-3 text-right">
                              <Btn size="sm" variant="outline" href="/terminal?mode=perp">
                                Manage
                              </Btn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : tab === "payments" ? (
              <div>
                {!data?.payments.length ? (
                  <EmptyState title="No payment history" body="Launch fees, X Money top-ups, and cashtag listing receipts appear here." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                          <th className="pb-2.5">Purpose</th>
                          <th className="pb-2.5">Reference</th>
                          <th className="pb-2.5 text-right">Amount</th>
                          <th className="pb-2.5">Status</th>
                          <th className="pb-2.5 text-right">Age</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eaf0e3]">
                        {data.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 font-medium capitalize text-[#183225]">{p.purpose.replaceAll("_", " ")}</td>
                            <td className="py-3">
                              <Copyable text={p.reference} label={p.reference} />
                            </td>
                            <td className="tabular py-3 text-right font-semibold">{fmtUsd(p.amountUsd)}</td>
                            <td className="py-3">
                              <Badge tone={p.status === "succeeded" ? "up" : "gold"}>{p.status}</Badge>
                            </td>
                            <td className="py-3 text-right text-[#6d8065]">{timeAgo(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#66795e]">Recent Notifications</h3>
                  {data?.notifications.length ? (
                    <div className="divide-y divide-[#e8efde]">
                      {data.notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className="py-3 first:pt-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <h4 className="text-xs font-bold text-[#183225]">{n.title}</h4>
                            <span className="text-[10px] text-[#6d8065]">{timeAgo(n.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[#5e7257]">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6d8065]">No activity yet.</p>
                  )}
                </section>
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#66795e]">Points Ledger</h3>
                  {data?.points.length ? (
                    <div className="divide-y divide-[#e8efde]">
                      {data.points.slice(0, 8).map((p) => (
                        <div key={p.id} className="flex justify-between gap-3 py-3 text-xs first:pt-0">
                          <span className="capitalize text-[#4f644a]">{p.reason.replaceAll("_", " ")}</span>
                          <span className="tabular font-bold text-up">+{fmtNum(p.delta, 0)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6d8065]">Start trading to earn points.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Balances & Staking Summary */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="surface overflow-hidden">
            <div className="border-b border-[#e3eadc] px-5 py-3.5">
              <h3 className="text-sm font-bold text-[#183225]">Balances & Converter</h3>
            </div>
            <div className="space-y-4 p-5">
              <div className="divide-y divide-[#e6eedf] rounded-lg border border-[#e3eadc] bg-[#fafcf8] px-3.5">
                <div className="summary-row !py-2.5">
                  <span>HYPE</span>
                  <strong>{fmtNum(user.hype, 4)}</strong>
                </div>
                <div className="summary-row !py-2.5">
                  <span>USDC</span>
                  <strong>{fmtNum(user.usdc, 2)}</strong>
                </div>
                <div className="summary-row !py-2.5">
                  <span>STOKE</span>
                  <strong>{fmtNum(user.stoke, 2)}</strong>
                </div>
              </div>

              <div className="border-t border-[#e3eadc] pt-4">
                <Field label="Convert HYPE ↔ USDC" hint="Instant conversion at the live Elysium HYPE/USD mark.">
                  <Input value={amount} onChange={setAmount} type="number" suffix="HYPE" />
                </Field>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Btn size="sm" loading={busy} onClick={() => convert("hype")}>
                    To USDC
                  </Btn>
                  <Btn size="sm" variant="outline" loading={busy} onClick={() => convert("usdc")}>
                    To HYPE
                  </Btn>
                </div>
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#183225]">STOKE Staking</span>
              <Badge tone="gold">Platform token</Badge>
            </div>
            <div className="mt-3 divide-y divide-[#e6eedf]">
              <div className="summary-row !py-2">
                <span>Network APY</span>
                <strong>{(data?.stoke.apy ?? 0).toFixed(1)}%</strong>
              </div>
              <div className="summary-row !py-2">
                <span>Total staked</span>
                <strong>{fmtCompact(data?.stoke.totalStaked ?? 0, 1)} STOKE</strong>
              </div>
            </div>
            <Btn className="mt-4" full variant="outline" href="/stoke">
              Manage staking
            </Btn>
          </div>
        </aside>
      </div>
    </div>
  );
}
