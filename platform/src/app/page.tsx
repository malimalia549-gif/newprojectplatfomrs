"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForge, useLive } from "@/components/providers";
import { LaunchRow } from "@/components/launch-card";
import { Badge, Btn, Skeleton } from "@/components/ui";
import { ELYSIUM, fmtCompact, fmtNum, fmtUsd } from "@/lib/util";
import type { LaunchSummary } from "@/lib/dto";

type Net = {
  network: { headBlock: number; blockMs: number };
  prices: { hypeUsd: number; stokeUsd: number };
  stats: { launches: number; graduated: number; liveCurves: number; perpMarkets: number; perpOiUsd: number; perpVolumeUsd: number; raisedHype: number; stokeBurned: number };
};

export default function Home() {
  const { user, setAuthModal } = useForge();
  const net = useLive<Net>("/api/network", 5000);
  const feed = useLive<{ launches: LaunchSummary[] }>("/api/launches?sort=volume", 7000);
  const [tab, setTab] = useState("trending");
  const [networkOpen, setNetworkOpen] = useState(false);
  const s = net.data?.stats;
  const p = net.data?.prices;
  const rows = feed.data?.launches ?? [];
  const filtered = rows.filter((l) => tab === "new" || tab === "trending" || (tab === "live" && l.stage === "trading") || (tab === "graduated" && ["graduated", "perp_listed"].includes(l.stage)));
  const displayed = tab === "new" ? [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : filtered;

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="min-w-0">
          <div className="eyebrow">The Elysium launchpad</div>
          <h1 className="hero-title">From first mint<br />to <em>open markets.</em></h1>
          <p className="hero-description">Launch a token, build liquidity, and reach HyperCore. One connected platform for the full journey from bonding curve to perpetual market.</p>
          <div className="hero-actions">
            <Btn size="lg" href="/create">Launch a token</Btn>
            <Btn size="lg" variant="outline" href="/trade">Open trade desk</Btn>
            {!user ? <Btn variant="ghost" onClick={() => setAuthModal("register")}>Create account</Btn> : null}
          </div>
          <div className="hero-proof">
            <span><svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m10 2 6 3v5c0 4-6 8-6 8s-6-4-6-8V5l6-3Z" /><path d="m7 10 2 2 4-4" /></svg>Testnet environment</span>
            <span>·</span>
            <span>No real funds required</span>
          </div>
        </div>
        <div className="hero-art">
          <Image src="/images/forge-orbit.png" width={1536} height={1024} alt="Sculptural emerald glass ribbon wrapping around a polished green ring" priority className="hero-art-image" />
          <div className="art-label"><span className="live-dot h-1.5 w-1.5 rounded-full bg-up" /> A NEW LAYER OF POSSIBILITY</div>
          <div className="art-caption">
            <div>
              <div className="art-caption-title">Built for the full lifecycle.</div>
              <div className="art-caption-sub">Create. Graduate. Trade.</div>
            </div>
            <span className="art-serial">F / 001</span>
          </div>
        </div>
      </section>

      <section className="hero-statistics" aria-label="Platform statistics">
        <div>
          <div className="stat-label">Tokens launched <span className="text-slate-600">↗</span></div>
          <div className="stat-value tabular">{s ? fmtNum(s.launches, 0) : <Skeleton className="h-7 w-16" />}</div>
          <div className="stat-sub">{s ? `${s.liveCurves} curves trading now` : "Connecting to Elysium"}</div>
        </div>
        <div>
          <div className="stat-label">Capital raised</div>
          <div className="stat-value tabular">{s ? `${fmtCompact(s.raisedHype, 1)}` : <Skeleton className="h-7 w-24" />}{s ? <span className="ml-1 text-xs font-normal tracking-normal text-slate-500">HYPE</span> : null}</div>
          <div className="stat-sub">Across all bonding curves</div>
        </div>
        <div>
          <div className="stat-label">Graduated tokens</div>
          <div className="stat-value tabular">{s ? fmtNum(s.graduated, 0) : <Skeleton className="h-7 w-16" />}</div>
          <div className="stat-sub">Pool + HyperCore spot</div>
        </div>
        <div>
          <div className="stat-label">Perpetual open interest</div>
          <div className="stat-value tabular">{s ? fmtUsd(s.perpOiUsd).replace(/\.0+$/, "") : <Skeleton className="h-7 w-24" />}</div>
          <div className="stat-sub">{s ? `${s.perpMarkets} HIP-3 markets live` : "HyperCore liquidity"}</div>
        </div>
      </section>

      <section className="market-section">
        <div className="section-heading">
          <div>
            <h2>Discover launches</h2>
            <p className="section-description">Find the next project before it graduates.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="section-tools">
              {[{ id: "trending", label: "Trending" }, { id: "new", label: "New" }, { id: "live", label: "Live curves" }, { id: "graduated", label: "Graduated" }].map((t) => (
                <button key={t.id} className="section-tab" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
            <Link href="/launch" className="small-link">View all <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="market-table">
          <div className="table-head"><span>Token</span><span className="text-right">Price · HYPE</span><span className="text-right">Market cap</span><span className="text-right">24h change</span><span>Graduation progress</span></div>
          <div className="divide-y divide-white/[0.05]">
            {feed.loading && !rows.length ? Array.from({ length: 5 }).map((_, i) => <Skeleton className="m-4 h-12" key={i} />) : displayed.slice(0, 5).map((l) => <LaunchRow key={l.id} launch={l} />)}
            {!feed.loading && !displayed.length ? <div className="p-10 text-center text-sm text-slate-500">No launches in this stage yet.</div> : null}
          </div>
          <div className="table-foot">
            <span>Showing {Math.min(5, displayed.length)} of {rows.length} launches</span>
            <span className="text-divider"><span className="live-dot h-1.5 w-1.5 rounded-full bg-up" /> Live data · Elysium testnet</span>
          </div>
        </div>
      </section>

      <section className="editorial-grid">
        <div className="editorial-card">
          <div className="flex items-center justify-between">
            <div className="editorial-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m12 3 8 5v8l-8 5-8-5V8l8-5Z" /><path d="m4 8 8 5 8-5m-8 5v8" /></svg></div>
            <Badge tone="gold">Platform token</Badge>
          </div>
          <h3>Meet STOKE. Fuel the platform.</h3>
          <p>STOKE is Forge&rsquo;s own platform token, not Elysium&rsquo;s network token. Stake it to earn, or hold it for a share of platform revenue. Elysium itself uses HYPE for gas.</p>
          <Link href="/stoke" className="small-link">Explore STOKE <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="editorial-card">
          <div className="flex items-center justify-between">
            <div className="editorial-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 9h12M9 6v12m6-9v6a3 3 0 0 1-6 0M5 20h14M5 4h14" /></svg></div>
            <Badge tone="ice">X Money</Badge>
          </div>
          <h3>Payments, without the friction.</h3>
          <p>Pay launch fees and list a cashtag using X Money. One reference, one receipt, and a clear confirmation before any funds are moved. Currently in sandbox mode.</p>
          <Link href="/docs#payments" className="small-link">How payments work <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="mt-12 border-t border-[#dfe8d6] pt-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#eaf1df] text-[#577b3a]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12h18M12 3v18" /><circle cx="12" cy="12" r="8" /></svg></div>
            <div>
              <div className="text-sm font-semibold text-[#3b6328]">Connected to Elysium</div>
              <div className="text-xs text-[#667554]">Chain {ELYSIUM.chainId} · {net.data ? fmtNum(net.data.network.headBlock, 0) : "—"} · HYPE gas</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/docs#lifecycle" className="small-link">Explore the token lifecycle</Link>
            <button type="button" onClick={() => setNetworkOpen(!networkOpen)} className="small-link" aria-expanded={networkOpen}>{networkOpen ? "Hide details" : "View network details"} {networkOpen ? "−" : "+"}</button>
          </div>
        </div>
        {networkOpen ? (
          <div className="rise mt-5 grid gap-6 rounded-lg bg-[#edf3e5] p-5 text-xs text-[#607a4e] sm:grid-cols-2 lg:grid-cols-3">
            <div><div>RPC</div><div className="mt-1 break-all font-mono text-[#426b2e]">{ELYSIUM.rpc}</div></div>
            <div><div>Gas token</div><div className="mt-1 text-[#426b2e]">HYPE · 18 decimals</div></div>
            <div><div>Explorer</div><a className="mt-1 block text-[#426b2e] hover:underline" href={ELYSIUM.explorer} target="_blank" rel="noreferrer">Open Elysium explorer ↗</a></div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
