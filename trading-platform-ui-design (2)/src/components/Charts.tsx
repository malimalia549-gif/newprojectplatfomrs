import { useMemo, useState, type PointerEvent } from "react";
import { cn } from "@/utils/cn";
import { makeBook, makeCandles, priceFormat, random } from "@/lib/market";

const UP = "#34d399";
const DOWN = "#fb7185";
const GRID = "rgba(148,163,184,0.10)";
const FAINT = "#64748b";

export function Sparkline({ seed, positive, className }: { seed: number; positive: boolean; className?: string }) {
  const path = useMemo(() => {
    const r = random(seed + 187);
    let y = positive ? 31 : 11;
    return Array.from({ length: 27 }, (_, i) => {
      y = Math.max(4, Math.min(38, y + (r() - (positive ? .55 : .45)) * 8));
      return `${i === 0 ? "M" : "L"}${i * 3.84},${y.toFixed(1)}`;
    }).join(" ");
  }, [positive, seed]);
  return (
    <svg viewBox="0 0 100 42" className={cn("h-10 w-[100px] shrink-0", className)} aria-hidden="true">
      <path d={path} fill="none" stroke={positive ? UP : DOWN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PriceChart({
  price,
  seed,
  timeframe,
  className,
}: {
  price: number;
  seed: number;
  timeframe: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 920;
  const H = 350;
  const plotW = 812;
  const chartH = 250;
  const count = 58;
  const data = useMemo(() => makeCandles(price, seed + timeframe.charCodeAt(0) * 13, count), [price, seed, timeframe]);
  const hi = Math.max(...data.map((v) => v.high)) * 1.02;
  const lo = Math.min(...data.map((v) => v.low)) * .98;
  const y = (n: number) => 18 + (1 - (n - lo) / (hi - lo)) * chartH;
  const dx = plotW / count;
  const hovered = hover == null ? null : data[hover];

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    setHover(x > plotW ? null : Math.max(0, Math.min(count - 1, Math.floor(x / dx))));
  };

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <div className="pointer-events-none absolute top-3 left-4 z-10 flex flex-wrap items-center gap-3 font-mono text-[10px] text-faint">
        <span className="font-semibold text-muted">O <span className="text-text">{priceFormat(hovered?.open ?? data[count - 1].open)}</span></span>
        <span>H <span className="text-up">{priceFormat(hovered?.high ?? data[count - 1].high)}</span></span>
        <span>L <span className="text-down">{priceFormat(hovered?.low ?? data[count - 1].low)}</span></span>
        <span>C <span className="text-text">{priceFormat(hovered?.close ?? price)}</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full min-h-[260px] w-full" preserveAspectRatio="none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Grafik harga simulasi candlestick">
        <defs>
          <linearGradient id="mark-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => {
          const gy = 23 + i * 59;
          const label = hi - ((gy - 18) / chartH) * (hi - lo);
          return (
            <g key={i}>
              <line x1="0" x2={W} y1={gy} y2={gy} stroke={GRID} strokeWidth="1" strokeDasharray="3 5" />
              <text x="833" y={gy - 5} fill={FAINT} fontSize="10" fontFamily="JetBrains Mono, monospace">{priceFormat(label)}</text>
            </g>
          );
        })}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={i * (plotW / 5)} x2={i * (plotW / 5)} y1="0" y2={H} stroke={GRID} strokeWidth="1" />
        ))}
        <line x1="0" x2={W} y1="284" y2="284" stroke="rgba(148,163,184,0.16)" strokeWidth="1" />

        {data.map((c, i) => {
          const x = i * dx + dx / 2;
          const up = c.close >= c.open;
          const color = up ? UP : DOWN;
          const top = Math.min(y(c.open), y(c.close));
          return (
            <g key={i} opacity={i < 4 ? .44 + i * .12 : 1}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.4" />
              <rect x={x - dx * .29} y={top} width={dx * .58} height={Math.max(2, Math.abs(y(c.open) - y(c.close)))} fill={color} />
              <rect x={x - dx * .29} y={330 - c.volume * 37} width={dx * .58} height={c.volume * 37} fill={color} opacity=".22" />
            </g>
          );
        })}

        <line x1="0" x2={plotW} y1={y(price)} y2={y(price)} stroke="url(#mark-g)" strokeDasharray="4 5" opacity=".85" />
        <rect x="820" y={Math.max(32, Math.min(250, y(price) - 11))} width="100" height="22" rx="6" fill="url(#mark-g)" />
        <text x="828" y={Math.max(47, Math.min(265, y(price) + 4))} fill="#05070a" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">{priceFormat(price)}</text>

        {hover != null && (
          <g pointerEvents="none">
            <line x1={hover * dx + dx / 2} x2={hover * dx + dx / 2} y1="0" y2={H} stroke="#94a3b8" opacity=".45" strokeDasharray="4 4" />
            <rect x={Math.max(5, Math.min(plotW - 56, hover * dx - 23))} y="326" width="57" height="18" rx="5" fill="#1b2430" />
            <text x={Math.max(9, Math.min(plotW - 52, hover * dx - 19))} y="338" fill="#eef2f6" fontSize="9" fontFamily="JetBrains Mono, monospace">-{count - hover} hrs</text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function OrderBook({ price, seed }: { price: number; seed: number }) {
  const { asks, bids } = useMemo(() => makeBook(price, seed, 9), [price, seed]);
  const row = (item: { price: number; size: number; depth: number }, side: "ask" | "bid", index: number) => (
    <div key={`${side}-${index}`} className="relative flex h-[26px] items-center justify-between px-4 font-mono text-[11px]">
      <span className={cn("absolute inset-y-0 right-0 opacity-[0.08]", side === "ask" ? "bg-down" : "bg-up")} style={{ width: `${item.depth}%` }} />
      <span className={cn("relative nums", side === "ask" ? "text-down" : "text-up")}>{priceFormat(item.price).slice(1)}</span>
      <span className="relative nums text-muted">{item.size.toFixed(2)}</span>
    </div>
  );
  return (
    <div className="flex h-full min-h-[560px] flex-col border-l border-line-soft bg-base-2">
      <div className="flex h-[47px] items-center justify-between border-b border-line-soft px-4">
        <span className="text-[12px] font-bold text-text">Orderbook</span>
        <span className="micro text-faint">Demo</span>
      </div>
      <div className="flex justify-between px-4 py-2.5 font-mono text-[10px] text-faint">
        <span>Harga (USD)</span><span>Jumlah</span>
      </div>
      <div className="mt-auto">{asks.slice().reverse().map((item, i) => row(item, "ask", i))}</div>
      <div className="flex items-center justify-between border-y border-line-soft bg-surface px-4 py-3">
        <span className="nums font-mono text-[15px] font-semibold text-text">{priceFormat(price)}</span>
        <span className="font-mono text-[10px] text-faint">Mark</span>
      </div>
      <div className="mb-auto">{bids.map((item, i) => row(item, "bid", i))}</div>
      <div className="border-t border-line-soft px-4 py-3 font-mono text-[10px] text-faint">Spread estimasi · Data simulasi</div>
    </div>
  );
}

export function HeroMarketVisual() {
  const candles = useMemo(() => makeCandles(1.18, 271, 64), []);
  const max = Math.max(...candles.map((c) => c.high));
  const min = Math.min(...candles.map((c) => c.low));
  const plotX = 410;
  const plotW = 1060;
  const plotTop = 100;
  const plotH = 440;
  const dx = plotW / candles.length;
  const y = (n: number) => plotTop + (1 - (n - min) / (max - min)) * plotH;
  const line = candles.map((c, i) => `${i === 0 ? "M" : "L"}${plotX + i * dx + dx / 2},${y(c.close)}`).join(" ");

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="hero-grid absolute inset-0 opacity-70" />
      <svg viewBox="0 0 1500 690" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="heroFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8b7cf6" stopOpacity=".20" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <line x1="0" x2="1500" y1={114 + i * 100} y2={114 + i * 100} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 7" />
            <text x="1430" y={108 + i * 100} fill="#64748b" fillOpacity=".55" fontSize="11" fontFamily="JetBrains Mono, monospace">{(1.46 - i * .13).toFixed(3)}</text>
          </g>
        ))}
        {candles.map((c, i) => {
          const x = plotX + i * dx + dx / 2;
          const up = c.close >= c.open;
          const color = up ? "#67e8f9" : "#fda4af";
          return (
            <g key={i} opacity={.26 + i / candles.length * .45}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.5" />
              <rect x={x - dx * .28} y={Math.min(y(c.open), y(c.close))} width={dx * .56} height={Math.max(2, Math.abs(y(c.open) - y(c.close)))} fill={color} />
              <rect x={x - dx * .28} y={650 - c.volume * 60} width={dx * .56} height={c.volume * 60} fill={color} opacity=".28" />
            </g>
          );
        })}
        <path d={`${line} L${plotX + plotW},610 L${plotX},610 Z`} fill="url(#heroFade)" opacity=".5" />
        <path d={line} fill="none" stroke="url(#heroStroke)" strokeOpacity=".28" strokeWidth="7" strokeLinejoin="round" />
        <path d={line} fill="none" stroke="url(#heroStroke)" strokeOpacity=".9" strokeWidth="1.6" className="chart-draw" strokeLinejoin="round" />
        <line x1="0" x2="1500" y1={y(candles[candles.length - 1].close)} y2={y(candles[candles.length - 1].close)} stroke="#a78bfa" strokeOpacity=".3" strokeDasharray="5 6" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-base via-base/90 via-[38%] to-base/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-base/40" />
    </div>
  );
}
