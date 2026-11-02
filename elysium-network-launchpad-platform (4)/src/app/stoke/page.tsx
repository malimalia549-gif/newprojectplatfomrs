"use client";

import { useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { MarketChart } from "@/components/market-chart";
import { Badge, Btn, Copyable, EmptyState, Field, Input, Modal, Progress, Segmented, Skeleton } from "@/components/ui";
import { STOKE } from "@/lib/tokenomics";
import { cn, fmtCompact, fmtNum, fmtUsd, shortAddr, timeAgo } from "@/lib/util";

type StokeState = {
  apy: number;
  totalStaked: number;
  rewardsPaid: number;
  stakers: number;
  circulating: number;
  myPositions: Array<{ id: string; principal: number; apy: number; rewards: number; createdAt: string; accrued: number }>;
  tiers: Array<{ tier: string; label: string; min: number; amount: number; perks: string; claimed: boolean; unlocked: boolean }>;
  myTier: string;
  vesting: Array<{ id: string; label: string; total: number; tgePct: number; months: number; vestedPct: number; vested: number; claimable: number; claimed: number; startedAt: string }>;
  ledger: Array<{ id: string; delta: number; reason: string; createdAt: string }>;
};

type Net = { prices: { stokeUsd: number; hypeUsd: number }; stats: { stokeBurned: number; feesHype: number } };

export default function StokePage() {
  const { user, push, refresh, setAuthModal } = useForge();
  const { data, loading, reload, mutate } = useLive<{
    state: StokeState;
    leaderboard: Array<{ rank: number; name: string; points: number; wallet: string; tier: string }>;
  }>(user ? `/api/stoke?scope=${user.id}` : null, 5000);

  const meta = useLive<{
    price: number;
    hypeUsd: number;
    state: StokeState;
    leaderboard: Array<{ rank: number; name: string; points: number; wallet: string; tier: string }>;
  }>("/api/stoke", 9000);

  const net = useLive<Net>("/api/network", 8000);
  const [tab, setTab] = useState<"stake" | "airdrop" | "vesting" | "tokenomics">("stake");
  const [amount, setAmount] = useState("100");
  const [lockDays, setLockDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [topup, setTopup] = useState(false);

  const st = data?.state ?? meta.data?.state;
  const price = meta.data?.price ?? net.data?.prices.stokeUsd ?? 0.0412;
  const hypeUsd = net.data?.prices.hypeUsd ?? 28.4;

  const run = async (label: string, fn: () => Promise<unknown>) => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      await fn();
      await refresh();
      await reload();
      push({ kind: "success", title: label });
    } catch (e) {
      push({ kind: "error", title: "Request declined", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const projectedApy = Math.min(46, (st?.apy ?? 14) + Math.min(14, lockDays * 0.35) + ((user?.points ?? 0) >= 3000 ? 4 : 0));
  const leaders = data?.leaderboard ?? meta.data?.leaderboard ?? [];

  return (
    <div className="forge-page space-y-6">
      {/* Structured Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="eyebrow">Platform Token · ${STOKE.symbol}</div>
          <h1 className="!text-3xl sm:!text-[38px]">Stake & Earn with STOKE</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#64775c]">
            STOKE is Forge&rsquo;s platform revenue-sharing and staking token (Elysium network gas remains HYPE). Ten percent of net protocol revenue buys back and burns STOKE while stakers earn dynamic yield and airdrop tiers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user ? (
            <div className="inline-flex h-10 items-center gap-2.5 rounded-lg border border-[#d9e4cf] bg-white px-3.5 text-xs">
              <span className="text-[#697c60]">Balance</span>
              <span className="tabular font-bold text-gold">{fmtNum(user.stoke, 2)} STOKE</span>
              <span className="text-[#c5d3ba]">|</span>
              <span className="tabular font-semibold text-[#1d472f]">{fmtNum(user.points, 0)} pts</span>
            </div>
          ) : null}
          {user ? (
            <Btn variant="outline" size="md" onClick={() => setTopup(true)}>
              Buy with X Money
            </Btn>
          ) : (
            <Btn size="md" onClick={() => setAuthModal("login")}>
              Sign in to stake
            </Btn>
          )}
          <Btn variant="outline" size="md" href="/terminal?mode=swap&to=STOKE">
            Swap STOKE ⇄
          </Btn>
          <Btn variant="primary" size="md" href="/terminal?m=hip3_stoke_seed">
            Trade STOKE-PERP ↗
          </Btn>
        </div>
      </div>

      {/* 4-Column Boxed KPI Strip */}
      <div className="surface grid grid-cols-2 divide-y divide-[#e3eadc] overflow-hidden sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">STOKE reference price</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-gold">{fmtUsd(price)}</div>
          <div className="tabular mt-0.5 text-[11px] text-[#6d8065]">{fmtNum(price / hypeUsd, 5)} HYPE</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Base staking APY</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-up">{(st?.apy ?? 18).toFixed(1)}%</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">Up to 46% with lock boost</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Total staked</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtCompact(st?.totalStaked ?? 0, 2)}</div>
          <div className="tabular mt-0.5 text-[11px] text-[#6d8065]">{fmtNum(st?.stakers ?? 0, 0)} active stakers</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Buyback & burned</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtCompact(net.data?.stats.stokeBurned ?? 0, 2)}</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">10% of treasury fee share</div>
        </div>
      </div>

      {/* Workspace Tabs Bar */}
      <div className="surface px-5 pt-3">
        <Segmented
          underline
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { value: "stake", label: "Stake & earn" },
            { value: "airdrop", label: "Airdrop tiers" },
            { value: "vesting", label: "Vesting streams" },
            { value: "tokenomics", label: "Tokenomics & revenue" },
          ]}
        />
      </div>

      {/* Tab Content */}
      {loading && !st ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : tab === "stake" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[384px_minmax(0,1fr)]">
          {/* Left Column: Staking Execution Card */}
          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
              <h2 className="text-sm font-bold text-[#183225]">Create Stake Position</h2>
              <Badge tone="up">{projectedApy.toFixed(1)}% APY</Badge>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <Field label="Amount" right={<span className="tabular text-[11px] text-[#697c60]">≈ {fmtUsd(Number(amount || 0) * price)}</span>}>
                  <Input value={amount} onChange={setAmount} type="number" suffix="STOKE" />
                </Field>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {["100", "500", "2000", "Max"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v === "Max" ? String(Math.floor(user?.stoke ?? 0)) : v)}
                      className="h-7 rounded border border-[#dce5d3] bg-[#fafcf8] text-[11px] font-medium text-[#5c7054] transition hover:border-[#b3c8a6] hover:bg-[#eef4e7]"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#53684d]">Lock boost duration</span>
                  <span className="tabular font-mono font-bold text-[#1d472f]">{lockDays === 0 ? "Flexible" : `${lockDays} days`}</span>
                </div>
                <div className="mb-2.5 grid grid-cols-5 gap-1.5">
                  {[
                    { d: 0, l: "Flex" },
                    { d: 30, l: "30d" },
                    { d: 90, l: "90d" },
                    { d: 180, l: "180d" },
                    { d: 365, l: "365d" },
                  ].map((p) => (
                    <button
                      key={p.d}
                      type="button"
                      onClick={() => setLockDays(p.d)}
                      className={cn(
                        "h-7 rounded border text-[11px] font-semibold transition",
                        lockDays === p.d
                          ? "border-[#1d472f] bg-[#eef4e7] text-[#1d472f]"
                          : "border-[#dce5d3] bg-white text-[#62755b] hover:border-[#b5c9ab]",
                      )}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  aria-label="Lock duration in days"
                  min={0}
                  max={365}
                  step={15}
                  value={lockDays}
                  onChange={(e) => setLockDays(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="rounded-lg border border-[#dfe8d6] bg-[#f8faf5] px-3.5 py-2.5 text-xs">
                <Row k="Projected APY" v={`${projectedApy.toFixed(1)}%`} strong />
                <Row k="Est. daily yield" v={`${fmtNum(((Number(amount) || 0) * (projectedApy / 100)) / 365, 3)} STOKE`} />
                <Row k="Points bonus" v={`+${Math.floor((Number(amount) || 0) / 10)} pts`} />
                <Row k="Unstake policy" v="Instant withdrawal anytime" />
              </div>

              <Btn
                full
                size="lg"
                loading={busy}
                onClick={() =>
                  run("Stake created", () =>
                    api("/api/stoke", { json: { action: "stake", amount: Number(amount) || 0, lockDays } }).then(() =>
                      mutate((prev) =>
                        prev ? { ...prev, state: { ...prev.state, totalStaked: prev.state.totalStaked + (Number(amount) || 0) } } : prev,
                      ),
                    ),
                  )
                }
              >
                Stake STOKE
              </Btn>
            </div>
          </div>

          {/* Right Column: Active Stakes Card + Leaderboard Card */}
          <div className="min-w-0 space-y-5">
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
                <h2 className="text-sm font-bold text-[#183225]">Your Active Stakes</h2>
                <span className="text-xs text-[#6a7d60]">{st?.myPositions.length ?? 0} positions</span>
              </div>

              <div className="p-5">
                {!st?.myPositions.length ? (
                  <EmptyState
                    title="No active stakes"
                    body="Stake at least 10 STOKE using the ticket on the left to begin accruing protocol yield and points."
                  />
                ) : (
                  <div className="divide-y divide-[#e8efde]">
                    {st.myPositions.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                        <div>
                          <div className="tabular text-sm font-bold text-[#183225]">{fmtNum(p.principal, 2)} STOKE</div>
                          <div className="mt-0.5 text-xs text-[#697c60]">
                            <span className="font-semibold text-up">{p.apy.toFixed(1)}% APY</span> · Opened {timeAgo(p.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="tabular text-right">
                            <div className="text-xs font-bold text-up">+{fmtNum(p.rewards + p.accrued, 4)} STOKE</div>
                            <div className="text-[11px] text-[#6d8065]">{fmtUsd((p.rewards + p.accrued) * price)}</div>
                          </div>
                          <Btn
                            size="sm"
                            variant="outline"
                            loading={busy}
                            onClick={() => run("Stake withdrawn", () => api("/api/stoke", { json: { action: "unstake", stakeId: p.id } }))}
                          >
                            Withdraw
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
                <h2 className="text-sm font-bold text-[#183225]">Points & Staking Leaderboard</h2>
                <Badge tone="gold">Season 1</Badge>
              </div>

              <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e3eadc] text-[11px] font-semibold text-[#6b7e63]">
                      <th className="pb-2.5">Rank</th>
                      <th className="pb-2.5">Participant</th>
                      <th className="pb-2.5">Tier</th>
                      <th className="pb-2.5">Account</th>
                      <th className="pb-2.5 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf0e3]">
                    {leaders.slice(0, 8).map((r) => (
                      <tr key={r.rank} className="hover:bg-[#fafcf8]">
                        <td className="tabular py-2.5 font-semibold text-[#5b7054]">#{r.rank}</td>
                        <td className="py-2.5 font-semibold text-[#183225]">{r.name}</td>
                        <td className="py-2.5">
                          <Badge tone={r.rank <= 3 ? "gold" : "slate"}>{r.tier}</Badge>
                        </td>
                        <td className="py-2.5 font-mono text-[#65785d]">{shortAddr(r.wallet, 4)}</td>
                        <td className="tabular py-2.5 text-right font-bold text-[#1d472f]">{fmtNum(r.points, 0)} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : tab === "airdrop" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(st?.tiers ?? []).map((t) => (
            <div key={t.tier} className="surface flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#183225]">{t.label}</span>
                  <Badge tone={t.claimed ? "up" : t.unlocked ? "gold" : "slate"}>
                    {t.claimed ? "Claimed" : t.unlocked ? "Unlocked" : "Locked"}
                  </Badge>
                </div>
                <div className="tabular mt-4 font-serif-display text-3xl font-bold text-[#183225]">
                  {fmtCompact(t.amount, 1)} <span className="text-sm font-semibold text-gold">STOKE</span>
                </div>
                <div className="mt-1 text-xs text-[#697c60]">{fmtNum(t.min, 0)} platform points required</div>
                <div className="mt-4">
                  <Progress pct={Math.min(100, ((user?.points ?? 0) / Math.max(1, t.min)) * 100)} accent="#a57e28" height={5} />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-[#5c7054]">{t.perks}</p>
              </div>

              <Btn
                full
                className="mt-6"
                variant={t.unlocked && !t.claimed ? "gold" : "outline"}
                disabled={!t.unlocked || t.claimed}
                loading={busy}
                onClick={() => run(`${t.label} airdrop claimed`, () => api("/api/stoke", { json: { action: "claim", tier: t.tier } }))}
              >
                {t.claimed ? "Claimed" : t.unlocked ? "Claim" : `${fmtNum(Math.max(0, t.min - (user?.points ?? 0)), 0)} points to go`}
              </Btn>
            </div>
          ))}
        </div>
      ) : tab === "vesting" ? (
        <div className="surface p-6">
          {!st?.vesting.length ? (
            <EmptyState title="No vesting schedules" body="Creator fee streams and claimed airdrop schedules appear here automatically." />
          ) : (
            <div className="divide-y divide-[#e4ecdc]">
              {st.vesting.map((v) => (
                <div key={v.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-[#183225]">{v.label}</div>
                      <div className="mt-0.5 text-xs text-[#697c60]">
                        {v.tgePct}% unlocked at TGE · Linear release over {v.months} months
                      </div>
                    </div>
                    <Btn
                      size="sm"
                      variant={v.claimable > 0 ? "gold" : "outline"}
                      loading={busy}
                      disabled={v.claimable <= 0}
                      onClick={() => run("Vested STOKE released", () => api("/api/stoke", { json: { action: "vest", scheduleId: v.id } }))}
                    >
                      {v.claimable > 0 ? `Claim ${fmtNum(v.claimable, 2)} STOKE` : "Nothing claimable"}
                    </Btn>
                  </div>
                  <div className="mt-4">
                    <Progress pct={v.vestedPct} accent="#1d472f" height={6} />
                    <div className="tabular mt-2 flex justify-between text-xs text-[#697c60]">
                      <span>
                        {fmtNum(v.vested, 2)} / {fmtNum(v.total, 0)} STOKE vested ({v.vestedPct.toFixed(1)}%)
                      </span>
                      <span>Claimed: {fmtNum(v.claimed, 2)} STOKE</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface overflow-hidden">
            <div className="border-b border-[#e3eadc] px-5 py-3.5">
              <h2 className="text-sm font-bold text-[#183225]">Supply Allocation · 1,000,000,000 Fixed</h2>
            </div>
            <div className="space-y-5 p-5">
              {STOKE.allocations.map((a) => (
                <div key={a.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-[#183225]">{a.label}</span>
                    <span className="tabular font-bold text-[#1d472f]">{a.pct}%</span>
                  </div>
                  <div className="mt-1.5">
                    <Progress pct={a.pct * 2.4} accent="#1d472f" height={5} />
                  </div>
                  <div className="mt-1 text-[11px] text-[#6a7d60]">{a.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface overflow-hidden">
              <div className="border-b border-[#e3eadc] px-5 py-3.5">
                <h2 className="text-sm font-bold text-[#183225]">STOKE Valuation Trajectory</h2>
              </div>
              <div className="p-2">
                <MarketChart data={trail(price)} symbol="STOKE/USD" height={175} />
              </div>
            </div>

            <div className="surface p-5">
              <h3 className="text-sm font-bold text-[#183225]">Protocol Fee & Burn Waterfall</h3>
              <ol className="mt-4 space-y-2.5 text-xs text-[#4f644a]">
                {[
                  "1.00% transparent fee on every bonding curve trade, settled in native HYPE.",
                  "25% of curve fees stream directly to the token creator.",
                  "75% of curve fees accrue to the Forge protocol treasury.",
                  "10% of net treasury revenue systematically buys back and burns STOKE.",
                  "Remaining treasury revenue funds staking yield and HyperCore ticker auctions.",
                ].map((t, i) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded bg-[#eef4e7] text-[10px] font-bold text-[#1d472f]">
                      0{i + 1}
                    </span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between border-t border-[#e3eadc] pt-3 text-xs">
                <span className="text-[#6a7d60]">Mainnet TGE contract ({STOKE.chain})</span>
                <Copyable text="STOKE-mainnet-TGE" label="Published at TGE" />
              </div>
            </div>
          </div>
        </div>
      )}

      <TopUpModal
        open={topup}
        onClose={() => setTopup(false)}
        onDone={() => {
          void refresh();
          void reload();
        }}
      />
    </div>
  );
}

function TopUpModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { user, push } = useForge();
  const [usd, setUsd] = useState("50");
  const [intent, setIntent] = useState<{ reference: string; amountUsd: number; memo: string; code?: string; deeplink: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title="Top up via X Money">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-400">
          Send USD to an X handle. Your sandbox account receives the equivalent HYPE and USDC balance once confirmed.
        </p>
        {!user ? (
          <EmptyState title="Sign in first" />
        ) : !intent ? (
          <>
            <Field label="Amount (USD)" right={<span className="tabular text-xs text-slate-500">≈ {fmtNum(Number(usd || 0) / 28.4, 4)} HYPE</span>}>
              <Input value={usd} onChange={setUsd} type="number" suffix="USD" />
            </Field>
            <Btn
              full
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setIntent(
                    await api<{ reference: string; amountUsd: number; memo: string; code?: string; deeplink: string }>("/api/x", {
                      json: { action: "checkout", usd: Number(usd) || 0, purpose: "stake_topup", handle: user.xHandle ?? "forge_xyz" },
                    }),
                  );
                } catch (e) {
                  push({ kind: "error", title: "Request failed", body: (e as Error).message });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create payment
            </Btn>
          </>
        ) : (
          <div className="space-y-4 rounded-xl border border-[#dfe8d6] bg-[#f8faf5] p-4">
            <p className="text-sm text-slate-300">
              Send <span className="font-semibold text-white">{fmtUsd(intent.amountUsd)}</span> to{" "}
              <span className="font-semibold text-white">@{user.xHandle ?? "forge_xyz"}</span> with memo{" "}
              <span className="font-mono text-xs text-gold">{intent.memo}</span>.
            </p>
            <a className="inline-block text-sm font-medium text-ice-400 hover:underline" href={intent.deeplink} target="_blank" rel="noreferrer">
              Open X ↗
            </a>
            <Field label="Confirmation code" hint={intent.code ? `Sandbox code: ${intent.code}` : "Confirmed automatically."}>
              <Input value={code} onChange={setCode} placeholder="6 digits" maxLength={6} />
            </Field>
            <Btn
              full
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/x", { json: { action: "confirm", reference: intent.reference, code } });
                  push({ kind: "success", title: "Balance credited" });
                  onDone();
                  onClose();
                  setIntent(null);
                } catch (e) {
                  push({ kind: "error", title: "Could not confirm", body: (e as Error).message });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm payment
            </Btn>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1.5", strong && "font-semibold text-[#183225]")}>
      <span className="text-[#697c60]">{k}</span>
      <span className="tabular font-medium text-[#223d27]">{v}</span>
    </div>
  );
}

function trail(price: number) {
  return Array.from({ length: 48 }, (_, i) => price * (0.88 + (i / 47) * 0.18 + Math.sin(i / 3.4) * 0.015));
}
