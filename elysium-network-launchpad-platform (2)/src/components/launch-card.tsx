"use client";

import Link from "next/link";
import type { LaunchSummary } from "@/lib/dto";
import { Badge, Delta, Progress, TokenGlyph, stageText, stageTone } from "@/components/ui";
import { fmtCompact, fmtNum, fmtPrice, fmtUsd } from "@/lib/util";

export function LaunchRow({ launch }: { launch: LaunchSummary }) {
  return (
    <Link href={`/token/${launch.slug}`} className="market-row group grid items-center transition hover:bg-[#f8fbf2]" aria-label={`Open ${launch.name}, ${launch.symbol}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        <TokenGlyph glyph={launch.glyph} accent={launch.accent} size={36} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-[#2c5528]">{launch.name}</span>
            {launch.cashtag ? <Badge tone="gold" className="hidden lg:inline-flex">${launch.cashtag}</Badge> : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#647558]">
            <span className="font-mono">${launch.symbol}</span>
            <span className="text-[#6c7760]">·</span>
            <span>{stageText[launch.stage] ?? launch.stage}</span>
          </div>
        </div>
      </div>
      <div className="hidden text-right md:block">
        <div className="tabular text-[#385d28]">{fmtPrice(launch.priceHype)}</div>
        <div className="tabular mt-0.5 text-xs text-[#657456]">{fmtUsd(launch.priceUsd)}</div>
      </div>
      <div className="hidden text-right md:block">
        <div className="tabular text-[#385d28]">{fmtCompact(launch.marketCapHype)} HYPE</div>
        <div className="tabular mt-0.5 text-xs text-[#657456]">{fmtUsd(launch.marketCapUsd)}</div>
      </div>
      <div className="hidden text-right md:block">
        <Delta pct={launch.change24h} />
        <div className="mt-0.5 text-xs text-[#657456]">{fmtNum(launch.holdersCount, 0)} holders</div>
      </div>
      <div className="hidden md:block">
        <div className="mb-2.5 flex items-center justify-between text-[11px] text-[#657858]"><span>Curve</span><span className="tabular text-[#4c7b36]">{launch.progressPct.toFixed(1)}%</span></div>
        <Progress pct={launch.progressPct} accent={launch.accent} height={4} />
      </div>
      <div className="min-w-0 text-right md:hidden">
        <div className="tabular text-xs text-[#4d7b3a]">{fmtPrice(launch.priceHype)} HYPE</div>
        <Delta pct={launch.change24h} className="mt-1 text-[11px]" />
      </div>
    </Link>
  );
}

export function LaunchCard({ launch }: { launch: LaunchSummary }) {
  return (
    <Link href={`/token/${launch.slug}`} className="surface block p-5 transition hover:border-[#b8d0a7]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><TokenGlyph glyph={launch.glyph} accent={launch.accent} size={40} /><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#395b2c]">{launch.name}</h3><div className="font-mono text-xs text-[#647359]">${launch.symbol}</div></div></div>
        <Badge tone={stageTone[launch.stage] ?? "slate"}>{stageText[launch.stage] ?? launch.stage}</Badge>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div><div className="text-[11px] text-[#657458]">Price · HYPE</div><div className="tabular mt-1 text-lg font-semibold tracking-tight text-[#3d632d]">{fmtPrice(launch.priceHype)}</div></div>
        <Delta pct={launch.change24h} className="pb-1 text-xs" />
      </div>
      <div className="mt-5"><div className="mb-2 flex items-center justify-between text-[11px] text-[#647453]"><span>Curve progress</span><span className="tabular">{launch.progressPct.toFixed(1)}%</span></div><Progress pct={launch.progressPct} accent={launch.accent} /></div>
      <div className="tabular mt-5 flex items-center justify-between border-t border-[#e4ecd9] pt-3 text-[11px] text-[#647558]"><span>Mcap {fmtCompact(launch.marketCapHype)} HYPE</span><span>{fmtNum(launch.holdersCount, 0)} holders</span></div>
    </Link>
  );
}
