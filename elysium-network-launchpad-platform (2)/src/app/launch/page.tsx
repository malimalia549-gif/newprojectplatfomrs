"use client";

import { useMemo, useState } from "react";
import { LaunchCard, LaunchRow } from "@/components/launch-card";
import { useLive } from "@/components/providers";
import { Btn, EmptyState, Input, Segmented, Skeleton } from "@/components/ui";
import type { LaunchSummary } from "@/lib/dto";
import { fmtCompact, fmtNum } from "@/lib/util";

const STAGES = [
  { value: "all", label: "All tokens" },
  { value: "trading", label: "Live curves" },
  { value: "frozen", label: "Ready to graduate" },
  { value: "graduated", label: "Pool live" },
  { value: "perp_listed", label: "Perp live" },
];

export default function LaunchPage() {
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("volume");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");
  const { data, loading, error, reload } = useLive<{ launches: LaunchSummary[] }>(`/api/launches?stage=${stage}&sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ""}`, 7000);
  const launches = useMemo(() => data?.launches ?? [], [data]);
  const totals = useMemo(() => ({ raised: launches.reduce((a, l) => a + l.raisedHype, 0), vol: launches.reduce((a, l) => a + l.volumeHype, 0), holders: launches.reduce((a, l) => a + l.holdersCount, 0) }), [launches]);

  return (
    <div className="forge-page">
      <div className="app-title-row"><div><div className="eyebrow">The launchpad</div><h1>Good ideas start here.</h1><p>Explore live bonding curves, graduated pools and perpetual markets. Every stage, one place.</p></div><Btn href="/create" size="lg">Launch a token</Btn></div>
      <div className="metrics-strip"><div><div className="data-label">Tokens listed</div><div className="tabular mt-2 text-2xl font-semibold text-[#547b3a]">{fmtNum(launches.length, 0)}</div></div><div><div className="data-label">Capital raised</div><div className="tabular mt-2 text-2xl font-semibold text-[#547b3a]">{fmtCompact(totals.raised, 1)} <span className="text-xs font-normal">HYPE</span></div></div><div><div className="data-label">Curve volume</div><div className="tabular mt-2 text-2xl font-semibold text-[#547b3a]">{fmtCompact(totals.vol, 1)} <span className="text-xs font-normal">HYPE</span></div></div><div><div className="data-label">Holder slots</div><div className="tabular mt-2 text-2xl font-semibold text-[#547b3a]">{fmtNum(totals.holders, 0)}</div></div></div>
      <div className="filter-bar"><Segmented value={stage} onChange={(v) => setStage(v)} options={STAGES} /><div className="search-field"><Input value={q} onChange={setQ} placeholder="Search name or ticker" /></div></div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><span className="text-[11px] text-[#647658]">Sort by</span><Segmented value={sort} onChange={(v) => setSort(v)} size="sm" options={[{ value: "volume", label: "Volume" }, { value: "progress", label: "Progress" }, { value: "mcap", label: "Market cap" }, { value: "new", label: "Newest" }]} /></div><Segmented size="sm" value={view} onChange={(v) => setView(v)} options={[{ value: "table", label: "List" }, { value: "grid", label: "Cards" }]} /></div>
      {error ? <EmptyState title="Could not load launches" body={error} action={<Btn variant="outline" onClick={reload}>Try again</Btn>} /> : loading && !launches.length ? <div className="market-table">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="m-4 h-12" />)}</div> : !launches.length ? <EmptyState title="No launches match" body="Try a broader filter, or launch the first project in this stage." action={<Btn href="/create">Create a token</Btn>} /> : view === "table" ? <div className="market-table"><div className="table-head"><span>Token</span><span className="text-right">Price · HYPE</span><span className="text-right">Market cap</span><span className="text-right">24h change</span><span>Graduation progress</span></div><div className="divide-y divide-[#e8efde]">{launches.map((l) => <LaunchRow key={l.id} launch={l} />)}</div><div className="table-foot"><span>{launches.length} token{launches.length !== 1 ? "s" : ""}</span><span>Live data · Elysium testnet</span></div></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{launches.map((l) => <LaunchCard key={l.id} launch={l} />)}</div>}
      <p className="mt-5 text-[11px] leading-relaxed text-[#657757]">Market values are shown in HYPE and USD. Testnet tokens are simulated and have no real-world monetary value.</p>
    </div>
  );
}
