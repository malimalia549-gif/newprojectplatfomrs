"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LaunchCard, LaunchRow } from "@/components/launch-card";
import { useLive } from "@/components/providers";
import { Badge, Btn, Delta, EmptyState, Input, Progress, Segmented, Skeleton, TokenGlyph, stageText, stageTone } from "@/components/ui";
import type { LaunchSummary } from "@/lib/dto";
import { cn, fmtCompact, fmtNum, fmtPrice, fmtUsd } from "@/lib/util";

const STAGES = [
  { value: "all", label: "All tokens" },
  { value: "trading", label: "Live curves" },
  { value: "frozen", label: "Ready to graduate" },
  { value: "graduated", label: "Pool live" },
  { value: "perp_listed", label: "Perp live" },
];

const CATEGORIES = [
  { value: "all", label: "All sectors" },
  { value: "infra", label: "Infra" },
  { value: "ai", label: "AI" },
  { value: "rwa", label: "RWA" },
  { value: "meme", label: "Meme" },
  { value: "gaming", label: "Gaming" },
  { value: "dao", label: "DAO" },
];

export default function LaunchPage() {
  const [stage, setStage] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("volume");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");

  const { data, loading, error, reload } = useLive<{ launches: LaunchSummary[] }>(
    `/api/launches?stage=${stage}&sort=${sort}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    7000,
  );

  const rawLaunches = useMemo(() => data?.launches ?? [], [data]);
  const launches = useMemo(
    () => (category === "all" ? rawLaunches : rawLaunches.filter((l) => l.category === category)),
    [rawLaunches, category],
  );

  const spotlight = useMemo(() => {
    return [...rawLaunches]
      .sort((a, b) => (b.stage === "trading" ? b.progressPct + 20 : b.progressPct) - (a.stage === "trading" ? a.progressPct + 20 : a.progressPct))
      .slice(0, 3);
  }, [rawLaunches]);

  const totals = useMemo(
    () => ({
      raised: rawLaunches.reduce((a, l) => a + l.raisedHype, 0),
      vol: rawLaunches.reduce((a, l) => a + l.volumeHype, 0),
      holders: rawLaunches.reduce((a, l) => a + l.holdersCount, 0),
      graduated: rawLaunches.filter((l) => l.stage === "graduated" || l.stage === "perp_listed").length,
    }),
    [rawLaunches],
  );

  return (
    <div className="forge-page space-y-6">
      {/* Structured Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">The Elysium Launchpad</div>
          <h1 className="!text-3xl sm:!text-[38px]">Explore & Trade Launches</h1>
          <p className="mt-2 max-w-xl text-sm text-[#64775c]">
            Discover fixed-supply tokens on constant-product bonding curves, track graduation into locked pools, and trade HyperCore markets.
          </p>
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
          <div className="text-[11px] font-medium text-[#6d8065]">Tokens listed</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtNum(rawLaunches.length, 0)}</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">{totals.graduated} graduated to pools</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Capital raised</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">
            {fmtCompact(totals.raised, 1)} <span className="text-xs font-semibold text-[#5e7257]">HYPE</span>
          </div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">Across active bonding curves</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Cumulative volume</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">
            {fmtCompact(totals.vol, 1)} <span className="text-xs font-semibold text-[#5e7257]">HYPE</span>
          </div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">1.00% transparent curve fee</div>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-medium text-[#6d8065]">Holder positions</div>
          <div className="tabular mt-1.5 text-2xl font-bold text-[#183225]">{fmtNum(totals.holders, 0)}</div>
          <div className="mt-0.5 text-[11px] text-[#6d8065]">Onchain accounts</div>
        </div>
      </div>

      {/* Spotlight Trio (Visible when browsing full feed) */}
      {!q && stage === "all" && category === "all" && spotlight.length > 0 ? (
        <section aria-label="Featured launches">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66795e]">Spotlight & Near Graduation</span>
            <span className="text-[11px] text-[#6e8166]">800M curve threshold</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {spotlight.map((l) => (
              <Link
                key={l.id}
                href={`/token/${l.slug}`}
                className="surface flex flex-col justify-between p-4 transition hover:border-[#adc6a0] hover:bg-[#fcfdf9]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <TokenGlyph glyph={l.glyph} accent={l.accent} size={38} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[#183225]">{l.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#6a7d60]">
                          <span className="font-mono font-medium">${l.symbol}</span>
                          <span>·</span>
                          <span className="capitalize">{l.category}</span>
                        </div>
                      </div>
                    </div>
                    <Badge tone={stageTone[l.stage] ?? "slate"}>{stageText[l.stage] ?? l.stage}</Badge>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[#6e8166]">Price</div>
                      <div className="tabular mt-0.5 font-mono text-sm font-bold text-[#183225]">
                        {fmtPrice(l.priceHype)} <span className="font-sans text-[11px] font-medium text-[#64775c]">HYPE</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Delta pct={l.change24h} className="text-xs font-semibold" />
                      <div className="tabular text-[11px] text-[#6b7e63]">Mcap {fmtUsd(l.marketCapUsd)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#e8efdf] pt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-[#6b7e63]">Graduation</span>
                    <span className="tabular font-semibold text-[#1d472f]">{l.progressPct.toFixed(1)}%</span>
                  </div>
                  <Progress pct={l.progressPct} accent={l.accent} height={5} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Unified Market Directory Card (Toolbar + Table/Grid Integrated) */}
      <div className="surface overflow-hidden">
        {/* Toolbar Row 1: Stage Tabs + Search + View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3eadc] px-5 py-3.5">
          <Segmented value={stage} onChange={(v) => setStage(v)} options={STAGES} />
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <div className="min-w-[200px] flex-1 sm:w-56 sm:flex-initial">
              <Input value={q} onChange={setQ} placeholder="Search token or ticker…" className="!h-9 text-xs" />
            </div>
            <Segmented
              size="sm"
              value={view}
              onChange={(v) => setView(v)}
              options={[
                { value: "table", label: "Table" },
                { value: "grid", label: "Cards" },
              ]}
            />
          </div>
        </div>

        {/* Toolbar Row 2: Sector Filter + Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3eadc] bg-[#fafcf8] px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  category === c.value
                    ? "bg-[#1d472f] text-white"
                    : "text-[#617459] hover:bg-[#e9f0e2] hover:text-[#183225]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#6c7f64]">Sort:</span>
            <Segmented
              value={sort}
              onChange={(v) => setSort(v)}
              size="sm"
              options={[
                { value: "volume", label: "Volume" },
                { value: "progress", label: "Progress" },
                { value: "mcap", label: "Market cap" },
                { value: "new", label: "Newest" },
              ]}
            />
          </div>
        </div>

        {/* Directory Body */}
        {error ? (
          <div className="p-6">
            <EmptyState title="Could not load launches" body={error} action={<Btn variant="outline" onClick={reload}>Try again</Btn>} />
          </div>
        ) : loading && !launches.length ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !launches.length ? (
          <div className="p-8">
            <EmptyState
              title="No matching launches"
              body="Reset the current sector or stage filter, or launch a new token on Elysium."
              action={
                <div className="flex gap-2">
                  <Btn
                    variant="outline"
                    onClick={() => {
                      setStage("all");
                      setCategory("all");
                      setQ("");
                    }}
                  >
                    Reset filters
                  </Btn>
                  <Btn href="/create">Create a token</Btn>
                </div>
              }
            />
          </div>
        ) : view === "table" ? (
          <>
            <div className="table-head">
              <span>Token</span>
              <span className="text-right">Price · HYPE</span>
              <span className="text-right">Market cap</span>
              <span className="text-right">24h change</span>
              <span>Graduation progress</span>
            </div>
            <div className="divide-y divide-[#e8efde]">
              {launches.map((l) => (
                <LaunchRow key={l.id} launch={l} />
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {launches.map((l) => (
              <LaunchCard key={l.id} launch={l} />
            ))}
          </div>
        )}

        <div className="table-foot">
          <span>
            Showing {launches.length} of {rawLaunches.length} token{rawLaunches.length !== 1 ? "s" : ""}
          </span>
          <span className="text-divider">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-up" /> Live data · Elysium testnet
          </span>
        </div>
      </div>
    </div>
  );
}
