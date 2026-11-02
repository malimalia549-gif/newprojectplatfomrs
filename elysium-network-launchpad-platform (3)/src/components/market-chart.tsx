"use client";

import { useId, useMemo, useState } from "react";
import { fmtNum, fmtPrice, fmtUsd } from "@/lib/util";

type Props = { data: number[]; symbol: string; height?: number };

/** A deliberately small, accessible, responsive chart for a real API sample history. */
export function MarketChart({ data, symbol, height = 216 }: Props) {
  const [range, setRange] = useState("all");
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const samples = useMemo(() => {
    if (range === "1m") return data.slice(-24);
    if (range === "4m") return data.slice(-92);
    return data;
  }, [range, data]);

  const W = 640;
  const H = 234;
  const PL = 8, PR = 66, PT = 18, PB = 28;
  const width = W - PL - PR, h = H - PT - PB;
  const lo = Math.min(...samples, samples[0] ?? 0), hi = Math.max(...samples, samples[0] ?? 0);
  const d = hi - lo || Math.max(hi * 0.02, 1e-9);
  const min = Math.max(0, lo - d * 0.12), max = hi + d * 0.12;
  const x = (i: number) => PL + (i / Math.max(samples.length - 1, 1)) * width;
  const y = (v: number) => PT + (1 - (v - min) / (max - min)) * h;
  const points = samples.map((v, i) => [x(i), y(v)]);
  const line = points.map(([a, b], i) => `${i === 0 ? "M" : "L"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const fill = `${line} L${PL + width},${PT + h} L${PL},${PT + h} Z`;
  const last = samples[samples.length - 1] ?? 0;
  const selected = hover === null ? null : samples[hover];
  const px = (v: number) => {
    if (!Number.isFinite(v) || v === 0) return "$0.00";
    if (v >= 100) return `$${fmtNum(v, 2)}`;
    if (v >= 1) return `$${fmtNum(v, 4)}`;
    if (v >= 0.001) return `$${v.toFixed(5)}`;
    return `$${fmtPrice(v)}`;
  };

  return (
    <div className="price-chart">
      <div className="chart-legend mb-2">
        <span><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#73a74c]" />{symbol} · mark history</span>
        <div className="chart-controls" role="group" aria-label="Chart range">{[{ id: "1m", label: "1m" }, { id: "4m", label: "4m" }, { id: "all", label: "All" }].map((v) => <button type="button" key={v.id} className="chart-control" data-active={range === v.id} onClick={() => { setRange(v.id); setHover(null); }}>{v.label}</button>)}</div>
      </div>
      {samples.length < 2 ? <div style={{ height }} className="grid place-items-center text-xs text-[#68755b]">Awaiting market prints</div> : (
        <div className="relative">
          <div className="chart-caption mb-2"><span className="chart-crosshair-value">{selected == null ? px(last) : px(selected)}</span><span className="ml-2">{selected == null ? "Latest" : `Tick ${hover! + 1} / ${samples.length}`}</span></div>
          <svg className="chart-canvas" viewBox={`0 0 ${W} ${H}`} style={{ height }} role="img" aria-label={`${symbol} live sample price history from ${fmtUsd(samples[0] ?? 0)} to ${fmtUsd(last)}`}
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const p = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(samples.length - 1, Math.round(((p - PL) / width) * (samples.length - 1))))); }}
            onMouseLeave={() => setHover(null)}>
            <defs><linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8cb567" stopOpacity=".18" /><stop offset="100%" stopColor="#8cb567" stopOpacity="0" /></linearGradient></defs>
            {Array.from({ length: 5 }, (_, i) => { const value = max - ((max - min) * i) / 4; return <g key={i}><line className="grid-line" x1={PL} x2={PL + width} y1={y(value)} y2={y(value)} /><text x={PL + width + 10} y={y(value) + 3}>{px(value).slice(1)}</text></g>; })}
            {Array.from({ length: 5 }, (_, i) => { const xx = PL + (width * i) / 4; const ticks = Math.round(((4 - i) / 4) * samples.length * 2.6); return <g key={i}><line className="grid-line" x1={xx} x2={xx} y1={PT} y2={PT + h} /><text x={xx} y={H - 5} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>{i === 4 ? "Now" : ticks >= 60 ? `${Math.round(ticks / 60)}m ago` : `${ticks}s ago`}</text></g>; })}
            <path d={fill} fill={`url(#fill-${gid})`} />
            <path className="main-line" d={line} vectorEffect="non-scaling-stroke" />
            {hover !== null && selected != null ? <g><line className="crosshair" x1={x(hover)} x2={x(hover)} y1={PT} y2={PT + h} /><circle cx={x(hover)} cy={y(selected)} r="3" fill="#fff" stroke="#64944d" strokeWidth="1.5" /></g> : null}
            <circle cx={x(samples.length - 1)} cy={y(last)} r="2.5" fill="#64944d" />
          </svg>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between text-[10px] text-[#68755c]"><span>Live data · sampled at 2.6s intervals</span><span>{samples.length} ticks</span></div>
    </div>
  );
}
