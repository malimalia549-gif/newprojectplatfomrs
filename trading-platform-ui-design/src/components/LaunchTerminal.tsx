import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import {
  COLLATERAL,
  SUGGESTED_TICKERS,
  clamp,
  fmtCompact,
  fmtPrice,
  fmtUsd,
  makeBook,
  seedCandles,
  shortAddr,
  txHash,
  type Candle,
} from "@/lib/sim";
import { Btn, Chip, Eyebrow, Icon, SectionHead } from "./primitives";

type Stage = "form" | "deploying" | "trading" | "graduating" | "uniswap" | "reserving" | "perp";

const BASE_PX = 0.42;

type Sim = {
  px: number;
  prev: number;
  progress: number;
  raised: number;
  holders: number;
  candles: Candle[];
  tvl: number;
  oi: number;
  vol24: number;
  funding: number;
  fee: number;
  topBid: number;
};

const initSim = (): Sim => ({
  px: BASE_PX,
  prev: BASE_PX,
  progress: 0,
  raised: 0,
  holders: 1,
  candles: seedCandles(BASE_PX, 36, 17),
  tvl: 0,
  oi: 0,
  vol24: 0,
  funding: 0.0083,
  fee: 0,
  topBid: 12.4,
});

type Fill = { id: number; addr: string; side: "B" | "S"; amt: number; px: number };
const STEPS = [
  { id: "create", label: "Create", stage: "form" },
  { id: "trading", label: "Trading", stage: "trading" },
  { id: "graduate", label: "Graduate → Uniswap", stage: "uniswap" },
  { id: "ticker", label: "Beli Ticker", stage: "reserving" },
  { id: "perp", label: "HIP-3 Perp", stage: "perp" },
];
const ORDER: Stage[] = ["form", "deploying", "trading", "graduating", "uniswap", "reserving", "perp"];

/* ------------------------------------------------------------------ chart */

function CandleChart({ candles, up }: { candles: Candle[]; up: boolean }) {
  const W = 620;
  const H = 168;
  const hi = Math.max(...candles.map((c) => c.h));
  const lo = Math.min(...candles.map((c) => c.l));
  const span = Math.max(hi - lo, 1e-6);
  const bw = W / candles.length;
  const y = (v: number) => H - ((v - lo) / span) * (H - 14) - 7;
  const line = candles.map((c, i) => `${i === 0 ? "M" : "L"}${(i * bw + bw / 2).toFixed(1)},${y(c.c).toFixed(1)}`).join(" ");
  const color = up ? "#3fdca5" : "#f4594e";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[168px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#16242a" strokeWidth="1" />
      ))}
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#cfill)" />
      {candles.map((c, i) => {
        const g = c.c >= c.o;
        const x = i * bw + bw / 2;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={g ? "#2f9d78" : "#b8483f"} strokeWidth="1" />
            <rect
              x={x - bw * 0.3}
              y={Math.min(y(c.o), y(c.c))}
              width={bw * 0.6}
              height={Math.max(1.4, Math.abs(y(c.o) - y(c.c)))}
              fill={g ? "#3fdca5" : "#f4594e"}
              opacity={0.35 + (i / candles.length) * 0.65}
            />
          </g>
        );
      })}
      <circle cx={W - bw / 2} cy={y(candles[candles.length - 1].c)} r="3" fill={color} />
      <circle cx={W - bw / 2} cy={y(candles[candles.length - 1].c)} r="7" fill={color} opacity="0.22" className="blink" />
    </svg>
  );
}

/* --------------------------------------------------------------- orderbook */

function OrderBook({ mid, dense }: { mid: number; dense: boolean }) {
  const { bids, asks } = useMemo(() => makeBook(mid, 0.0018, 8), [mid, dense]);
  const max = Math.max(bids[bids.length - 1].total, asks[asks.length - 1].total);
  const row = (l: (typeof bids)[number], side: "bid" | "ask", i: number) => (
    <div key={`${side}-${i}`} className="relative flex items-center justify-between px-3 py-[5px] font-mono text-[11px]">
      <span
        className={cn(
          "absolute inset-y-0 right-0 transition-[width] duration-500",
          side === "bid" ? "bg-mint-500/12" : "bg-coral-500/12"
        )}
        style={{ width: `${(l.total / max) * 100}%` }}
      />
      <span className={cn("relative tabular", side === "bid" ? "text-mint-400" : "text-coral-400")}>
        {fmtPrice(l.px)}
      </span>
      <span className="relative tabular text-muted">{l.size.toFixed(2)}</span>
    </div>
  );
  return (
    <div className="overflow-hidden rounded-[9px] border border-line bg-ink-950/60">
      <div className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[9.5px] tracking-[0.16em] text-faint uppercase">
        <span>HyperCore CLOB</span>
        <span className="flex items-center gap-1.5 text-mint-500">
          <span className="h-1 w-1 rounded-full bg-mint-400 blink" /> matching
        </span>
      </div>
      <div>{asks.slice(0, 6).reverse().map((l, i) => row(l, "ask", i))}</div>
      <div className="flex items-center justify-between border-y border-line bg-ink-900 px-3 py-2">
        <span className="font-display text-[17px] font-bold text-paper tabular">{fmtPrice(mid)}</span>
        <span className="font-mono text-[10px] text-faint">spread {(mid * 0.0036).toFixed(4)}</span>
      </div>
      <div>{bids.slice(0, 6).map((l, i) => row(l, "bid", i))}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ main */

export function LaunchTerminal() {
  const [stage, setStage] = useState<Stage>("form");
  const [ticker, setTicker] = useState("KMOD");
  const [collat, setCollat] = useState("usdc");
  const [feeBps, setFeeBps] = useState(0.35);
  const [auto, setAuto] = useState(true);
  const [sim, setSim] = useState<Sim>(initSim);
  const [logs, setLogs] = useState<string[]>([
    "> tickerforge cli v3.1.0 · terhubung ke HyperCore mainnet",
    "> siap. isi form lalu tekan DEPLOY MARKET.",
  ]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [stamp, setStamp] = useState(false);
  const fillId = useRef(0);
  const tickCount = useRef(0);

  const log = useCallback((l: string) => setLogs((p) => [...p.slice(-7), l]), []);

  const addFill = useCallback((side: "B" | "S", amt: number, px: number) => {
    fillId.current += 1;
    const f: Fill = { id: fillId.current, addr: shortAddr(), side, amt, px };
    setFills((p) => [f, ...p].slice(0, 7));
  }, []);

  const stRef = useRef({ px: BASE_PX, progress: 0 });
  useEffect(() => {
    stRef.current = { px: sim.px, progress: sim.progress };
  }, [sim.px, sim.progress]);

  const buy = useCallback(
    (amt: number) => {
      const impact = 1 + amt * 0.011;
      addFill("B", amt, stRef.current.px * impact);
      setSim((s) => {
        const target = BASE_PX * (1 + (s.progress / 100) * 2.7);
        return {
          ...s,
          progress: clamp(s.progress + amt * 4.4, 0, 100),
          raised: s.raised + amt * 3412,
          holders: s.holders + Math.floor(1 + amt),
          px: Math.max(s.px, target) * impact,
        };
      });
      log(`> buy ${amt.toFixed(1)} ETH → ${ticker} · impact +1.1%`);
    },
    [addFill, log, ticker]
  );

  /* simulation loop */
  useEffect(() => {
    if (stage === "form" || stage === "deploying") return;
    const id = setInterval(() => {
      tickCount.current += 1;
      setSim((s) => {
        const n = { ...s };
        const target = BASE_PX * (1 + (n.progress / 100) * 2.7);
        n.prev = n.px;
        n.px = n.px + (target - n.px) * 0.18 + (Math.random() - 0.48) * n.px * 0.012;

        // candles
        const cs = [...n.candles];
        const last = { ...cs[cs.length - 1] };
        if (tickCount.current % 3 === 0) {
          cs.push({ o: last.c, h: Math.max(last.c, n.px), l: Math.min(last.c, n.px), c: n.px, v: 0.5 + Math.random() });
          if (cs.length > 36) cs.shift();
        } else {
          last.c = n.px;
          last.h = Math.max(last.h, n.px);
          last.l = Math.min(last.l, n.px);
          cs[cs.length - 1] = last;
        }
        n.candles = cs;

        if (auto && stage === "trading" && n.progress < 100) {
          n.progress = clamp(n.progress + 1.3 + Math.random() * 2.2, 0, 100);
          n.raised += 900 + Math.random() * 2600;
          n.holders += Math.random() > 0.55 ? 1 : 0;
        }

        if (stage === "uniswap" || stage === "reserving" || stage === "perp") {
          n.tvl += (Math.random() - 0.35) * 4200;
          n.vol24 += 1200 + Math.random() * 5200;
        }
        if (stage === "reserving") {
          n.topBid = Math.max(0, n.topBid + (Math.random() - 0.42) * 1.6);
        }
        if (stage === "perp") {
          n.oi += 4200 + Math.random() * 15000;
          n.vol24 += 2400 + Math.random() * 9000;
          n.funding = clamp(n.funding + (Math.random() - 0.5) * 0.0022, -0.045, 0.06);
          n.fee += (n.vol24 * feeBps) / 100 / 240;
        }
        return n;
      });

      if (auto && stage === "trading" && stRef.current.progress < 100 && Math.random() > 0.38) {
        fillId.current += 1;
        const f: Fill = {
          id: fillId.current,
          addr: shortAddr(),
          side: Math.random() > 0.16 ? "B" : "S",
          amt: +(0.1 + Math.random() * 3.4).toFixed(2),
          px: stRef.current.px,
        };
        setFills((p) => [f, ...p].slice(0, 7));
      }
    }, 850);
    return () => clearInterval(id);
  }, [stage, auto, feeBps]);

  /* stage transitions */
  const deploy = () => {
    setStage("deploying");
    setLogs(["> deploy: menyiapkan vault + bonding curve…"]);
    const lines = [
      `> ticker "${ticker}" tersedia di HyperCore registry ✓`,
      `> mint vault 0x${ticker.slice(0, 3).toLowerCase()}f3…a91 · kolateral ${collat.toUpperCase()}`,
      `> kurva eksponensial · target graduasi $180.000 MC`,
      `> tx ${txHash()} dikonfirmasi (0.41s)`,
      "> market LIVE — trading dibuka untuk publik.",
    ];
    lines.forEach((l, i) => setTimeout(() => log(l), 380 + i * 430));
    setTimeout(() => setStage("trading"), 380 + lines.length * 430 + 200);
  };

  const graduate = () => {
    setStage("graduating");
    setAuto(false);
    log("> graduasi: menutup kurva, swap cadangan, add liquidity…");
    setTimeout(() => {
      setSim((s) => ({ ...s, tvl: s.raised * 2.1 + 128000, progress: 100 }));
      setStamp(true);
      log("> pool Uniswap v3 dibuat · add liquidity + lock LP ✓");
      log("> LP token dikunci permanen di 0xLock…7c2 ✓");
      setStage("uniswap");
    }, 1900);
  };

  const reserve = () => {
    setStage("reserving");
    log(`> membuka order beli ticker "${ticker}" di HyperCore…`);
    setTimeout(() => log("> 2 bid lawan masuk · lelang berjalan 8 detik"), 1400);
    setTimeout(() => log(`> tx ${txHash()} · ticker "${ticker}" FINAL atas nama kamu ✓`), 3200);
    setTimeout(() => {
      log("> deploy HIP-3 market · oracle TWAP dari pool Uniswap");
      log("> orderbook dibuka · leverage 20x · funding per jam");
      setSim((s) => ({ ...s, oi: 240000, vol24: 1_480_000 }));
      setStage("perp");
    }, 4200);
  };

  const reset = () => {
    setStage("form");
    setSim(initSim());
    setFills([]);
    setStamp(false);
    setAuto(true);
    tickCount.current = 0;
    setLogs(["> reset. market baru siap di-forge."]);
  };

  const stepIdx = ORDER.indexOf(stage);
  const doneSteps = STEPS.map((s) => ORDER.indexOf(s.stage as Stage) <= stepIdx);
  const mcap = sim.px * 1e9;
  const up = sim.px >= sim.prev;

  return (
    <section id="terminal" className="relative border-t border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead
            kicker="02 · terminal simulasi"
            title={
              <>
                Jalankan seluruh alurnya.
                <br />
                <span className="text-mint-400">Di halaman ini.</span>
              </>
            }
            lede="Simulasi penuh: deploy market, beli di bonding curve, luluskan ke Uniswap, beli ticker di HyperCore, lalu nyalakan perp HIP-3. Semua angka bergerak seperti kondisi live."
          />
          <div className="flex shrink-0 items-center gap-2">
            <Btn variant="ghost" onClick={reset} className="px-4 py-2.5 text-[13px]">
              <Icon.Reset className="h-3.5 w-3.5" /> Reset
            </Btn>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
          {/* ------------------------------------------------ MAIN PANEL */}
          <div className="panel relative overflow-hidden rounded-[14px]">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-ink-850/80 px-4 py-3">
              <div className="flex gap-1.5">
                {["#f4594e", "#e6a52c", "#3fdca5"].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: 0.65 }} />
                ))}
              </div>
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted">
                tickerforge ~ /{ticker.toLowerCase()}-market
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Chip tone={stage === "perp" ? "mint" : stage === "form" ? "neutral" : "gold"}>
                  {stage}
                </Chip>
              </div>
            </div>

            <div className="relative p-4 sm:p-6">
              {/* FORM */}
              {stage === "form" && (
                <div className="pop grid gap-6 md:grid-cols-[1.15fr_1fr]">
                  <div className="space-y-5">
                    <div>
                      <label className="eyebrow mb-2 block">Ticker</label>
                      <div className="flex items-center gap-2 rounded-[9px] border border-line bg-ink-950/70 px-3 focus-within:border-mint-600">
                        <span className="font-mono text-[15px] text-mint-500">$</span>
                        <input
                          value={ticker}
                          maxLength={7}
                          onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                          className="w-full bg-transparent py-3 font-display text-[22px] font-bold tracking-[-0.02em] text-paper outline-none"
                        />
                        <span className="font-mono text-[10px] text-faint">tersedia</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {SUGGESTED_TICKERS.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTicker(t)}
                            className={cn(
                              "cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] transition-all hover:-translate-y-px",
                              ticker === t
                                ? "border-mint-500/70 bg-mint-500/12 text-mint-300"
                                : "border-line text-faint hover:border-ink-500 hover:text-muted"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="eyebrow mb-2 block">Kolateral & builder fee</label>
                      <div className="grid grid-cols-3 gap-2">
                        {COLLATERAL.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setCollat(c.id)}
                            className={cn(
                              "cursor-pointer rounded-[9px] border px-3 py-2.5 text-left transition-all hover:-translate-y-px",
                              collat === c.id
                                ? "border-mint-500/70 bg-mint-500/10"
                                : "border-line bg-ink-950/50 hover:border-ink-500"
                            )}
                          >
                            <div className={cn("font-display text-[14px] font-bold", collat === c.id ? "text-mint-300" : "text-paper")}>
                              {c.label}
                            </div>
                            <div className="mt-0.5 font-mono text-[9px] text-faint">{c.note}</div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 rounded-[9px] border border-line bg-ink-950/50 px-3 py-3">
                        <div className="flex items-center justify-between font-mono text-[10.5px] text-faint uppercase">
                          <span>Builder fee share</span>
                          <span className="text-mint-400">{feeBps.toFixed(2)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1.5}
                          step={0.05}
                          value={feeBps}
                          onChange={(e) => setFeeBps(+e.target.value)}
                          className="rng mt-2.5 w-full"
                          style={{ ["--pct" as string]: `${((feeBps - 0.1) / 1.4) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[11px] border border-line bg-ink-950/60 p-4">
                    <div className="eyebrow mb-3">Ringkasan deploy</div>
                    <dl className="space-y-2.5 font-mono text-[12px]">
                      {[
                        ["Market", `$${ticker || "???"} / USD`],
                        ["Kurva", "exponential 0.42 → 1.55"],
                        ["Target graduasi", "$180.000 MC"],
                        ["LP lock", "permanen"],
                        ["Jalur lanjutan", "HIP-3 perp ✓"],
                        ["Estimasi gas", "$0.00 (vault)"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-line/60 pb-2 last:border-0">
                          <dt className="text-faint">{k}</dt>
                          <dd className="text-paper">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <Btn onClick={deploy} disabled={!ticker} className="mt-5 w-full py-3.5">
                      Deploy market
                      <Icon.Arrow className="h-4 w-4" />
                    </Btn>
                    <p className="mt-2.5 text-center font-mono text-[10px] text-faint">
                      tanpa izin · tanpa biaya listing
                    </p>
                  </div>
                </div>
              )}

              {/* DEPLOYING */}
              {stage === "deploying" && (
                <div className="pop flex min-h-[300px] flex-col justify-center">
                  <div className="mx-auto mb-6 flex items-center gap-3">
                    <Icon.Logo className="h-8 w-8 text-mint-400 [animation:spin-slow_3.2s_linear_infinite]" />
                    <span className="font-display text-[19px] font-bold">Men-deploy ${ticker}…</span>
                  </div>
                  <div className="mx-auto h-1 w-full max-w-[420px] overflow-hidden rounded-full bg-ink-700">
                    <div className="sheen h-full w-full rounded-full bg-mint-500/40" />
                  </div>
                </div>
              )}

              {/* TRADING / GRADUATING */}
              {(stage === "trading" || stage === "graduating") && (
                <div className="pop space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-paper">${ticker}</span>
                        <Chip tone="gold">bonding curve</Chip>
                      </div>
                      <div className="mt-1.5 flex items-end gap-3">
                        <span className={cn("font-display text-[38px] leading-none font-extrabold tabular tracking-[-0.04em] transition-colors", up ? "text-mint-400" : "text-coral-400")}>
                          ${fmtPrice(sim.px)}
                        </span>
                        <span className={cn("mb-1 font-mono text-[12px] tabular", up ? "text-mint-500" : "text-coral-400")}>
                          {up ? "▲" : "▼"} {(((sim.px - sim.prev) / sim.prev) * 100).toFixed(3)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 font-mono text-[11px]">
                      {[
                        ["Market cap", fmtCompact(mcap)],
                        ["Terkumpul", fmtCompact(sim.raised)],
                        ["Holders", String(sim.holders)],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-faint uppercase">{k}</div>
                          <div className="mt-1 text-[14px] text-paper tabular">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[11px] border border-line bg-ink-950/50">
                    <CandleChart candles={sim.candles} up={up} />
                    {stage === "graduating" && (
                      <div className="absolute inset-0 grid place-items-center bg-ink-950/72 backdrop-blur-[2px]">
                        <div className="text-center">
                          <Icon.Bridge className="mx-auto h-9 w-9 text-mint-400 floaty" />
                          <p className="mt-3 font-display text-[17px] font-bold">Memindahkan likuiditas ke Uniswap…</p>
                          <p className="mt-1 font-mono text-[11px] text-faint">swap cadangan → add liquidity → lock LP</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* progress */}
                  <div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="tracking-[0.14em] text-faint uppercase">Progress graduasi</span>
                      <span className={cn("tabular", sim.progress >= 100 ? "text-mint-400" : "text-paper")}>
                        {sim.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-line bg-ink-950">
                      <div
                        className="relative h-full rounded-full bg-gradient-to-r from-mint-600 via-mint-400 to-mint-300 transition-[width] duration-500"
                        style={{ width: `${sim.progress}%` }}
                      >
                        <span className="sheen absolute inset-0 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {[0.5, 2, 5].map((a) => (
                      <Btn key={a} variant="ghost" onClick={() => buy(a)} disabled={stage !== "trading"} className="px-4 py-2.5 text-[13px]">
                        Beli {a.toFixed(1)} ETH
                      </Btn>
                    ))}
                    <button
                      onClick={() => setAuto((v) => !v)}
                      disabled={stage !== "trading"}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-[8px] border px-3.5 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors disabled:opacity-40",
                        auto ? "border-mint-600/60 bg-mint-500/10 text-mint-300" : "border-line text-faint hover:text-muted"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", auto ? "bg-mint-400 blink" : "bg-faint")} />
                      auto-trade {auto ? "on" : "off"}
                    </button>
                    {sim.progress >= 100 && stage === "trading" && (
                      <Btn onClick={graduate} className="ml-auto px-5 py-2.5 text-[13.5px]">
                        Graduate ke Uniswap <Icon.Arrow className="h-3.5 w-3.5" />
                      </Btn>
                    )}
                  </div>
                </div>
              )}

              {/* UNISWAP / SELESAI */}
              {stage === "uniswap" && (
                <div className="pop relative grid gap-5 md:grid-cols-2">
                  <div className="relative rounded-[11px] border border-ice-500/35 bg-ice-500/[0.05] p-5">
                    <div className="flex items-center gap-2.5">
                      <Icon.Pool className="h-5 w-5 text-ice-300" />
                      <span className="font-display text-[17px] font-bold">Uniswap v3 Pool</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-faint">
                      ${ticker}/USDC · fee 0.30% · range ±45%
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[9px] border border-line bg-line">
                      {[
                        ["TVL", fmtCompact(Math.max(sim.tvl, 0))],
                        ["LP terkunci", "100%"],
                        ["Volume spot", fmtCompact(sim.vol24 || 46_200)],
                        ["Agregator", "auto-list"],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-ink-900 px-3 py-3">
                          <div className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{k}</div>
                          <div className="mt-1 font-display text-[17px] font-bold text-paper tabular">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex flex-col justify-between overflow-hidden rounded-[11px] border border-mint-600/40 bg-mint-500/[0.06] p-5">
                    {stamp && (
                      <div className="stamp pointer-events-none absolute top-6 right-3 rounded-[6px] border-[3px] border-mint-400/80 px-3 py-1 font-display text-[26px] font-extrabold tracking-[0.06em] text-mint-300/90 uppercase">
                        Selesai
                      </div>
                    )}
                    <div>
                      <Eyebrow>jalur spot tuntas</Eyebrow>
                      <h3 className="mt-2.5 max-w-[22ch] font-display text-[22px] leading-tight font-bold">
                        Launchpad biasa berhenti di sini.
                      </h3>
                      <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted">
                        Ticker kamu sudah punya harga pasar nyata. Sekarang cabangkan jadi perpetual:
                        beli tickernya di HyperCore, dan ${ticker}-PERP live di orderbook yang sama
                        dengan BTC.
                      </p>
                    </div>
                    <Btn onClick={reserve} className="mt-5 w-full py-3.5">
                      Beli ticker "${ticker}" di HyperCore <Icon.Arrow className="h-4 w-4" />
                    </Btn>
                  </div>
                </div>
              )}

              {/* RESERVING */}
              {stage === "reserving" && (
                <div className="pop grid gap-5 md:grid-cols-[1fr_1.05fr]">
                  <div className="rounded-[11px] border border-gold-500/35 bg-gold-500/[0.05] p-5">
                    <div className="flex items-center gap-2.5">
                      <Icon.Ticket className="h-5 w-5 text-gold-300" />
                      <span className="font-display text-[17px] font-bold">Lelang ticker HyperCore</span>
                    </div>
                    <div className="mt-5 rounded-[9px] border border-line bg-ink-950/60 p-4 text-center">
                      <div className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">bid tertinggi</div>
                      <div className="mt-1.5 font-display text-[40px] leading-none font-extrabold text-gold-300 tabular">
                        {fmtUsd(sim.topBid * 1000, 0)}
                      </div>
                      <div className="mt-2 font-mono text-[11px] text-muted">untuk ${ticker}</div>
                    </div>
                    <div className="mt-4 space-y-2 font-mono text-[11px]">
                      {[
                        ["kamu", fmtUsd(sim.topBid * 1000, 0), true],
                        ["0x9f…41c", fmtUsd((sim.topBid - 1.2) * 1000, 0), false],
                        ["0x2b…88d", fmtUsd((sim.topBid - 2.7) * 1000, 0), false],
                      ].map(([who, amt, me]) => (
                        <div
                          key={String(who)}
                          className={cn(
                            "flex items-center justify-between rounded-[7px] border px-3 py-2",
                            me ? "border-mint-600/50 bg-mint-500/10 text-mint-300" : "border-line text-muted"
                          )}
                        >
                          <span>{who}</span>
                          <span className="tabular">{amt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    <OrderBook mid={sim.px} dense={false} />
                    <p className="font-mono text-[10.5px] text-faint">
                      &gt; kedalaman orderbook dibangun otomatis oleh market maker vault…
                    </p>
                  </div>
                </div>
              )}

              {/* PERP */}
              {stage === "perp" && (
                <div className="pop space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[16px] font-bold">${ticker}-PERP</span>
                        <Chip tone="mint">HIP-3 live</Chip>
                        <span className="font-mono text-[10px] text-faint">20x max</span>
                      </div>
                      <div className="mt-1.5 flex items-end gap-3">
                        <span className={cn("font-display text-[40px] leading-none font-extrabold tabular tracking-[-0.04em]", up ? "text-mint-400" : "text-coral-400")}>
                          ${fmtPrice(sim.px)}
                        </span>
                        <span className="mb-1 font-mono text-[11px] text-faint">mark = index + basis</span>
                      </div>
                    </div>
                    <div className="rounded-[9px] border border-mint-600/45 bg-mint-500/10 px-4 py-2.5 text-right">
                      <div className="font-mono text-[9.5px] tracking-[0.16em] text-mint-500 uppercase">builder fee kamu</div>
                      <div className="font-display text-[24px] leading-tight font-extrabold text-mint-300 tabular">
                        {fmtUsd(sim.fee, 2)}
                      </div>
                      <div className="font-mono text-[9.5px] text-faint">{feeBps.toFixed(2)}% dari volume</div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1.05fr_1fr]">
                    <OrderBook mid={sim.px} dense />
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[9px] border border-line bg-line">
                        {[
                          ["Open interest", fmtCompact(sim.oi)],
                          ["Volume 24 jam", fmtCompact(sim.vol24)],
                          ["TVL spot", fmtCompact(Math.max(sim.tvl, 0))],
                          ["Holders", String(sim.holders)],
                        ].map(([k, v]) => (
                          <div key={k} className="bg-ink-900 px-3 py-2.5">
                            <div className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">{k}</div>
                            <div className="mt-1 font-display text-[16px] font-bold text-paper tabular">{v}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[9px] border border-line bg-ink-950/60 p-3.5">
                        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                          <span>funding / jam</span>
                          <span className={sim.funding >= 0 ? "text-mint-400" : "text-coral-400"}>
                            {(sim.funding * 100).toFixed(4)}%
                          </span>
                        </div>
                        <div className="relative mt-3 h-1.5 rounded-full bg-ink-700">
                          <span className="absolute top-1/2 left-1/2 h-3 w-px -translate-y-1/2 bg-faint" />
                          <span
                            className={cn(
                              "absolute top-0 h-full rounded-full transition-all duration-700",
                              sim.funding >= 0 ? "bg-mint-500" : "bg-coral-500"
                            )}
                            style={{
                              left: sim.funding >= 0 ? "50%" : `${50 + clamp(sim.funding * 900, -50, 0)}%`,
                              width: `${clamp(Math.abs(sim.funding) * 900, 1, 50)}%`,
                            }}
                          />
                        </div>
                        <div className="mt-2.5 flex justify-between font-mono text-[9.5px] text-faint">
                          <span>short bayar</span>
                          <span>long bayar</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 rounded-[9px] border border-line bg-ink-950/60 px-3.5 py-3">
                        <Icon.Shield className="h-4 w-4 shrink-0 text-mint-500" />
                        <p className="font-mono text-[10.5px] leading-relaxed text-muted">
                          Oracle TWAP dari pool Uniswap + 2 sumber eksternal. Likuidasi ditangani
                          engine HyperCore yang sama dengan market inti.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* console */}
            <div className="border-t border-line bg-ink-950/80 px-4 py-3 sm:px-6">
              <div className="space-y-1 font-mono text-[11px] leading-relaxed">
                {logs.slice(-5).map((l, i) => (
                  <p key={`${l}-${i}`} className={cn(i === logs.slice(-5).length - 1 ? "text-mint-400" : "text-faint")}>
                    {l}
                  </p>
                ))}
                <p className="text-mint-500">
                  <span className="blink">▌</span>
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------- SIDE PANEL */}
          <div className="flex flex-col gap-4">
            <div className="panel rounded-[14px] p-4">
              <div className="eyebrow mb-3.5">Status pipeline</div>
              <ol className="relative space-y-1">
                <span className="absolute top-2 bottom-2 left-[11px] w-px bg-line" />
                {STEPS.map((s, i) => {
                  const done = doneSteps[i] && stage !== "form";
                  const cur = done && (!doneSteps[i + 1] || i === STEPS.length - 1);
                  return (
                    <li key={s.id} className="relative flex items-center gap-3 rounded-[8px] px-1.5 py-2">
                      <span
                        className={cn(
                          "relative z-10 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full border-2 transition-all duration-500",
                          done
                            ? "border-mint-500 bg-mint-500/20 text-mint-300"
                            : "border-ink-600 bg-ink-900 text-faint"
                        )}
                      >
                        {done ? <Icon.Check className="h-3 w-3" /> : <span className="font-mono text-[10px]">{i + 1}</span>}
                        {cur && (
                          <span className="absolute inset-0 rounded-full border border-mint-400 [animation:pulse-ring_2s_ease-out_infinite]" />
                        )}
                      </span>
                      <span className={cn("text-[13px] font-medium transition-colors", done ? "text-paper" : "text-faint")}>
                        {s.label}
                      </span>
                      {cur && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mint-400 blink" />}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="panel flex-1 rounded-[14px] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">Fill feed</span>
                <span className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">on-chain</span>
              </div>
              <div className="space-y-1.5">
                {fills.length === 0 && (
                  <p className="py-6 text-center font-mono text-[11px] text-faint">
                    belum ada fill — deploy market dulu
                  </p>
                )}
                {fills.map((f) => (
                  <div
                    key={f.id}
                    className="pop flex items-center gap-2 rounded-[7px] border border-line/70 bg-ink-950/50 px-2.5 py-1.5 font-mono text-[11px]"
                  >
                    <span className={cn("font-semibold", f.side === "B" ? "text-mint-400" : "text-coral-400")}>
                      {f.side}
                    </span>
                    <span className="text-muted">{f.addr}</span>
                    <span className="ml-auto tabular text-paper">{f.amt.toFixed(2)}</span>
                    <span className="tabular text-faint">${fmtPrice(f.px)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel rounded-[14px] p-4">
              <div className="eyebrow mb-3">Yang kamu pegang</div>
              <ul className="space-y-2.5">
                {[
                  ["Deployer address", "0x7c2…f19a"],
                  ["Ticker reserved", `$${ticker}`],
                  ["LP position", stage === "uniswap" || stage === "perp" ? "terkunci" : "—"],
                  ["Fee recipient", "aktif"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between border-b border-line/60 pb-2 font-mono text-[11px] last:border-0">
                    <span className="text-faint">{k}</span>
                    <span className="text-paper">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LaunchTerminal;
