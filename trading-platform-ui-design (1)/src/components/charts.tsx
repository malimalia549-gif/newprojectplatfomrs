import { useMemo, useState } from "react";
import type { Candle } from "../lib/data";

const C = {
  up: "#3edc99",
  down: "#ff5f56",
  accent: "#d9ff4d",
  dim: "#8b9299",
  grid: "#151a1e",
  ink: "#07090b",
};

/* ── sparkline ─────────────────────────────────────────────── */
export function path(vals: number[], w: number, h: number, pad = 1) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  w = 96,
  h = 26,
  up,
  className = "",
}: {
  values: number[];
  w?: number;
  h?: number;
  up?: boolean;
  className?: string;
}) {
  const color = up === undefined ? C.dim : up ? C.up : C.down;
  const d = path(values, w, h, 2);
  const id = `sp${Math.round(values[0] * 1000)}${w}${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── candlestick chart with crosshair ──────────────────────── */
export function CandleChart({ data, height = 320 }: { data: Candle[]; height?: number }) {
  const W = 900;
  const H = height;
  const padB = 46;
  const [hover, setHover] = useState<number | null>(null);

  const { min, max, volMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let vm = 0;
    data.forEach((d) => {
      lo = Math.min(lo, d.l);
      hi = Math.max(hi, d.h);
      vm = Math.max(vm, d.v);
    });
    return { min: lo, max: hi, volMax: vm };
  }, [data]);

  const span = max - min || 1;
  const y = (p: number) => 12 + (1 - (p - min) / span) * (H - padB - 24);
  const bw = (W - 8) / data.length;
  const c = hover != null ? data[hover] : data[data.length - 1];
  const last = data[data.length - 1];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        style={{ height }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          const i = Math.max(0, Math.min(data.length - 1, Math.floor(x / bw)));
          setHover(i);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0.2, 0.4, 0.6, 0.8].map((g) => (
          <line key={g} x1="0" x2={W} y1={12 + g * (H - padB - 12)} y2={12 + g * (H - padB - 12)} stroke={C.grid} strokeWidth="1" />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={(i * W) / 6} x2={(i * W) / 6} y1="8" y2={H - padB} stroke={C.grid} strokeWidth="1" />
        ))}

        {/* volume */}
        {data.map((d, i) => (
          <rect
            key={`v${i}`}
            x={i * bw + bw * 0.2}
            y={H - padB + 10 + (1 - d.v / volMax) * 26}
            rx={1.5}
            width={bw * 0.6}
            height={(d.v / volMax) * 26}
            fill={d.c >= d.o ? "rgba(62,220,153,.2)" : "rgba(255,95,86,.2)"}
          />
        ))}

        {/* candles */}
        {data.map((d, i) => {
          const up = d.c >= d.o;
          const col = up ? C.up : C.down;
          const x = i * bw + bw / 2;
          const top = y(Math.max(d.o, d.c));
          const bot = y(Math.min(d.o, d.c));
          return (
            <g key={i} opacity={hover == null || hover === i ? 1 : 0.6}>
              <line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={col} strokeWidth="1" />
              <rect
                x={x - bw * 0.3}
                y={top}
                rx={1}
                width={bw * 0.6}
                height={Math.max(1.2, bot - top)}
                fill={col}
                opacity={up ? 0.92 : 0.92}
              />
            </g>
          );
        })}

        {/* last price */}
        <line x1="0" x2={W} y1={y(last.c)} y2={y(last.c)} stroke={C.accent} strokeWidth="1" strokeDasharray="5 5" opacity="0.7" />

        {hover != null && (
          <g>
            <line x1={hover * bw + bw / 2} x2={hover * bw + bw / 2} y1="8" y2={H - padB} stroke="#e9ecef" strokeWidth="1" opacity="0.24" />
            <line x1="0" x2={W} y1={y(c.c)} y2={y(c.c)} stroke="#e9ecef" strokeWidth="1" opacity="0.24" />
            <circle cx={hover * bw + bw / 2} cy={y(c.c)} r="3.5" fill={C.accent} stroke={C.ink} strokeWidth="1.5" />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute left-3 top-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="micro text-dim">{hover != null ? `BAR ${String(hover + 1).padStart(2, "0")}` : "TERAKHIR"}</span>
        {(
          [
            ["O", c.o],
            ["H", c.h],
            ["L", c.l],
            ["C", c.c],
          ] as [string, number][]
        ).map(([k, v]) => (
          <span key={k} className="tnum font-mono text-[11px] text-dim">
            {k} <span className="text-bone">{v.toFixed(v > 1 ? 2 : 6)}</span>
          </span>
        ))}
        <span className="tnum font-mono text-[11px] text-dim">
          VOL <span className="text-bone">{c.v.toFixed(0)}</span>
        </span>
      </div>
    </div>
  );
}

/* ── mirrored depth chart ──────────────────────────────────── */
export function DepthChart({ bids, asks, height = 150 }: { bids: number[]; asks: number[]; height?: number }) {
  const W = 400;
  const H = height;
  const cum = (a: number[]) => {
    let s = 0;
    return a.map((v) => (s += v));
  };
  const bc = cum(bids);
  const ac = cum(asks);
  const max = Math.max(bc.at(-1) ?? 1, ac.at(-1) ?? 1);
  const py = (v: number) => H - 6 - (v / max) * (H - 18);

  const bidD =
    `M${W / 2},${H - 6} ` +
    bc.map((v, i) => `L${W / 2 - ((i + 1) / bc.length) * (W / 2 - 2)},${py(v)}`).join(" ") +
    ` L0,${H - 6} Z`;
  const askD =
    `M${W / 2},${H - 6} ` +
    ac.map((v, i) => `L${W / 2 + ((i + 1) / ac.length) * (W / 2 - 2)},${py(v)}`).join(" ") +
    ` L${W},${H - 6} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id="dfb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.up} stopOpacity="0.28" />
          <stop offset="100%" stopColor={C.up} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="dfa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.down} stopOpacity="0.28" />
          <stop offset="100%" stopColor={C.down} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={bidD} fill="url(#dfb)" stroke={C.up} strokeWidth="1.3" strokeLinejoin="round" />
      <path d={askD} fill="url(#dfa)" stroke={C.down} strokeWidth="1.3" strokeLinejoin="round" />
      <line x1={W / 2} x2={W / 2} y1="4" y2={H - 6} stroke={C.accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
    </svg>
  );
}

/* ── equity curve ──────────────────────────────────────────── */
export function AreaCurve({ values, height = 120 }: { values: number[]; height?: number }) {
  const W = 600;
  const H = height;
  const d = path(values, W, H, 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.32" />
          <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={g * H} y2={g * H} stroke={C.grid} strokeWidth="1" />
      ))}
      <path d={`${d} L${W},${H} L0,${H} Z`} fill="url(#eq)" />
      <path d={d} fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── funding heat cell ─────────────────────────────────────── */
export function HeatCell({ v, label }: { v: number; label: string }) {
  const a = Math.min(1, Math.abs(v) / 0.02);
  const bg = v >= 0 ? `rgba(62,220,153,${0.1 + a * 0.42})` : `rgba(255,95,86,${0.1 + a * 0.42})`;
  return (
    <div
      className="group relative flex h-[46px] flex-col items-center justify-center rounded-md transition-transform duration-200 hover:scale-[1.07]"
      style={{ background: bg }}
      title={`${label} · ${(v * 100).toFixed(4)}%`}
    >
      <span className="tnum font-mono text-[10px] text-bone">{(v * 100).toFixed(3)}</span>
      <span className="pointer-events-none absolute -top-7 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-ink px-2 py-1 font-mono text-[10px] text-bone group-hover:block">
        {label}
      </span>
    </div>
  );
}
