import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Micro, Panel, Lamp, fmt } from "./ui";

const deskImg = "images/desk.jpg";

const ENTRY = 0.002841;

export default function Perp({ ticker }: { ticker: string }) {
  const [lev, setLev] = useState(8);
  const [margin, setMargin] = useState(500);
  const [pos, setPos] = useState<null | { side: "LONG" | "SHORT"; entry: number; margin: number; lev: number }>(null);
  const [mark, setMark] = useState(ENTRY);
  const [funding, setFunding] = useState(0.0112);
  const [cd, setCd] = useState(6124);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    if (m.matches) return;
    const id = setInterval(() => {
      setMark((p) => {
        const r = Math.random();
        const step = r < 0.3 ? (Math.random() < 0.5 ? -1 : 1) * 0.000006 : r < 0.75 ? (Math.random() < 0.5 ? -1 : 1) * 0.000003 : 0;
        return Math.max(ENTRY * 0.85, p + step);
      });
      setCd((c) => (c <= 0 ? 28800 : c - 1));
      setFunding(() => 0.0112 + (Math.random() - 0.5) * 0.004);
    }, 700);
    return () => clearInterval(id);
  }, []);

  const size = margin * lev;
  const sign = pos?.side === "SHORT" ? -1 : 1;
  const open = pos ? pos.entry : ENTRY;
  const pnl = pos ? size * (mark / open - 1) * sign : 0;
  const pnlPct = pos ? (pnl / margin) * 100 : 0;
  const liq = pos ? open * (1 - sign * (0.95 / pos.lev)) : 0;
  const h = Math.floor(cd / 3600);
  const mm = String(Math.floor((cd % 3600) / 60)).padStart(2, "0");
  const ss = String(cd % 60).padStart(2, "0");

  const live = Math.abs(mark - ENTRY) / ENTRY > 0.0005;

  return (
    <section className="relative overflow-hidden border-b border-edge pb-16 pt-16 md:pb-20 md:pt-20">
      {/* material: dealing desk at night */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <img
          src={deskImg}
          alt=""
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="h-full w-full object-cover object-center opacity-[0.22]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/80 to-ink" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-transparent to-ink" />
      </div>

      <div className="relative mx-auto max-w-[1240px] px-5 md:px-10">

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── perp ticket ─────────────────────── */}
          <Panel className="p-6 pt-10 md:p-8 md:pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-edge pb-5">
              <div>
                <Micro className="text-dim">PASAR · HIP-3</Micro>
                <div className="mt-2 font-mono text-2xl font-bold">
                  {ticker}/USDC·PERP
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Lamp on color={live ? "mint" : "amber"} className={reduce ? "" : "animate-blink"} />
                  <Micro className="text-dim">MARK PRICE</Micro>
                </div>
                <div
                  className={`tnum font-mono text-3xl font-bold transition-colors duration-300 ${
                    mark > open ? "text-mint" : mark < open ? "text-blood" : "text-bone"
                  }`}
                >
                  {fmt.price(mark)}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-px border border-edge bg-edge">
              <Cell k="FUNDING / 8J" v={`${funding.toFixed(4).replace(".", ",")}%`} />
              <Cell k="OI" v="$3,93 JT" />
              <Cell k="LIKUIDASI DALAM" v={`${h}:${mm}:${ss}`} />
            </div>

            {!pos ? (
              <div className="mt-7 border border-dashed border-edge bg-[#0c1013] px-6 py-10 text-center">
                <Micro className="text-dim">BELUM ADA POSISI</Micro>
                <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-dim/80">
                  Atur leverage, tentukan margin, lalu ambil sisi. PnL, harga likuidasi, dan
                  margin awal dihitung langsung dari mark price yang berjalan.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                className="mt-7 border border-edge bg-[#0c1013]"
              >
                <div className="flex items-center justify-between border-b border-edge px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`border px-2 py-1 font-mono text-[10px] tracking-[0.2em] ${
                        pos.side === "LONG"
                          ? "border-mint/50 bg-mint/10 text-mint"
                          : "border-blood/50 bg-blood/10 text-blood"
                      }`}
                    >
                      {pos.side}
                    </span>
                    <span className="tnum font-mono text-[12px] text-dim">
                      {fmt.n(pos.margin, 0)} USDC · {pos.lev}× · {fmt.usd(size, 0)}
                    </span>
                  </div>
                  <button
                    onClick={() => setPos(null)}
                    className="font-mono text-[10px] tracking-[0.18em] text-dim transition-colors hover:text-blood"
                  >
                    TUTUP POSISI
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-px bg-edge sm:grid-cols-4">
                  <Cell
                    k="PNL TEREALISASI"
                    v={`${pnl >= 0 ? "+" : "−"}${fmt.usd(Math.abs(pnl), 2)}`}
                    tone={pnl >= 0 ? "mint" : "blood"}
                  />
                  <Cell k="PNL %" v={`${pnlPct >= 0 ? "+" : "−"}${fmt.n(Math.abs(pnlPct), 2)}%`} tone={pnl >= 0 ? "mint" : "blood"} />
                  <Cell k="HARGA MASUK" v={fmt.price(pos.entry)} />
                  <Cell k="LIQUIDASI DI" v={fmt.price(liq)} tone="blood" />
                </div>
                <div className="h-1.5 w-full bg-[#080b0e]">
                  <div
                    className={`h-full transition-all duration-700 ${pnl >= 0 ? "bg-mint" : "bg-blood"}`}
                    style={{ width: `${Math.min(100, Math.max(3, 50 + pnlPct * 2))}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* leverage */}
            <div className="mt-7">
              <div className="flex items-end justify-between">
                <Micro className="text-dim">LEVERAGE</Micro>
                <span className="tnum font-mono text-2xl font-bold text-amber">{lev}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={lev}
                onChange={(e) => setLev(Number(e.target.value))}
                className="mt-3 w-full"
                aria-label="leverage"
              />
              <div className="tnum flex justify-between font-mono text-[9px] text-dim">
                {[1, 5, 10, 15, 20, 25].map((n) => (
                  <span key={n}>{n}×</span>
                ))}
              </div>
            </div>

            <label className="mt-6 block border-b border-edge pb-2 focus-within:border-amber">
              <Micro className="text-dim">MARGIN (USDC)</Micro>
              <input
                type="number"
                value={margin}
                min={10}
                onChange={(e) => setMargin(Math.max(10, Number(e.target.value) || 0))}
                className="tnum mt-2 w-full bg-transparent font-mono text-3xl font-bold text-bone outline-none"
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPos({ side: "LONG", entry: mark, margin, lev })}
                className="border border-mint bg-mint/10 py-4 font-mono text-[12px] font-bold tracking-[0.18em] text-mint transition-all hover:bg-mint hover:text-ink"
              >
                LONG {lev}×
              </button>
              <button
                onClick={() => setPos({ side: "SHORT", entry: mark, margin, lev })}
                className="border border-blood bg-blood/10 py-4 font-mono text-[12px] font-bold tracking-[0.18em] text-blood transition-all hover:bg-blood hover:text-ink"
              >
                SHORT {lev}×
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-dim">
              Notional {fmt.usd(size, 0)} · margin awal {fmt.usd(margin, 0)} · posisi bisa
              terlikuidasi dalam hitungan menit pada leverage tinggi.
            </p>
          </Panel>

          {/* ── HIP-3 spec sheet ────────────────── */}
          <div className="space-y-6">
            <Panel className="p-6 pt-10">
              <Micro className="text-amber">SPESIFIKASI PASAR HIP-3</Micro>
              <ul className="mt-4 space-y-px border border-edge bg-edge">
                {[
                  ["ID ASET (API)", "100000 + 1×10000 + 42"],
                  ["NAMA PASAR", `grvd:${ticker}`],
                  ["STAKE DEPLOYER", "500.000 HYPE"],
                  ["IKATAN STAKE", "≥ 183 HARI"],
                  ["ASET TANPA LELANG", "3 PERTAMA"],
                  ["FEE SCALE DEPLOYER", "0 – 300%"],
                  ["MARGIN", "USDC · CROSS"],
                  ["MAKS LEVERAGE", "25×"],
                  ["ORAKEL", "DIOPERASIKAN DEPLOYER"],
                  ["ENGINE", "HYPERCORE MATCHING"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-4 bg-[#0e1216] px-4 py-3">
                    <Micro className="text-dim">{k}</Micro>
                    <span className="tnum font-mono text-[12px] text-bone">{v}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="p-6 pt-10">
              <div className="flex items-center justify-between">
                <Micro className="text-dim">ALUR ORDER</Micro>
                <Lamp on color="mint" />
              </div>
              <ol className="mt-4 space-y-4">
                {[
                  ["01", "Wallet kirim order action biasa", "tanpa tipe order HIP-3 khusus"],
                  ["02", "HyperCore memetakan aset 110042", "{dex}:{coin} → indeks DEX"],
                  ["03", "Match, margin, likuidasi", "satu buku, satu akun USDC"],
                  ["04", "Settlement ke L1 state", "positions & balances native"],
                ].map(([n, t, s]) => (
                  <li key={n} className="flex gap-4">
                    <span className="tnum font-mono text-[11px] text-amber">{n}</span>
                    <span>
                      <span className="block text-[13px] font-semibold text-bone">{t}</span>
                      <Micro className="text-dim">{s}</Micro>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone?: "mint" | "blood";
}) {
  return (
    <div className="bg-[#0e1216] px-4 py-3">
      <Micro className="text-dim">{k}</Micro>
      <div
        className={`tnum mt-1 font-mono text-[15px] ${
          tone === "mint" ? "text-mint" : tone === "blood" ? "text-blood" : "text-bone"
        }`}
      >
        {v}
      </div>
    </div>
  );
}
