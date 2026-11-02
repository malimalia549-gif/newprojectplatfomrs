import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Micro, Panel, Lamp, Screw, fmt } from "./ui";

const STAGES = ["CREATE", "TRADING", "GRADUATE", "UNISWAP POOL", "SELESAI"] as const;

const GRAD_SOL = 8531;
const SOL_USD = 186;
const POOL_LIQ = 284119;
const P_START = 0.000000608;
const P_END = 0.0028411;
const SUPPLY = 1_000_000_000;

const f = (x: number) => Math.pow(x, 2.6);

function curveLine(w: number, h: number, steps = 64) {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    pts.push(`${(x * w).toFixed(1)},${(h - f(x) * h).toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}
const LINE = curveLine(600, 200);
const AREA = `${LINE} L600,200 L0,200 Z`;

type Props = { ticker: string; setTicker: (t: string) => void };

export default function Pipeline({ ticker, setTicker }: Props) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [name, setName] = useState("Kuda Laut Digital");
  const [supply, setSupply] = useState("1000000000");
  const [draft, setDraft] = useState(ticker);
  const [tape, setTape] = useState<{ t: string; s: string; p: number }[]>([]);
  const reduce = usePrefersReduced();

  /* price curve */
  const price = P_START * Math.pow(P_END / P_START, progress);
  const mcap = price * SUPPLY;
  const raised = progress * GRAD_SOL;

  const chipPos = stage === 1 ? 25 + progress * 25 : stage * 25;

  useEffect(() => {
    if (!running || stage !== 1 || progress >= 1) return;
    const id = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.011 + Math.random() * 0.009));
    }, 70);
    return () => clearInterval(id);
  }, [running, stage, progress]);

  useEffect(() => {
    if (!running) return;
    if (stage === 1) return;
    if (stage === 4) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setStage((s) => Math.min(4, s + 1)), stage === 3 ? 1700 : 1000);
    return () => clearTimeout(t);
  }, [running, stage]);

  useEffect(() => {
    if (stage === 1 && progress >= 1) {
      const t = setTimeout(() => setStage(2), 550);
      return () => clearTimeout(t);
    }
  }, [stage, progress]);

  useEffect(() => {
    if (stage === 0 || stage >= 4) return;
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(id);
  }, [stage]);

  function buy(sol: number, big = false) {
    setProgress((p) => Math.min(1, p + sol / GRAD_SOL));
    setTape((t) =>
      [
        {
          t: new Date().toLocaleTimeString("id-ID", { hour12: false }),
          s: `${fmt.n(sol, 1)} SOL`,
          p: price,
        },
        ...t,
      ].slice(0, 7),
    );
    if (big && stage === 1) setProgress((p) => Math.min(1, p + 0.02));
  }

  function reset() {
    setStage(0);
    setProgress(0);
    setRunning(false);
    setElapsed(0);
    setTape([]);
  }

  function create() {
    const t = (draft || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!t) return;
    setTicker(t);
    setStage(1);
    setProgress(0.015);
    setRunning(!reduce);
  }

  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toFixed(1).replace(".", ",");

  return (
    <section className="relative border-b border-edge bg-[#0d1114] py-12 md:py-16">
      <div className="mx-auto max-w-[1240px] px-5 md:px-10">
        {/* ── control bar ─────────────────────────────── */}
        <div className="panel brushed mb-12 flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3">
          <button
            onClick={() => (stage >= 4 ? reset() : setRunning((r) => !r))}
            className="group flex items-center gap-3 border border-edge bg-[#1a2026] px-4 py-2 transition-colors hover:border-amber"
          >
            <Lamp on={running} />
            <Micro className="text-bone group-hover:text-amber">
              {stage >= 4 ? "ULANGI" : running ? "JEDA" : "RUN"}
            </Micro>
          </button>
          <div className="flex items-center gap-3">
            <Micro className="text-dim">WAKTU TEMPUH</Micro>
            <span className="tnum font-mono text-[13px] text-bone">
              {mins}m {secs}s
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Micro className="text-dim">BIAYA</Micro>
            <span className="tnum font-mono text-[13px] text-bone">$0,00 → $661</span>
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <Lamp on={stage >= i} />
                <Micro className={stage === i ? "text-amber" : "text-dim"}>{s}</Micro>
                {i < 4 && <span className="text-edge">/</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── the track: full-bleed machined groove ─────── */}
      <div className="relative mb-14 overflow-hidden border-y border-edge bg-[#080b0e] pt-8 pb-14">
        <div
          aria-hidden
          className="brushed absolute inset-0 opacity-70"
          style={{ backgroundImage: "linear-gradient(180deg,#141210,#080b0e)" }}
        />
        <div className="relative mx-10 md:mx-20">
          <div className="relative h-[14px]">
            <div className="groove absolute inset-x-0 top-1/2 h-[12px] -translate-y-1/2" />
            <div
              className="absolute top-1/2 left-0 h-[12px] -translate-y-1/2 bg-amber transition-[width] duration-300 ease-out"
              style={{ width: `${chipPos}%`, boxShadow: "0 0 18px rgba(217,255,77,.5)" }}
            />
          </div>

          {/* travelling token chip */}
          <div
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{ left: `${chipPos}%` }}
          >
            <div
              className="flex h-11 w-[72px] flex-col items-center justify-center border border-[#333d47] bg-[#1a2129]"
              style={{ boxShadow: "0 0 0 1px #080b0e, 0 10px 22px -10px #000, inset 0 1px 0 rgba(237,231,218,.12)" }}
            >
              <span className="font-mono text-[12px] font-bold text-amber">{ticker}</span>
              <span className="tnum micro text-[8px] text-dim">{fmt.price(price)}</span>
            </div>
          </div>

          {/* stations */}
          {STAGES.map((s, i) => (
            <button
              key={s}
              onClick={() => setStage(i)}
              className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${i * 25}%` }}
              aria-label={`stasiun ${s}`}
            >
              <span
                className={`block h-5 w-5 border transition-all duration-300 ${
                  stage >= i
                    ? "border-amber bg-amber/20"
                    : "border-[#2b333b] bg-[#12181d] group-hover:border-bone"
                }`}
                style={{ boxShadow: "0 0 0 1px #080b0e" }}
              />
            </button>
          ))}
          {STAGES.map((s, i) => (
            <div
              key={`l-${s}`}
              className="pointer-events-none absolute top-[34px] w-[64px] -translate-x-1/2 text-center md:top-[32px] md:w-[86px]"
              style={{ left: `${i * 25}%` }}
            >
              <Micro
                className={`block text-[8px] leading-tight md:text-[10px] ${
                  stage >= i ? "text-bone" : "text-dim"
                }`}
              >
                {s}
              </Micro>
              <div className="tnum micro mt-1 text-[8px] text-dim/85">0{i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 md:px-10 lg:grid-cols-[1.35fr_0.65fr]">
        {/* ── station console ───────────────────────── */}
        <Panel className="p-6 pt-10 md:p-8 md:pt-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.42, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {stage === 0 && (
                <div>
                  <Micro className="text-amber">STASIUN 01 — CREATE</Micro>
                  <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                    Ukir ticker kamu
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">
                    Ticker dipakai sebagai nama pasar di HyperCore dengan format{" "}
                    <span className="text-mint">grvd:{ticker || "TKN"}</span>. Biaya create $0.
                  </p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <Field label="TICKER (3–6 KARAKTER)">
                      <input
                        value={draft}
                        onChange={(e) =>
                          setDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                        }
                        maxLength={6}
                        className="tnum w-full bg-transparent font-mono text-2xl font-bold text-bone outline-none placeholder:text-edge"
                        placeholder="KUDA"
                      />
                    </Field>
                    <Field label="NAMA PROYEK">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, 28))}
                        className="w-full bg-transparent font-mono text-lg text-bone outline-none"
                      />
                    </Field>
                    <Field label="SUPPLY">
                      <input
                        value={Number(supply).toLocaleString("id-ID")}
                        onChange={(e) => setSupply(e.target.value.replace(/\D/g, "").slice(0, 12) || "0")}
                        className="tnum w-full bg-transparent font-mono text-lg text-bone outline-none"
                      />
                    </Field>
                    <Field label="KURVA">
                      <div className="font-mono text-lg text-bone">Eksponensial · 8.531 SOL</div>
                    </Field>
                  </div>
                  <button
                    onClick={create}
                    className="mt-8 w-full border border-amber bg-amber px-6 py-4 font-mono text-[12px] font-bold tracking-[0.2em] text-ink transition-all hover:brightness-110"
                    style={{ boxShadow: "0 0 26px -8px rgba(217,255,77,.7)" }}
                  >
                    BUAT TICKER → MULAI TRADING
                  </button>
                </div>
              )}

              {stage === 1 && (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <Micro className="text-amber">STASIUN 02 — TRADING</Micro>
                      <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                        Kurva sedang terisi
                      </h3>
                    </div>
                    <div className="text-right">
                      <Micro className="text-dim">PROGRES GRADUATE</Micro>
                      <div className="tnum font-mono text-4xl font-bold text-amber">
                        {(progress * 100).toFixed(1).replace(".", ",")}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border border-edge bg-[#080b0e] p-4">
                    <svg viewBox="0 0 600 200" className="h-[190px] w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="fillg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d9ff4d" stopOpacity="0.42" />
                          <stop offset="100%" stopColor="#d9ff4d" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="clipg">
                          <rect x="0" y="0" width={progress * 600} height="200" />
                        </clipPath>
                      </defs>
                      {[0.25, 0.5, 0.75].map((g) => (
                        <line key={g} x1="0" y1={200 - g * 200} x2="600" y2={200 - g * 200} stroke="#1e252b" strokeWidth="1" />
                      ))}
                      <path d={AREA} fill="url(#fillg)" clipPath="url(#clipg)" />
                      <path d={LINE} fill="none" stroke="#2b333b" strokeWidth="1.5" />
                      <path d={LINE} fill="none" stroke="#d9ff4d" strokeWidth="2" clipPath="url(#clipg)" />
                      <line x1={progress * 600} y1="0" x2={progress * 600} y2="200" stroke="#e9ecef" strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
                      <circle cx={progress * 600} cy={200 - f(progress) * 200} r="5" fill="#d9ff4d" />
                    </svg>
                    <div className="mt-2 flex justify-between">
                      <Micro className="text-dim">$608 MCAP AWAL</Micro>
                      <Micro className="text-dim">AMBANG GRADUATE</Micro>
                      <Micro className="text-amber">$2,84 JT MCAP</Micro>
                    </div>
                  </div>

                  <dl className="mt-6 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
                    <Stat k="HARGA" v={fmt.price(price)} />
                    <Stat k="MARKET CAP" v={fmt.usd(mcap, 0)} />
                    <Stat k="TERKUMPUL" v={`${fmt.n(raised, 0)} SOL`} />
                    <Stat k="SISA" v={`${fmt.n(Math.max(0, GRAD_SOL - raised), 0)} SOL`} />
                  </dl>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {[
                      ["+1 SOL", 1],
                      ["+5 SOL", 5],
                      ["+50 SOL", 50],
                    ].map(([l, v]) => (
                      <button
                        key={l as string}
                        onClick={() => buy(v as number)}
                        className="border border-edge bg-[#1a2026] px-5 py-3 font-mono text-[11px] tracking-[0.18em] text-bone transition-colors hover:border-mint hover:text-mint"
                      >
                        BELI {l as string}
                      </button>
                    ))}
                    <button
                      onClick={() => buy(GRAD_SOL * (1 - progress), true)}
                      className="ml-auto border border-mint bg-mint/10 px-5 py-3 font-mono text-[11px] tracking-[0.18em] text-mint transition-colors hover:bg-mint hover:text-ink"
                    >
                      BELI SAMPAI GRADUATE
                    </button>
                  </div>

                  {tape.length > 0 && (
                    <div className="mt-5 border-t border-edge pt-3">
                      <Micro className="text-dim">TRANSAKSI KAMU</Micro>
                      <div className="mt-2 space-y-1">
                        {tape.slice(0, 4).map((t, i) => (
                          <div key={i} className="tnum flex justify-between font-mono text-[11px] text-dim">
                            <span>{t.t}</span>
                            <span className="text-mint">{t.s}</span>
                            <span>{fmt.price(t.p)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stage === 2 && (
                <div className="py-4">
                  <Micro className="text-amber">STASIUN 03 — GRADUATE</Micro>
                  <h3 className="mt-3 text-[clamp(2.4rem,7vw,4.5rem)] font-bold leading-[0.9] tracking-[-0.04em]">
                    GRADUATE
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-dim">
                    Kurva penuh. Sisa likuiditas ditarik dari kurva dan dikunci sebagai LP —
                    tidak bisa ditarik creator.
                  </p>
                  <ul className="mt-7 space-y-px border border-edge bg-edge">
                    {[
                      ["CAP TERKAPAL", `${fmt.n(GRAD_SOL, 0)} SOL · ${fmt.usd(GRAD_SOL * SOL_USD, 0)}`, true],
                      ["LIQUIDITAS KE POOL", `${fmt.usd(POOL_LIQ, 0)} · 80%`, true],
                      ["LP TOKEN", "TIME-LOCK 12 BULAN", true],
                      ["CREATOR FEE", "1,2% DARI POOL", true],
                    ].map(([k, v]) => (
                      <Row key={k as string} k={k as string} v={v as string} mint />
                    ))}
                  </ul>
                  <button
                    onClick={() => setStage(3)}
                    className="mt-8 w-full border border-amber bg-amber px-6 py-4 font-mono text-[12px] font-bold tracking-[0.2em] text-ink transition-all hover:brightness-110"
                    style={{ boxShadow: "0 0 26px -8px rgba(217,255,77,.7)" }}
                  >
                    KUNCI LIKUIDITAS & GRADUATE →
                  </button>
                </div>
              )}

              {stage === 3 && (
                <div>
                  <Micro className="text-amber">STASIUN 04 — UNISWAP POOL</Micro>
                  <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                    Pool terbentuk
                  </h3>
                  <motion.div
                    initial={{ opacity: 0, y: 26 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1], delay: 0.1 }}
                    className="panel brushed mt-7 p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center border border-edge bg-[#080b0e] font-mono text-[11px] text-mint">
                          ETH
                        </span>
                        <span className="text-2xl font-bold tracking-tight">ETH / {ticker}</span>
                      </div>
                      <span className="border border-mint/50 bg-mint/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-mint">
                        LIQUIDITAS TERKUNCI
                      </span>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-px bg-edge sm:grid-cols-4">
                      <Stat k="LIKUIDITAS" v={fmt.usd(POOL_LIQ, 0)} mint />
                      <Stat k="FEE TIER" v="0,30%" />
                      <Stat k="HARGA DASAR" v={fmt.price(P_END)} />
                      <Stat k="FEE CREATOR" v="1,2%" />
                    </dl>
                  </motion.div>
                  <button
                    onClick={() => setStage(4)}
                    className="mt-7 w-full border border-edge bg-[#1a2026] px-6 py-4 font-mono text-[12px] font-bold tracking-[0.2em] text-bone transition-colors hover:border-amber hover:text-amber"
                  >
                    SELESAIKAN →
                  </button>
                </div>
              )}

              {stage === 4 && (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <Micro className="text-mint">STASIUN 05 — SELESAI</Micro>
                      <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] md:text-4xl">
                        Ticker kamu hidup
                      </h3>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">
                        Satu baris di bawah ini adalah pasar kamu di HyperCore. Order masuk lewat
                        jalur HyperCore biasa — tidak ada tipe order khusus.
                      </p>
                    </div>
                    <motion.div
                      initial={{ scale: 1.6, opacity: 0, rotate: -12 }}
                      animate={{ scale: 1, opacity: 1, rotate: -7 }}
                      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                      className="flex flex-col items-center border-[3px] border-mint px-6 py-3"
                      style={{ boxShadow: "0 0 34px -14px rgba(62,220,153,.8)" }}
                    >
                      <span className="text-4xl font-bold tracking-[-0.03em] text-mint">SELESAI</span>
                      <Micro className="mt-1 text-mint/70">{mins}M {secs}S · TANPA KURASI</Micro>
                    </motion.div>
                  </div>

                  <ul className="mt-8 space-y-px border border-edge bg-edge">
                    <Row k="BIAYA CREATE" v="$0,00" />
                    <Row k="BIAYA GRADUATION" v="$199,00" />
                    <Row k="BIAYA POOL" v="$420,00" />
                    <Row k="MARKET HIP-3" v={`grvd:${ticker} · aset 110042`} mint />
                  </ul>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <a
                      href="#/pasar"
                      className="flex-1 border border-amber bg-amber px-6 py-4 text-center font-mono text-[12px] font-bold tracking-[0.2em] text-ink transition-all hover:brightness-110"
                      style={{ boxShadow: "0 0 26px -8px rgba(217,255,77,.7)" }}
                    >
                      BELI {ticker} DI ORDERBOOK ↓
                    </a>
                    <button
                      onClick={reset}
                      className="border border-edge bg-[#1a2026] px-6 py-4 font-mono text-[12px] tracking-[0.2em] text-dim transition-colors hover:border-bone hover:text-bone"
                    >
                      ULANGI
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Panel>

        {/* ── spec rail ─────────────────────────────── */}
        <div className="space-y-6">
          <Panel className="p-6 pt-10">
            <Micro className="text-dim">SPESIFIKASI KONTRAK</Micro>
            <ul className="mt-4 space-y-px border border-edge bg-edge">
              <Row k="SUPPLY" v={fmt.n(Number(supply) || 0)} />
              <Row k="KURVA" v="EKSPONENSIAL" />
              <Row k="TARGET" v={`${fmt.n(GRAD_SOL, 0)} SOL`} />
              <Row k="LP LOCK" v="365 HARI" />
              <Row k="CHAIN" v="HYPERCORE · HIP-3" />
            </ul>
          </Panel>
          <Panel className="p-6 pt-10">
            <div className="flex items-center justify-between">
              <Micro className="text-dim">LOG SISTEM</Micro>
              <Lamp on={stage >= 4} color={stage >= 4 ? "mint" : "amber"} />
            </div>
            <div className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-dim">
              {STAGES.map((s, i) => (
                <div key={s} className="flex gap-3">
                  <span className={stage > i ? "text-mint" : stage === i ? "text-amber" : "text-edge"}>
                    {stage > i ? "[✓]" : stage === i ? "[>]" : "[ ]"}
                  </span>
                  <span className={stage >= i ? "text-bone/80" : ""}>{s}</span>
                </div>
              ))}
              <div className="mt-4 border-t border-edge pt-3 text-[10px] leading-relaxed">
                *Simulasi antarmuka. Angka disederhanakan untuk kejelasan.
              </div>
            </div>
          </Panel>
          <div className="hidden lg:block">
            <Screw className="mx-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── small parts ───────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b border-edge pb-2 focus-within:border-amber">
      <Micro className="text-dim">{label}</Micro>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Stat({ k, v, mint }: { k: string; v: string; mint?: boolean }) {
  return (
    <div className="bg-[#0e1216] px-4 py-3">
      <Micro className="text-dim">{k}</Micro>
      <div className={`tnum mt-1 font-mono text-[15px] ${mint ? "text-mint" : "text-bone"}`}>{v}</div>
    </div>
  );
}

function Row({ k, v, mint }: { k: string; v: string; mint?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#0e1216] px-4 py-3">
      <Micro className="text-dim">{k}</Micro>
      <span className={`tnum font-mono text-[12px] ${mint ? "text-mint" : "text-bone"}`}>{v}</span>
    </div>
  );
}

function usePrefersReduced() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const h = () => setR(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return r;
}
