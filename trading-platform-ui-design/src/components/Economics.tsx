import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { fmtCompact, fmtUsd } from "@/lib/sim";
import { Chip, Icon, Reveal, SectionHead } from "./primitives";

function useSmooth(target: number, dur = 700) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const from = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * e;
      cur.current = val;
      setV(val);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

const SPLIT = [
  { k: "Builder (kamu)", pct: 62, c: "#3fdca5" },
  { k: "Validator stakers", pct: 21, c: "#e6a52c" },
  { k: "Insurance fund", pct: 11, c: "#86c5ff" },
  { k: "LP vault", pct: 6, c: "#ff8579" },
];

const ROWS: [string, React.ReactNode, React.ReactNode][] = [
  ["Umur market setelah graduasi", "Momentum biasanya turun", "Venue kedua terbuka: perp 24/7"],
  ["Posisi short", false, "Sampai 20x dengan margin cross"],
  ["Pendapatan builder", "Sekali, dari fee kurva", "Berulang, dari taker fee harian"],
  ["Akses listing perp", "Tidak tersedia", "Tanpa izin, lewat lelang ticker"],
  ["Likuiditas", "AMM pool saja", "AMM + CLOB on-chain HyperCore"],
  ["Harga acuan perp", "Tidak ada", "TWAP 30m + 2 feed eksternal"],
  ["Finalitas order", "12 detik (L1)", "< 0,4 detik"],
  ["Aset yang bisa dilisting", "Token ERC-20", "Apa pun dengan oracle valid"],
];

export function Economics() {
  const [fee, setFee] = useState(0.35);
  const [vol, setVol] = useState(2_400_000);
  const [markets, setMarkets] = useState(2);

  const taker = vol * 0.72;
  const monthly = useSmooth(taker * (fee / 100) * 30 * markets);
  const yearly = monthly * 12;
  const curveFee = useSmooth(markets * 18_400);

  return (
    <section id="ekonomi" className="relative border-t border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <SectionHead
          kicker="06 · ekonomi builder"
          title={
            <>
              Hitung sendiri
              <br />
              <span className="text-mint-400">arus fee-mu.</span>
            </>
          }
          lede="Geser tiga parameter ini untuk melihat proyeksi pendapatan builder dari market HIP-3 milikmu. Angka dihitung dari porsi taker fill, bukan dari volume total."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* calculator */}
          <Reveal className="panel rounded-[14px] p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="eyebrow">kalkulator builder fee</span>
              <Chip tone="mint">live</Chip>
            </div>

            <div className="mt-7 space-y-7">
              {[
                {
                  label: "Builder fee share",
                  val: `${fee.toFixed(2)}%`,
                  min: 0.1,
                  max: 1.5,
                  step: 0.05,
                  v: fee,
                  set: setFee,
                  hint: "dipotong dari tiap taker fill",
                },
                {
                  label: "Volume harian per market",
                  val: fmtCompact(vol),
                  min: 100_000,
                  max: 25_000_000,
                  step: 100_000,
                  v: vol,
                  set: setVol,
                  hint: "median market HIP-3: $2,4M",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-end justify-between gap-4">
                    <label className="text-[13.5px] font-medium text-paper">{s.label}</label>
                    <span className="font-display text-[21px] leading-none font-extrabold text-mint-300 tabular">
                      {s.val}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="rng mt-3 w-full"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.v}
                    onChange={(e) => s.set(+e.target.value)}
                    style={{ ["--pct" as string]: `${((s.v - s.min) / (s.max - s.min)) * 100}%` }}
                  />
                  <div className="mt-2 font-mono text-[10.5px] text-faint">{s.hint}</div>
                </div>
              ))}

              <div>
                <div className="flex items-end justify-between gap-4">
                  <label className="text-[13.5px] font-medium text-paper">Jumlah market aktif</label>
                  <span className="font-display text-[21px] leading-none font-extrabold text-mint-300 tabular">
                    {markets}
                  </span>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {[1, 2, 3, 4, 6, 8].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarkets(m)}
                      className={cn(
                        "h-9 flex-1 cursor-pointer rounded-[7px] border font-mono text-[12px] transition-all hover:-translate-y-px",
                        markets === m
                          ? "border-mint-500/70 bg-mint-500/12 text-mint-300"
                          : "border-line text-faint hover:border-ink-500 hover:text-muted"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[12px] border border-mint-600/40 bg-mint-500/[0.06] p-5">
              <div className="font-mono text-[10px] tracking-[0.18em] text-mint-500 uppercase">
                proyeksi pendapatan builder / bulan
              </div>
              <div className="mt-2 font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none font-extrabold tracking-[-0.05em] text-paper tabular">
                ${fmtUsd(monthly, 0)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-muted">
                <span>
                  ≈ <span className="text-mint-400 tabular">${fmtUsd(yearly, 0)}</span> / tahun
                </span>
                <span>
                  taker volume{" "}
                  <span className="text-paper tabular">{fmtCompact(taker * markets)}</span> / hari
                </span>
                <span>
                  fee kurva spot{" "}
                  <span className="text-gold-300 tabular">${fmtUsd(curveFee, 0)}</span> / market
                </span>
              </div>
            </div>

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
              * Simulasi indikatif. Volume nyata bergantung pada volatilitas ticker dan kedalaman
              orderbook.
            </p>
          </Reveal>

          {/* split + table */}
          <div className="flex flex-col gap-4">
            <Reveal delay={80} className="panel rounded-[14px] p-5 sm:p-6">
              <div className="eyebrow mb-4">Distribusi fee market HIP-3</div>
              <div className="flex h-3 overflow-hidden rounded-full border border-line">
                {SPLIT.map((s) => (
                  <div
                    key={s.k}
                    className="h-full transition-all duration-500 hover:brightness-125"
                    style={{ width: `${s.pct}%`, background: s.c }}
                    title={`${s.k} · ${s.pct}%`}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {SPLIT.map((s) => (
                  <div key={s.k} className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: s.c }} />
                    <span className="text-[12px] text-muted">{s.k}</span>
                    <span className="ml-auto font-mono text-[12px] text-paper tabular">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={140} className="panel overflow-hidden rounded-[14px]">
              <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-line bg-ink-850/70 font-mono text-[9.5px] tracking-[0.16em] uppercase">
                <span className="px-4 py-3 text-faint">Aspek</span>
                <span className="px-4 py-3 text-faint">Launchpad biasa</span>
                <span className="px-4 py-3 text-mint-400">Tickerforge</span>
              </div>
              {ROWS.map(([k, a, b], i) => (
                <div
                  key={k}
                  className={cn(
                    "grid grid-cols-[1.1fr_1fr_1fr] items-center border-b border-line/55 transition-colors last:border-0 hover:bg-white/[0.025]",
                    i % 2 ? "bg-ink-900/40" : "bg-transparent"
                  )}
                >
                  <span className="px-4 py-3 text-[12px] font-medium text-paper">{k}</span>
                  <span className="flex items-start gap-2 px-4 py-3 text-[11.5px] leading-snug text-faint">
                    {a === false ? (
                      <Icon.Cross className="mt-[2px] h-3.5 w-3.5 shrink-0 text-coral-500" />
                    ) : null}
                    {a === false ? "Tidak ada" : a}
                  </span>
                  <span className="flex items-start gap-2 px-4 py-3 text-[11.5px] leading-snug text-muted">
                    <Icon.Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-mint-500" />
                    {b}
                  </span>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Economics;
