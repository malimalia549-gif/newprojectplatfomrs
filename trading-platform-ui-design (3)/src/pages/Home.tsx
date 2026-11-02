import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Btn,
  Card,
  Divider,
  KV,
  Lamp,
  Meter,
  Micro,
  Reveal,
  Screw,
  fmt,
} from "../components/ui";
import { AreaCurve, HeatCell, Sparkline } from "../components/charts";
import { EQUITY, LAUNCHES, MARKETS, makeFills, makeSpark } from "../lib/data";
import { useLiveMarkets } from "../lib/hypercore";
const panelImg = "images/panel.jpg";

type Kpi = [string, string, string, number[], boolean];
const KPIS: Kpi[] = [
  ["VOLUME 24 JAM", "$1,39 M", "+8,4%", makeSpark(3, 24, 100, 0.05), true],
  ["OPEN INTEREST", "$3,93 M", "+2,1%", makeSpark(5, 24, 100, 0.04), true],
  ["MARKET AKTIF", "164", "+6 minggu ini", makeSpark(9, 24, 100, 0.02), true],
  ["FUNDING RATA²", "+0,0081%", "netral", makeSpark(17, 24, 100, 0.07), false],
  ["GRADUASI 24 JAM", "38 ticker", "rerata 11 menit", makeSpark(21, 24, 100, 0.06), true],
];

export default function Dashboard() {
  const [fills, setFills] = useState(() => makeFills(137, 10));
  const [queue, setQueue] = useState(() => LAUNCHES.filter((l) => l.status === "CURVE").slice(0, 4));
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFills(makeFills(Date.now() % 9999, 10));
      setPulse((p) => p + 1);
      setQueue((q) =>
        q.map((l) => ({
          ...l,
          raised: Math.min(l.target, l.raised + Math.random() * 26),
        })),
      );
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const movers = useMemo(
    () => [...MARKETS].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6),
    [],
  );

  /* KPI diambil langsung dari metaAndAssetCtxs HyperCore bila tersambung */
  const { markets: direct, live: dataLive } = useLiveMarkets();
  const kpi: Kpi[] = useMemo(() => {
    if (!dataLive || direct.length === 0) return KPIS;
    const vol = direct.reduce((a, m) => a + m.vol, 0);
    const oi = direct.reduce((a, m) => a + m.oi, 0);
    const hijau = direct.filter((m) => m.change > 0).length;
    const funding = (direct.reduce((a, m) => a + m.funding, 0) / direct.length) * 100;
    return [
      ["VOLUME 24 JAM", fmt.usd(vol, 0), `${hijau}/${direct.length} pasar hijau`, makeSpark(3, 24, 100, 0.05), hijau > direct.length / 2],
      ["OPEN INTEREST", fmt.usd(oi, 0), "HyperCore langsung", makeSpark(5, 24, 100, 0.04), true],
      ["PERP AKTIF", String(direct.length), "universe non-delisted", makeSpark(9, 24, 100, 0.02), true],
      ["FUNDING RATA²", `${funding.toFixed(4).replace(".", ",")}%`, funding >= 0 ? "netral-long" : "netral-short", makeSpark(17, 24, 100, 0.07), funding >= 0],
      ["GRADUASI 24 JAM", "38 ticker", "rerata 11 menit", makeSpark(21, 24, 100, 0.06), true],
    ];
  }, [direct, dataLive]);

  return (
    <>
      {/* ── opening: the machine, not a centered hero ───── */}
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden className="pointer-events-none absolute inset-0">
              <img
                src={panelImg}
                alt=""
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="h-full w-full object-cover object-[68%_58%] opacity-[0.3]"
              />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/88 to-ink/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
          <div className="blueprint absolute inset-0 opacity-80" />
        </div>

        <div className="wrap relative grid gap-10 py-12 md:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 border border-amber/40 bg-amber/10 px-2.5 py-1">
                <Lamp on pulse />
                <Micro className="text-amber">HIP-3 LIVE · 10 VENUE</Micro>
              </span>
              <Micro className="text-dim">BUILD 2.4.1 · HYPERCORE L1</Micro>
            </div>

            <h1 className="grad-text mt-6 text-[clamp(2.1rem,6.4vw,4.4rem)] font-bold leading-[0.94] tracking-[-0.04em]">
              Luncurkan ticker.
              <br />
              <span className="text-amber">Perdagangkan selamanya.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[14.5px] leading-relaxed text-dim">
              Graduate adalah launchpad sekaligus lantai perdagangan: bonding curve sampai
              likuiditas terkunci di Uniswap, lalu buku pesanan spot dan perpetual builder-deployed
              di HyperCore — satu akun margin, satu dompet.
            </p>
            <p className="mt-4 max-w-md font-serif text-[clamp(1.05rem,2vw,1.35rem)] italic leading-snug text-bone/70">
              Tidak ada komite listing. Yang ada kurva, kunci, dan buku pesanan.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Btn href="#/pipeline" variant="primary">
                Mulai pipeline →
              </Btn>
              <Btn href="#/trade" variant="ghost">
                Buka terminal trade
              </Btn>
              <Btn href="#/dokumentasi" variant="quiet">
                Baca dokumentasi
              </Btn>
            </div>
          </motion.div>

          {/* live graduation watch */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <Card
              title="Pantau gradasi"
              kicker="KURVA AKTIF"
              tools={
                <span className="flex items-center gap-2">
                  <Lamp on color="mint" pulse />
                  <Micro className="text-mint">LIVE</Micro>
                </span>
              }
              bodyClass="p-4"
            >
              <ul className="space-y-4">
                {queue.map((l) => {
                  const p = l.raised / l.target;
                  return (
                    <li key={l.ticker}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-baseline gap-2">
                          <span className="font-mono text-[12px] font-bold text-bone">{l.ticker}</span>
                          <span className="truncate text-[11.5px] text-dim">{l.name}</span>
                        </span>
                        <span className="tnum shrink-0 font-mono text-[11px] text-amber">
                          {(p * 100).toFixed(1).replace(".", ",")}%
                        </span>
                      </div>
                      <Meter value={p} className="mt-2" segments={40} />
                      <div className="mt-1.5 flex justify-between">
                        <Micro className="text-dim">
                          {fmt.n(l.raised, 0)} / {fmt.n(l.target, 0)} SOL
                        </Micro>
                        <Micro className="text-dim">MCAP {fmt.usd(l.mcap, 0)}</Micro>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 border-t border-edge pt-3">
                <Btn href="#/launchpad" variant="quiet" className="w-full">
                  Lihat 164 token di kurva →
                </Btn>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── KPI strip ─────────────────────────────────── */}
      <section className="border-b border-edge bg-[#0c1013]">
        <div className="wrap grid grid-cols-2 gap-px bg-edge md:grid-cols-3 xl:grid-cols-5">
          {kpi.map(([k, v, d, spark, up], i) => (
            <div key={k} className="group bg-[#0e1216] px-4 py-5 transition-colors hover:bg-[#13181c]">
              <div className="flex items-start justify-between gap-2">
                <Micro className="text-dim">{k}</Micro>
                <span className="tnum font-mono text-[9px] text-edge">0{i + 1}</span>
              </div>
              <div className="tnum mt-3 font-mono text-[22px] font-bold leading-none text-bone">{v}</div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className={`micro engrave text-[9px] ${up ? "text-mint" : "text-dim"}`}>{d}</span>
                <Sparkline values={spark} w={72} h={22} up={up} className="opacity-80 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── control room ──────────────────────────────── */}
      <section className="wrap py-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <Reveal>
            <Card
              title="Penggerak pasar"
              kicker="24 JAM · SEMUA VENUE"
              tools={<Micro className="text-dim">URUT |PERUBAHAN|</Micro>}
            >
              <ul>
                {movers.map((m) => (
                  <li key={m.pair}>
                    <a
                      href="#/pasar"
                      className="grid grid-cols-[1.5fr_auto] items-center gap-3 border-b border-edge/70 px-4 py-3 transition-colors last:border-0 hover:bg-[#161b20] sm:grid-cols-[1.6fr_0.8fr_0.7fr_auto]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Lamp on={m.status === "LIVE"} color={m.status === "LIVE" ? "mint" : "blood"} />
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[12px] font-bold text-bone">{m.pair}</span>
                          <Micro className="text-dim">{m.name}</Micro>
                        </span>
                      </span>
                      <span className="hidden sm:block">
                        <Sparkline values={m.spark} w={92} h={26} up={m.change >= 0} />
                      </span>
                      <span className="tnum hidden text-right font-mono text-[12px] text-bone sm:block">
                        {m.price >= 1 ? fmt.n(m.price, 2) : m.price.toFixed(7)}
                      </span>
                      <span
                        className={`tnum justify-self-end font-mono text-[12px] ${
                          m.change >= 0 ? "text-mint" : "text-blood"
                        }`}
                      >
                        {fmt.pct(m.change)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={0.06}>
              <Card
                title="Tape eksekusi"
                kicker="HYPERCORE"
                tools={<Lamp on={pulse >= 0} pulse />}
                bodyClass="p-0"
              >
                <ul className="max-h-[286px] overflow-hidden">
                  {fills.map((f, i) => (
                    <li
                      key={`${f.t}-${i}`}
                      className="tnum flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-[7px] font-mono text-[11px] last:border-0"
                      style={{ opacity: 1 - i * 0.06 }}
                    >
                      <span className="text-dim">{f.t}</span>
                      <span className="truncate text-bone/80">{f.pair}</span>
                      <span className={f.side === "BUY" ? "text-mint" : "text-blood"}>{f.side}</span>
                      <span className="text-bone">{fmt.compact(f.size)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card title="Peta funding" kicker="8 JAM KE DEPAN" bodyClass="p-4">
                <div className="grid grid-cols-6 gap-[3px]">
                  {MARKETS.slice(0, 12).map((m) => (
                    <HeatCell key={m.pair} v={m.funding} label={m.pair} />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Micro className="text-dim">−0,020% → +0,020%</Micro>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-6 bg-blood/50" />
                    <span className="h-2 w-6 bg-mint/50" />
                  </span>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>

        <Divider label="KURVA EKUITAS AKUN DEMO · 64 HARI" />

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card title="Ekuitas" kicker="USDC" tools={<Micro className="text-mint">+41,8% PERIODE</Micro>} bodyClass="p-4">
            <AreaCurve values={EQUITY} height={168} />
            <div className="mt-3 grid grid-cols-3 gap-px border border-edge bg-edge">
              {[
                ["NILAI AKUN", fmt.usd(18_402, 2)],
                ["PNL BELUM REALISASI", "+$1.284,20"],
                ["MARGIN TERPAKAI", "23,4%"],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0e1216] px-3 py-2.5">
                  <Micro className="text-dim">{k}</Micro>
                  <div className="tnum mt-1 font-mono text-[13px] text-bone">{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Status sistem" kicker="SEMUA SUBSISTEM" bodyClass="p-4">
            {[
              ["Matching engine", "NORMAL", "mint"],
              ["Feed orakel (deployer)", "NORMAL", "mint"],
              ["Bridge USDC", "NORMAL", "mint"],
              ["Lelang ticker HIP-1", "AKTIF", "amber"],
              ["flex:GBPJPY", "HALT TRADING", "blood"],
            ].map(([k, v, tone]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-edge/70 py-2.5 last:border-0">
                <span className="flex items-center gap-2.5">
                  <Lamp on color={tone as "mint" | "amber" | "blood"} />
                  <span className="text-[12.5px] text-bone/85">{k}</span>
                </span>
                <Micro className={tone === "mint" ? "text-mint" : tone === "blood" ? "text-blood" : "text-amber"}>
                  {v}
                </Micro>
              </div>
            ))}
            <div className="mt-4 border-t border-edge pt-3">
              <KV k="Pemeliharaan terjadwal" v="TIDAK ADA" tone="mint" />
              <KV k="Insiden 30 hari" v="0" />
            </div>
          </Card>
        </div>
      </section>

      {/* ── three doors, asymmetric ───────────────────── */}
      <section className="border-y border-edge bg-[#0c1013]">
        <div className="wrap py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Reveal>
              <a href="#/pipeline" className="card group relative flex h-full flex-col justify-between overflow-hidden p-6 transition-colors hover:border-amber md:p-8">
                <div aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber/[0.08] blur-3xl transition-opacity duration-500 group-hover:bg-amber/[0.14]" />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <Lamp on />
                    <Micro className="text-amber">06 · PIPELINE TOKEN</Micro>
                  </div>
                  <h3 className="mt-4 text-[clamp(1.6rem,3.6vw,2.6rem)] font-bold leading-[0.94] tracking-[-0.035em]">
                    CREATE → TRADING →
                    <br />
                    GRADUATE → POOL → SELESAI
                  </h3>
                  <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-dim">
                    Mesin lima stasiun dengan bonding curve hidup. Tekan RUN dan chip token
                    berjalan sendiri sampai likuiditas terkunci, atau ambil alih tiap stasiun.
                  </p>
                </div>
                <div className="relative mt-8">
                  <div className="relative h-[10px]">
                    <div className="groove absolute inset-x-0 top-1/2 h-[8px] -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 h-[8px] w-[62%] -translate-y-1/2 bg-amber shadow-[0_0_14px_rgba(217,255,77,.55)]" />
                  </div>
                  <div className="mt-3 flex justify-between">
                    {["CREATE", "TRADING", "GRADUATE", "POOL", "SELESAI"].map((s, i) => (
                      <Micro key={s} className={i <= 2 ? "text-bone" : "text-dim"}>
                        {s}
                      </Micro>
                    ))}
                  </div>
                </div>
              </a>
            </Reveal>

            <div className="grid gap-6">
              <Reveal delay={0.06}>
                <a href="#/trade" className="card group flex items-center justify-between gap-4 p-5 transition-colors hover:border-mint">
                  <div>
                    <Micro className="text-mint">03 · TERMINAL TRADE</Micro>
                    <h3 className="mt-2 text-xl font-bold tracking-tight">Grafik & buku</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
                      Candlestick, kedalaman, tiket order, posisi terbuka.
                    </p>
                  </div>
                  <span className="flex items-end gap-[2px]" aria-hidden>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className={`w-[5px] ${i % 3 === 0 ? "bg-blood/70" : "bg-mint/70"}`} style={{ height: `${8 + ((i * 7) % 34)}px` }} />
                    ))}
                  </span>
                </a>
              </Reveal>
              <Reveal delay={0.1}>
                <a href="#/hip-3" className="card group flex items-center justify-between gap-4 p-5 transition-colors hover:border-amber">
                  <div>
                    <Micro className="text-amber">05 · HIP-3 DEPLOYER</Micro>
                    <h3 className="mt-2 text-xl font-bold tracking-tight">Konsol deployer</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
                      Stake 500.000 HYPE, fee scale, batas OI, halt trading.
                    </p>
                  </div>
                  <Screw className="transition-transform duration-500 group-hover:rotate-90" />
                </a>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
