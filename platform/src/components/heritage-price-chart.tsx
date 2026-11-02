"use client";

import { useEffect, useMemo, useRef, useState } from "react";
export type OHLC = { t: number; o: number; h: number; l: number; c: number; v: number };

const UP = "#16864e";
const DN = "#c64c60";
const GRID = "rgba(23,47,35,0.09)";
const MONO = { fontFamily: "var(--font-mono)" };

function niceStep(raw: number) {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * 10 ** exp;
}
function yTicks(lo: number, hi: number, count: number) {
  const step = niceStep((hi - lo) / Math.max(1, count));
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

/* Grafik candle berbasis piksel nyata (ResizeObserver) — teks tidak pernah melar */
export function PriceChart({
  data,
  height,
  interval = "15m",
  fmtPrice,
  compact = false,
  loading = false,
  label = "Grafik candlestick mark sandbox",
  loadingLabel = "Menyiapkan candle sandbox…",
}: {
  data: OHLC[];
  height?: number;
  interval?: string;
  fmtPrice: (p: number) => string;
  compact?: boolean;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: height ?? 0 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: height ?? el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const { w, h } = size;
  const AX = compact ? 0 : 68;
  const BX = compact ? 0 : 22;
  const pw = Math.max(40, w - AX);
  const ph = Math.max(60, h - BX);
  const volH = compact ? 0 : Math.round(ph * 0.15);
  const top = compact ? 8 : 14;
  const priceH = ph - volH - top - 6;

  const v = useMemo(() => {
    if (!data.length) return null;
    let lo = Infinity;
    let hi = -Infinity;
    let vm = 0;
    for (const d of data) {
      if (d.l < lo) lo = d.l;
      if (d.h > hi) hi = d.h;
      if (d.v > vm) vm = d.v;
    }
    const pad = (hi - lo) * 0.08 || hi * 0.002 || 1;
    return { lo: lo - pad, hi: hi + pad, vm: vm || 1 };
  }, [data]);

  const n = data.length;
  const bw = pw / Math.max(1, n);
  const y = (p: number) => (v ? top + (1 - (p - v.lo) / (v.hi - v.lo)) * priceH : 0);
  const pFromY = (py: number) => (v ? v.lo + (1 - (py - top) / priceH) * (v.hi - v.lo) : 0);
  const idx = hover ? Math.max(0, Math.min(n - 1, Math.floor(hover.x / bw))) : n - 1;
  const cur = n ? data[idx] : undefined;
  const last = n ? data[n - 1] : undefined;
  const ticksY = v ? yTicks(v.lo, v.hi, compact ? 3 : Math.max(3, Math.floor(priceH / 64))) : [];
  const tc = Math.max(2, Math.floor(pw / 130));
  const ticksX = n ? Array.from({ length: tc }, (_, i) => Math.floor(((i + 0.5) * n) / tc)) : [];

  const fmtT = (t: number) => {
    const d = new Date(t);
    const day = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    const hm = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (interval === "1d" || interval === "4h") return day;
    if (interval === "1h") return `${day} ${hm}`;
    return hm;
  };

  const chg = cur ? ((cur.c - cur.o) / cur.o) * 100 : 0;
  const lastUp = last ? last.c >= last.o : true;

  return (
    <div ref={box} className="relative w-full select-none" style={{ height: height ?? "100%" }}>
      {!v || !w || !last ? (
        <div className="grid h-full place-items-center">
          {loading || !n ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-end gap-1.5">
                {[18, 30, 22, 40, 28, 46, 34].map((hh, i) => (
                  <span key={i} className="skeleton w-2 rounded-sm" style={{ height: hh }} />
                ))}
              </div>
              <span className="text-[12px] text-[#637569]">{loading ? loadingLabel : "Belum ada data candle"}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <svg
            width={w}
            height={h}
            className="block"
            role="img"
            aria-label={label}
            onMouseMove={(e) => {
              if (compact) return;
              const r = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - r.left;
              const yy = e.clientY - r.top;
              setHover(x > pw ? null : { x, y: yy });
            }}
            onMouseLeave={() => setHover(null)}
          >
            {ticksY.map((t) => (
              <line key={`gy${t}`} x1={0} x2={pw} y1={y(t)} y2={y(t)} stroke={GRID} />
            ))}
            {!compact &&
              ticksX.map((i) => (
                <line key={`gx${i}`} x1={i * bw + bw / 2} x2={i * bw + bw / 2} y1={top} y2={ph} stroke="rgba(23,47,35,0.04)" />
              ))}

            {!compact &&
              data.map((d, i) => {
                const hh = (d.v / v.vm) * (volH - 4);
                return (
                  <rect
                    key={`v${i}`}
                    x={i * bw + bw * 0.16}
                    y={ph - hh}
                    width={Math.max(1, bw * 0.68)}
                    height={hh}
                    fill={d.c >= d.o ? "rgba(22,134,78,.16)" : "rgba(198,76,96,.16)"}
                  />
                );
              })}

            {data.map((d, i) => {
              const up = d.c >= d.o;
              const x = i * bw + bw / 2;
              const yo = y(d.o);
              const yc = y(d.c);
              const bwid = Math.max(1, bw * 0.64);
              return (
                <g key={i} opacity={hover && i !== idx ? 0.75 : 1}>
                  <line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={up ? UP : DN} strokeWidth={1} />
                  <rect
                    x={x - bwid / 2}
                    y={Math.min(yo, yc)}
                    width={bwid}
                    height={Math.max(1, Math.abs(yc - yo))}
                    fill={up ? UP : DN}
                    rx={bwid > 4 ? 1 : 0}
                  />
                </g>
              );
            })}

            <line x1={0} x2={pw} y1={y(last.c)} y2={y(last.c)} stroke={lastUp ? UP : DN} strokeDasharray="3 4" strokeOpacity={0.75} />

            {hover && cur && !compact && (
              <g pointerEvents="none">
                <line x1={idx * bw + bw / 2} x2={idx * bw + bw / 2} y1={top} y2={ph} stroke="rgba(23,47,35,.35)" strokeDasharray="3 3" />
                <line x1={0} x2={pw} y1={hover.y} y2={hover.y} stroke="rgba(23,47,35,.35)" strokeDasharray="3 3" />
              </g>
            )}

            {!compact && (
              <g>
                <line x1={pw} x2={pw} y1={0} y2={ph} stroke="rgba(23,47,35,0.12)" />
                <line x1={0} x2={pw} y1={ph} y2={ph} stroke="rgba(23,47,35,0.12)" />
                {ticksY.filter((t) => Math.abs(y(t) - y(last.c)) > 13 && !(hover && Math.abs(y(t) - hover.y) < 13)).map((t) => (
                  <text key={`ty${t}`} x={pw + 8} y={y(t) + 3.5} fontSize={10.5} fill="#637569" style={MONO}>
                    {fmtPrice(t)}
                  </text>
                ))}
                {ticksX.map((i) =>
                  data[i] ? (
                    <text key={`tx${i}`} x={i * bw + bw / 2} y={h - 7} fontSize={10.5} fill="#637569" textAnchor="middle" style={MONO}>
                      {fmtT(data[i].t)}
                    </text>
                  ) : null,
                )}
                <rect x={pw + 3} y={y(last.c) - 9} width={AX - 6} height={18} rx={4} fill={lastUp ? UP : DN} />
                <text x={pw + 8} y={y(last.c) + 3.5} fontSize={10.5} fontWeight={600} fill="#ffffff" style={MONO}>
                  {fmtPrice(last.c)}
                </text>
                {hover && hover.y > top && hover.y < top + priceH && (
                  <g pointerEvents="none">
                    <rect x={pw + 3} y={hover.y - 9} width={AX - 6} height={18} rx={4} fill="#172f23" />
                    <text x={pw + 8} y={hover.y + 3.5} fontSize={10.5} fill="#f8faf6" style={MONO}>
                      {fmtPrice(pFromY(hover.y))}
                    </text>
                  </g>
                )}
                {hover && cur && (
                  <g pointerEvents="none">
                    <rect x={Math.min(pw - 92, Math.max(0, idx * bw + bw / 2 - 46))} y={ph + 2} width={92} height={18} rx={4} fill="#172f23" />
                    <text
                      x={Math.min(pw - 46, Math.max(46, idx * bw + bw / 2))}
                      y={ph + 14.5}
                      fontSize={10.5}
                      fill="#f8faf6"
                      textAnchor="middle"
                      style={MONO}
                    >
                      {fmtT(cur.t)}
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>

          {!compact && cur && (
            <div className="pointer-events-none absolute left-3 top-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-[#637569]">
              <span>
                O <span className="text-[#172f23]">{fmtPrice(cur.o)}</span>
              </span>
              <span>
                H <span className="text-[#172f23]">{fmtPrice(cur.h)}</span>
              </span>
              <span>
                L <span className="text-[#172f23]">{fmtPrice(cur.l)}</span>
              </span>
              <span>
                C <span className="text-[#172f23]">{fmtPrice(cur.c)}</span>
              </span>
              <span className={chg >= 0 ? "text-up" : "text-down"}>
                {chg >= 0 ? "+" : "−"}
                {Math.abs(chg).toFixed(2).replace(".", ",")}%
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
