"use client";

import { useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Badge, Btn, Copyable, EmptyState, Field, Input, Modal, Progress, Segmented, Skeleton, Sparkline, Stat } from "@/components/ui";
import { STOKE } from "@/lib/tokenomics";
import { fmtCompact, fmtNum, fmtUsd, shortAddr, timeAgo } from "@/lib/util";

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
  const { data, loading, reload, mutate } = useLive<{ state: StokeState; leaderboard: Array<{ rank: number; name: string; points: number; wallet: string; tier: string }> }>(
    user ? "/api/stoke" : null,
    5000,
  );
  const meta = useLive<{ price: number; hypeUsd: number; state: StokeState; leaderboard: Array<{ rank: number; name: string; points: number; wallet: string; tier: string }> }>("/api/stoke", 9000);
  const net = useLive<Net>("/api/network", 8000);
  const [tab, setTab] = useState<"stake" | "airdrop" | "vesting" | "tokenomics">("stake");
  const [amount, setAmount] = useState("100");
  const [lockDays, setLockDays] = useState(0);
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
    <div className="pt-14 sm:pt-20">
      {/* hero */}
      <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
            <Badge tone="gold">{STOKE.symbol}</Badge>
            <span>Forge platform token · Minted at mainnet</span>
          </div>
          <h1 className="font-serif-display text-[40px] leading-[1.05] text-white sm:text-5xl">Stake STOKE</h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400">
            Staking yield follows utilization. Points from platform activity unlock airdrop tiers. Ten percent of net revenue goes to buying and burning STOKE.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            STOKE is the ticker of Forge&rsquo;s own platform token. It is not the Elysium network token, because Elysium charges gas in HYPE.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:pl-10">
          <Stat label="Price" value={fmtUsd(price)} sub={`${fmtNum(price / hypeUsd, 6)} HYPE`} tone="gold" />
          <Stat label="Current APY" value={`${(st?.apy ?? 0).toFixed(1)}%`} sub="Varies with utilization" tone="up" />
          <Stat label="Total staked" value={fmtCompact(st?.totalStaked ?? 0, 2)} sub={`${fmtNum(st?.stakers ?? 0, 0)} stakers`} />
          <Stat label="Burned" value={fmtCompact(net.data?.stats.stokeBurned ?? 0, 2)} sub="From platform revenue" />
        </div>
      </div>

      <div className="mt-12 surface overflow-hidden rounded-2xl p-6">
        <Sparkline values={trail(price)} accent="#e9cf8a" height={72} />
      </div>

      {/* body */}
      <div className="mt-14">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b border-white/[0.07]">
          <Segmented
            underline
            value={tab}
            onChange={(v) => setTab(v)}
            options={[
              { value: "stake", label: "Stake" },
              { value: "airdrop", label: "Airdrop" },
              { value: "vesting", label: "Vesting" },
              { value: "tokenomics", label: "Tokenomics" },
            ]}
          />
          <div className="mb-3 flex items-center gap-4 text-sm">
            {user ? (
              <>
                <span className="text-slate-500">
                  Balance <span className="tabular text-gold">{fmtNum(user.stoke, 2)}</span> · Points <span className="tabular text-ice-400">{fmtNum(user.points, 0)}</span>
                </span>
                <Btn size="sm" variant="outline" onClick={() => setTopup(true)}>
                  Buy with X Money
                </Btn>
              </>
            ) : (
              <Btn size="sm" onClick={() => setAuthModal("login")}>
                Sign in
              </Btn>
            )}
          </div>
        </div>

        {loading && !st ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        ) : tab === "stake" ? (
          <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
            <div className="space-y-7">
              <Field label="Amount" right={<span className="tabular text-xs text-slate-500">≈ {fmtUsd(Number(amount || 0) * price)}</span>}>
                <Input value={amount} onChange={setAmount} type="number" suffix="STOKE" />
              </Field>
              <div className="grid grid-cols-4 gap-2">
                {["100", "500", "2000", "Max"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v === "Max" ? String(Math.floor(user?.stoke ?? 0)) : v)}
                    className="h-8 rounded-lg text-xs font-medium text-slate-400 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.05] hover:text-white"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Field label={`Lock period · ${lockDays} days`} hint="A longer lock raises the APY. You can withdraw at any time.">
                <input type="range" min={0} max={365} step={15} value={lockDays} onChange={(e) => setLockDays(Number(e.target.value))} className="w-full" />
              </Field>
              <div className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.02] px-4 ring-1 ring-inset ring-white/[0.06] text-sm">
                <Row k="Projected APY" v={`${projectedApy.toFixed(1)}%`} />
                <Row k="Rewards per day" v={fmtNum(((Number(amount) || 0) * ((st?.apy ?? 14) / 100)) / 365, 3)} />
                <Row k="Points earned" v={`+${Math.floor((Number(amount) || 0) / 10)}`} />
              </div>
              <Btn
                full
                size="lg"
                loading={busy}
                onClick={() =>
                  run("Stake created", () =>
                    api("/api/stoke", { json: { action: "stake", amount: Number(amount) || 0, lockDays } }).then(() =>
                      mutate((prev) => (prev ? { ...prev, state: { ...prev.state, totalStaked: prev.state.totalStaked + (Number(amount) || 0) } } : prev)),
                    ),
                  )
                }
              >
                Stake STOKE
              </Btn>
            </div>

            <div className="min-w-0 space-y-12">
              <div>
                <div className="mb-5 text-sm font-medium text-white">Your positions</div>
                {!st?.myPositions.length ? (
                  <EmptyState title="No active stakes" body="Stake at least 10 STOKE to start earning." />
                ) : (
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    {st.myPositions.map((p) => (
                      <div key={p.id} className="grid items-center gap-4 py-5 sm:grid-cols-[1.2fr_1fr_auto]">
                        <div>
                          <div className="tabular text-base font-medium text-white">{fmtNum(p.principal, 2)} STOKE</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {p.apy.toFixed(1)}% APY · opened {timeAgo(p.createdAt)}
                          </div>
                        </div>
                        <div className="tabular">
                          <div className="text-sm text-up">+{fmtNum(p.rewards + p.accrued, 4)} STOKE</div>
                          <div className="text-xs text-slate-500">{fmtUsd((p.rewards + p.accrued) * price)}</div>
                        </div>
                        <Btn size="sm" variant="outline" loading={busy} onClick={() => run("Stake withdrawn", () => api("/api/stoke", { json: { action: "unstake", stakeId: p.id } }))}>
                          Withdraw
                        </Btn>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-5 text-sm font-medium text-white">Leaderboard</div>
                <div className="divide-y divide-white/[0.05]">
                  {leaders.slice(0, 8).map((r) => (
                    <div key={r.rank} className="flex items-center gap-4 py-3.5 text-sm">
                      <span className="tabular w-6 text-slate-600">{r.rank}</span>
                      <span className="flex-1 truncate text-white">{r.name}</span>
                      <span className="hidden text-xs text-slate-500 sm:inline">{r.tier}</span>
                      <span className="tabular text-slate-300">{fmtNum(r.points, 0)} pts</span>
                      <span className="tabular hidden font-mono text-xs text-slate-600 md:inline">{shortAddr(r.wallet, 4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : tab === "airdrop" ? (
          <div className="grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
            {(st?.tiers ?? []).map((t) => (
              <div key={t.tier} className="flex flex-col bg-ink-950 p-7">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-white">{t.label}</span>
                  <Badge tone={t.claimed ? "up" : t.unlocked ? "gold" : "slate"}>{t.claimed ? "Claimed" : t.unlocked ? "Unlocked" : "Locked"}</Badge>
                </div>
                <div className="tabular mt-6 font-serif-display text-4xl text-white">{fmtCompact(t.amount, 1)}</div>
                <div className="mt-1 text-xs text-slate-500">STOKE · {fmtNum(t.min, 0)} points required</div>
                <div className="mt-6">
                  <Progress pct={Math.min(100, ((user?.points ?? 0) / Math.max(1, t.min)) * 100)} accent="#e9cf8a" />
                </div>
                <p className="mt-5 flex-1 text-sm leading-relaxed text-slate-400">{t.perks}</p>
                <Btn
                  full
                  className="mt-6"
                  variant={t.unlocked && !t.claimed ? "gold" : "outline"}
                  disabled={!t.unlocked || t.claimed}
                  loading={busy}
                  onClick={() => run(`${t.label} airdrop claimed`, () => api("/api/stoke", { json: { action: "claim", tier: t.tier } }))}
                >
                  {t.claimed ? "Claimed" : t.unlocked ? "Claim" : `${fmtNum(t.min - (user?.points ?? 0), 0)} points to go`}
                </Btn>
              </div>
            ))}
          </div>
        ) : tab === "vesting" ? (
          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {!st?.vesting.length ? (
              <EmptyState title="No vesting schedules" body="Creator fee streams and airdrop unlocks appear here automatically." />
            ) : (
              st.vesting.map((v) => (
                <div key={v.id} className="py-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-[15px] font-medium text-white">{v.label}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {v.tgePct}% at launch, then linear over {v.months} months
                      </div>
                    </div>
                    <Btn size="sm" variant={v.claimable > 0 ? "gold" : "outline"} loading={busy} disabled={v.claimable <= 0} onClick={() => run("Vested STOKE released", () => api("/api/stoke", { json: { action: "vest", scheduleId: v.id } }))}>
                      {v.claimable > 0 ? `Claim ${fmtNum(v.claimable, 2)}` : "Nothing to claim"}
                    </Btn>
                  </div>
                  <div className="mt-6">
                    <Progress pct={v.vestedPct} accent="#b9adff" height={6} />
                    <div className="tabular mt-2.5 flex justify-between text-xs text-slate-500">
                      <span>
                        {fmtNum(v.vested, 2)} of {fmtNum(v.total, 0)} vested
                      </span>
                      <span>Claimed {fmtNum(v.claimed, 2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-6 text-sm font-medium text-white">Allocation · 1,000,000,000 fixed</div>
              <div className="space-y-7">
                {STOKE.allocations.map((a) => (
                  <div key={a.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-slate-200">{a.label}</span>
                      <span className="tabular text-slate-400">{a.pct}%</span>
                    </div>
                    <div className="mt-2.5">
                      <Progress pct={a.pct * 2.4} accent="#e9cf8a" height={3} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{a.note}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-10">
              <div>
                <div className="mb-5 text-sm font-medium text-white">How value flows</div>
                <ol className="space-y-4 text-sm text-slate-400">
                  {["1% fee on every curve trade, paid in HYPE", "25% of the fee goes to the token creator", "75% goes to the treasury", "10% of treasury revenue buys STOKE and burns it", "The rest funds staking rewards and ticker auctions"].map((t, i) => (
                    <li key={t} className="flex gap-4">
                      <span className="tabular text-slate-600">0{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="mb-3 text-sm font-medium text-white">Contract</div>
                <p className="text-sm leading-relaxed text-slate-400">The contract address is published at the mainnet token generation event on {STOKE.chain}.</p>
                <Copyable className="mt-3" text="STOKE-mainnet-TGE" label="Available at TGE" />
              </div>
            </div>
          </div>
        )}
      </div>

      <TopUpModal open={topup} onClose={() => setTopup(false)} onDone={() => { void refresh(); void reload(); }} />
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
    <Modal open={open} onClose={onClose} title="Buy with X Money">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-400">Send USD to an X handle. Your account receives the equivalent in HYPE and USDC.</p>
        {!user ? (
          <EmptyState title="Sign in first" />
        ) : !intent ? (
          <>
            <Field label="Amount" right={<span className="tabular text-xs text-slate-500">≈ {fmtNum(Number(usd || 0) / 28.4, 4)} HYPE</span>}>
              <Input value={usd} onChange={setUsd} type="number" suffix="USD" />
            </Field>
            <Btn
              full
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setIntent(await api<{ reference: string; amountUsd: number; memo: string; code?: string; deeplink: string }>("/api/x", { json: { action: "checkout", usd: Number(usd) || 0, purpose: "stake_topup", handle: user.xHandle ?? "forge_xyz" } }));
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
          <div className="space-y-4 rounded-xl bg-white/[0.02] p-5 ring-1 ring-inset ring-white/[0.06]">
            <p className="text-sm text-slate-300">
              Send <span className="text-white">{fmtUsd(intent.amountUsd)}</span> to <span className="text-white">@{user.xHandle ?? "forge_xyz"}</span> with memo{" "}
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-slate-500">{k}</span>
      <span className="tabular text-slate-100">{v}</span>
    </div>
  );
}

function trail(price: number) {
  return Array.from({ length: 48 }, (_, i) => price * (0.88 + (i / 47) * 0.18 + Math.sin(i / 3.4) * 0.015));
}
