import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { MARKETS, fmtCompact, fmtPrice, mulberry, sparkPath, type MarketKind } from "@/lib/sim";
import { Chip, Eyebrow, Icon, Reveal, SectionHead, useCountUp, useInView } from "./primitives";

/* ------------------------------------------------------------- stats band */

const STATS = [
  { v: 412.8, d: 1, pre: "$", suf: "M", k: "Volume 24 jam", note: "semua market HIP-3" },
  { v: 37, d: 0, pre: "", suf: "", k: "Market live", note: "12 di antaranya builder" },
  { v: 86.4, d: 1, pre: "$", suf: "M", k: "TVL terjembatani", note: "Uniswap ↔ HyperCore" },
  { v: 3.92, d: 2, pre: "$", suf: "M", k: "Fee dibagikan", note: "ke deployer, harian" },
  { v: 41, d: 0, pre: "", suf: "s", k: "Rata-rata deploy", note: "dari form ke live" },
];

export function StatsBand() {
  const { ref, seen } = useInView<HTMLDivElement>(0.3);
  return (
    <section ref={ref} className="relative border-y border-line bg-ink-900/60">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto grid max-w-[1280px] grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-5">
        {STATS.map((s, i) => (
          <Stat
            key={s.k}
            {...s}
            run={seen}
            delay={i * 110}
            className={i === STATS.length - 1 ? "col-span-2 sm:col-span-1" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function Stat({
  v,
  d,
  pre,
  suf,
  k,
  note,
  run,
  delay,
  className,
}: {
  v: number;
  d: number;
  pre: string;
  suf: string;
  k: string;
  note: string;
  run: boolean;
  delay: number;
  className?: string;
}) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [run, delay]);
  const val = useCountUp(v, go, 1600, d);
  return (
    <div className={cn("group relative bg-ink-900 px-5 py-7 transition-colors duration-400 hover:bg-ink-850 sm:px-6", className)}>
      <span className="absolute top-0 left-0 h-px w-0 bg-mint-500 transition-all duration-500 group-hover:w-full" />
      <div className="font-display text-[clamp(1.7rem,3.4vw,2.5rem)] leading-none font-extrabold tracking-[-0.045em] text-paper tabular">
        {pre}
        {val}
        <span className="text-mint-500">{suf}</span>
      </div>
      <div className="mt-2.5 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{k}</div>
      <div className="mt-1 text-[11.5px] text-faint">{note}</div>
    </div>
  );
}

/* ------------------------------------------------------------- depth chart */

function buildDepth(mid: number, seed: number, levels = 34) {
  const r = mulberry(seed);
  const bids: { px: number; cum: number }[] = [];
  const asks: { px: number; cum: number }[] = [];
  let bc = 0;
  let ac = 0;
  for (let i = 0; i < levels; i++) {
    bc += 0.4 + r() * 6 + i * 0.35;
    ac += 0.4 + r() * 6 + i * 0.35;
    bids.push({ px: mid * (1 - 0.0022 * (i + 1)), cum: bc });
    asks.push({ px: mid * (1 + 0.0022 * (i + 1)), cum: ac });
  }
  return { bids: bids.reverse(), asks, max: Math.max(bc, ac) };
}

function DepthChart({ market }: { market: (typeof MARKETS)[number] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement | null>(null);
  const W = 640;
  const H = 250;
  const seed = Math.floor(market.px * 97) + market.sym.charCodeAt(0);
  const { bids, asks, max } = useMemo(() => buildDepth(market.px, seed), [market.px, market.sym, seed]);

  const lo = bids[0].px;
  const hi = asks[asks.length - 1].px;

  const path = (arr: { px: number; cum: number }[], close: boolean) => {
    const X = (px: number) => ((px - lo) / (hi - lo)) * W;
    const Y = (c: number) => H - (c / max) * (H - 16) - 6;
    let d = "";
    arr.forEach((p, i) => {
      d += `${i === 0 ? "M" : "L"}${X(p.px).toFixed(1)},${Y(p.cum).toFixed(1)} `;
    });
    if (close) {
      const last = arr[arr.length - 1];
      const first = arr[0];
      d += `L${X(last.px).toFixed(1)},${H} L${X(first.px).toFixed(1)},${H} Z`;
    }
    return d;
  };

  const X = (px: number) => ((px - lo) / (hi - lo)) * W;
  const hoverPx = hover !== null ? lo + (hover / W) * (hi - lo) : null;
  const hoverSide = hoverPx !== null ? (hoverPx >= market.px ? "ask" : "bid") : null;
  const hoverCum =
    hoverPx === null
      ? 0
      : hoverSide === "ask"
        ? (asks.find((a) => a.px >= hoverPx) ?? asks[asks.length - 1]).cum
        : (bids.slice().reverse().find((b) => b.px <= hoverPx) ?? bids[0]).cum;

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        onPointerMove={(e) => {
          const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
          setHover(clampX(((e.clientX - rect.left) / rect.width) * W));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="gbid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fdca5" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#3fdca5" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gask" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4594e" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#f4594e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#152228" strokeWidth="1" strokeDasharray="3 5" />
        ))}
        <path d={path(bids, true)} fill="url(#gbid)" />
        <path d={path(bids, false)} fill="none" stroke="#3fdca5" strokeWidth="1.8" />
        <path d={path(asks, true)} fill="url(#gask)" />
        <path d={path(asks, false)} fill="none" stroke="#f4594e" strokeWidth="1.8" />
        <line x1={X(market.px)} x2={X(market.px)} y1="0" y2={H} stroke="#e6a52c" strokeWidth="1" strokeDasharray="4 4" />
        {hover !== null && (
          <g>
            <line x1={hover} x2={hover} y1="0" y2={H} stroke="#86c5ff" strokeWidth="1" opacity="0.7" />
            <circle
              cx={hover}
              cy={H - (hoverCum / max) * (H - 16) - 6}
              r="4"
              fill="#0a1114"
              stroke={hoverSide === "ask" ? "#f4594e" : "#3fdca5"}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute top-2 left-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.14em] uppercase">
        <span className="flex items-center gap-1.5 text-mint-500">
          <span className="h-1.5 w-3 rounded-sm bg-mint-500" /> bid
        </span>
        <span className="flex items-center gap-1.5 text-coral-400">
          <span className="h-1.5 w-3 rounded-sm bg-coral-500" /> ask
        </span>
      </div>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-3 rounded-[8px] border border-ice-500/40 bg-ink-950/95 px-3 py-2 font-mono text-[11px] shadow-xl"
          style={{ left: `${clamp((hover / W) * 100, 4, 72)}%` }}
        >
          <div className="text-faint">harga</div>
          <div className="tabular text-paper">{fmtPrice(hoverPx!)}</div>
          <div className="mt-1 text-faint">kumulatif</div>
          <div className={cn("tabular", hoverSide === "ask" ? "text-coral-400" : "text-mint-400")}>
            {hoverCum.toFixed(1)} {market.sym}
          </div>
        </div>
      )}
    </div>
  );
}
const clampX = (v: number) => Math.max(0, Math.min(640, v));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ----------------------------------------------------------------- section */

const FILTERS: { id: MarketKind | "all"; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "crypto", label: "Crypto" },
  { id: "equity", label: "Ekuitas" },
  { id: "commodity", label: "Komoditas" },
  { id: "builder", label: "Builder market" },
];



export function MarketDepth() {
  const [filter, setFilter] = useState<MarketKind | "all">("all");
  const [sel, setSel] = useState(MARKETS[8]);
  const list = MARKETS.filter((m) => filter === "all" || m.kind === filter);

  return (
    <section id="market" className="relative border-t border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <SectionHead
          kicker="03 · kedalaman pasar"
          title={
            <>
              Orderbook yang sama,
              <br />
              <span className="text-ice-300">untuk ticker buatanmu.</span>
            </>
          }
          lede="Market HIP-3 dicocokkan oleh engine HyperCore yang menangani BTC dan ETH. Tidak ada liquidity provider terpisah yang harus kamu rayu — cukup ticker, oracle, dan deposit."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Reveal className="panel overflow-hidden rounded-[14px]">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] border border-mint-600/50 bg-mint-500/10 font-display text-[12px] font-bold text-mint-300">
                  {sel.sym.slice(0, 2)}
                </span>
                <div>
                  <div className="font-display text-[15px] leading-none font-bold">{sel.sym}-PERP</div>
                  <div className="mt-1 font-mono text-[10px] text-faint">{sel.name}</div>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="font-display text-[20px] font-extrabold text-paper tabular">${fmtPrice(sel.px)}</span>
                <span className={cn("font-mono text-[12px] tabular", sel.chg >= 0 ? "text-mint-400" : "text-coral-400")}>
                  {sel.chg >= 0 ? "+" : ""}
                  {sel.chg.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="px-2 pt-6 pb-2 sm:px-4">
              <DepthChart market={sel} />
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
              {[
                ["Volume 24j", fmtCompact(sel.vol * 1e6)],
                ["Open interest", fmtCompact(sel.vol * 0.42 * 1e6)],
                ["Funding", `${(sel.chg * 0.004).toFixed(4)}%`],
                ["Max leverage", sel.kind === "builder" ? "20x" : "40x"],
              ].map(([k, v]) => (
                <div key={k} className="bg-ink-900 px-4 py-3">
                  <div className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{k}</div>
                  <div className="mt-1 font-display text-[15px] font-bold text-paper tabular">{v}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} className="panel flex flex-col overflow-hidden rounded-[14px]">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-3">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[10.5px] tracking-[0.1em] uppercase transition-all hover:-translate-y-px",
                    filter === f.id
                      ? "border-mint-500/70 bg-mint-500/12 text-mint-300"
                      : "border-line text-faint hover:border-ink-500 hover:text-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="max-h-[520px] flex-1 overflow-y-auto">
              {list.map((m, i) => {
                const isSel = m.sym === sel.sym;
                return (
                  <button
                    key={m.sym}
                    onClick={() => setSel(m)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors",
                      isSel ? "bg-mint-500/[0.07]" : "hover:bg-white/[0.025]"
                    )}
                  >
                    <span className="w-4 font-mono text-[10px] text-faint tabular">{String(i + 1).padStart(2, "0")}</span>
                    <span className="w-[74px] shrink-0">
                      <span className="block font-display text-[14px] leading-none font-bold text-paper">{m.sym}</span>
                      <span className="mt-1 block font-mono text-[9px] tracking-[0.1em] text-faint uppercase">
                        {m.kind === "builder" ? "hip-3" : m.kind}
                      </span>
                    </span>
                    <svg viewBox="0 0 120 34" className="h-8 w-[92px] shrink-0" preserveAspectRatio="none">
                      <path
                        d={sparkPath(Math.floor(m.px * 13) + m.sym.charCodeAt(1), 120, 34, 22)}
                        fill="none"
                        stroke={m.chg >= 0 ? "#3fdca5" : "#f4594e"}
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="ml-auto text-right">
                      <span className="block font-mono text-[12.5px] text-paper tabular">{fmtPrice(m.px)}</span>
                      <span className={cn("mt-0.5 block font-mono text-[10.5px] tabular", m.chg >= 0 ? "text-mint-400" : "text-coral-400")}>
                        {m.chg >= 0 ? "+" : ""}
                        {m.chg.toFixed(2)}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 border-t border-line px-4 py-3">
              <Icon.Bolt className="h-3.5 w-3.5 text-gold-400" />
              <p className="font-mono text-[10.5px] text-faint">
                Klik baris untuk memuat kedalaman orderbook market itu
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80}>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Eyebrow dot={false}>kategori yang bisa di-forge:</Eyebrow>
            <Chip tone="mint">memecoin</Chip>
            <Chip tone="ice">saham tunggal</Chip>
            <Chip tone="gold">komoditas</Chip>
            <Chip tone="neutral">indeks</Chip>
            <Chip tone="neutral">prediksi event</Chip>
            <Chip tone="coral">RWA</Chip>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default MarketDepth;
