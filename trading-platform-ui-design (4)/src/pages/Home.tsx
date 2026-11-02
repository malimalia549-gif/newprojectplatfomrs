import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Btn, Reveal, fmt } from "../components/ui";
import { PriceChart } from "../components/PriceChart";
import { Sparkline } from "../components/charts";
import { DexDirectory, Glyph } from "../components/terminal";
import { TokenAvatar } from "../components/token";
import { LAUNCHES } from "../lib/data";
import { fmtPx, fmtSz, useBook, useCandles, useMarkets, type Mkt } from "../lib/hl";
import { useApp } from "../store";

/* ── hero preview: terminal mini dengan data BTC sungguhan ── */
function HeroPreview() {
  const { net } = useApp();
  const { main } = useMarkets(net);
  const btc = main.find((m) => m.key === "BTC");
  const book = useBook(net, "BTC");
  const { rows, loading } = useCandles(net, "BTC", "15m", 72);
  const d = btc?.szDecimals ?? 5;
  const mid = book.bids[0] && book.asks[0] ? (book.bids[0].px + book.asks[0].px) / 2 : (btc?.mark ?? 0);
  const asks = book.asks.slice(0, 6);
  const bids = book.bids.slice(0, 6);
  const maxSz = Math.max(...asks.map((l) => l.sz), ...bids.map((l) => l.sz), 0.0001);
  const row = (px: number, sz: number, side: "bid" | "ask") => (
    <div key={`${side}${px}`} className="relative flex h-[19px] items-center justify-between text-[10.5px]">
      <span
        className={`absolute inset-y-[2px] right-0 rounded-sm transition-[width] duration-300 ${side === "bid" ? "bg-mint/[0.12]" : "bg-blood/[0.12]"}`}
        style={{ width: `${(sz / maxSz) * 100}%` }}
      />
      <span className={`num relative ${side === "bid" ? "text-mint" : "text-blood"}`}>{fmtPx(px, d)}</span>
      <span className="num relative text-bone/75">{fmtSz(sz, Math.min(d, 3))}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative lg:pl-8"
    >
      <div className="glass absolute -top-[76px] right-0 z-10 hidden items-center gap-3 rounded-2xl px-4 py-3 md:flex">
        <TokenAvatar t="KUDA" size={34} />
        <div>
          <div className="text-[12.5px] font-semibold">KUDA lulus ke Uniswap</div>
          <div className="text-[11px] text-dim">LP terkunci 365 hari · siap masuk buku</div>
        </div>
        <span className="ml-1 h-2 w-2 rounded-full bg-mint animate-blink" />
      </div>

      <div className="card overflow-hidden p-0 shadow-[0_60px_120px_-50px_rgba(0,0,0,.95)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Glyph name="BTC" size={26} />
            <div>
              <div className="text-[13.5px] font-semibold">BTC-USD</div>
              <div className="text-[11px] text-dim">HyperCore perp · maks {btc?.maxLev ?? 40}×</div>
            </div>
          </div>
          <div className="text-right">
            <div className="num text-[18px] font-semibold tracking-[-0.02em]">{mid ? fmtPx(mid, d) : "—"}</div>
            <div className={`num text-[11.5px] ${btc && btc.change < 0 ? "text-blood" : "text-mint"}`}>
              {btc ? fmt.pct(btc.change) : "—"} · 24j
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_148px]">
          <div className="border-r border-white/[0.06] px-1 pt-2">
            <PriceChart data={rows} height={262} interval="15m" compact loading={loading} fmtPrice={(p) => fmtPx(p, d)} />
          </div>
          <div className="flex flex-col justify-center px-3 py-2">
            {asks.length === 0
              ? Array.from({ length: 12 }).map((_, i) => <span key={i} className="skeleton my-[4px] block h-[11px] rounded" />)
              : [...asks].reverse().map((l) => row(l.px, l.sz, "ask"))}
            <div className="num my-1 border-y border-white/[0.06] py-1 text-center text-[11px] text-bone">{mid ? fmtPx(mid, d) : "—"}</div>
            {bids.map((l) => row(l.px, l.sz, "bid"))}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/[0.06] text-[11px]">
          {[
            ["Funding / 1j", btc ? `${(btc.funding * 100).toFixed(4).replace(".", ",")}%` : "—"],
            ["Open interest", btc ? fmt.usd(btc.oi, 0) : "—"],
            ["Volume 24j", btc ? fmt.usd(btc.vol, 0) : "—"],
          ].map(([k, v], i) => (
            <div key={k} className={`px-4 py-2.5 ${i ? "border-l border-white/[0.06]" : ""}`}>
              <div className="text-dim">{k}</div>
              <div className="num mt-0.5 text-[12px] text-bone">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass absolute -bottom-12 -left-2 z-10 hidden w-[236px] rounded-2xl p-4 md:block lg:left-0">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold">Long BTC</span>
          <span className="num rounded-md bg-amber/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber">10× cross</span>
        </div>
        <div className="mt-3 space-y-1.5 text-[11.5px]">
          <div className="flex justify-between">
            <span className="text-dim">Ukuran</span>
            <span className="num">$2.500,00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Margin</span>
            <span className="num">$250,00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Est. likuidasi</span>
            <span className="num text-blood">{mid ? fmtPx(mid * 0.9125, d) : "—"}</span>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-mint py-2 text-center text-[12px] font-semibold text-ink">Beli / Long</div>
      </div>
    </motion.div>
  );
}

/* ── pasar teratas (data nyata + sparkline 24 jam) ─────────── */
function MiniMarket({ m }: { m: Mkt }) {
  const { net, setMarketKey } = useApp();
  const { rows } = useCandles(net, m.key, "1h", 24);
  const vals = rows.length > 1 ? rows.map((r) => r.c) : [m.prev, m.mark];
  return (
    <button
      onClick={() => {
        setMarketKey(m.key);
        window.location.hash = "#/trade";
      }}
      className="card card-hover p-3.5 text-left"
    >
      <div className="flex items-center gap-2">
        <Glyph name={m.key} size={22} />
        <span className="text-[13px] font-semibold">{m.base}</span>
        <span className={`num ml-auto text-[11.5px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(m.change)}</span>
      </div>
      <div className="num mt-2.5 text-[16px] font-semibold tracking-[-0.01em]">{fmtPx(m.mark, m.szDecimals)}</div>
      <Sparkline values={vals} w={180} h={32} up={m.change >= 0} className="mt-2 w-full" />
      <div className="num mt-1 text-[10.5px] text-dim">Vol {fmt.usd(m.vol, 0)}</div>
    </button>
  );
}

/* ── diagram alur: CREATE → … → SELESAI, cabang ke perp ──── */
type Node = { id: string; label: string; sub: string; detail: string; facts: [string, string][]; cta: [string, string] };

const MAIN: Node[] = [
  {
    id: "create",
    label: "Create",
    sub: "Ticker & kurva",
    detail: "Pilih ticker, nama, dan supply. Kontrak bonding curve langsung aktif — tanpa kurasi, tanpa komite listing.",
    facts: [
      ["Biaya", "$0"],
      ["Supply", "1 miliar"],
    ],
    cta: ["Buka pipeline", "#/pipeline"],
  },
  {
    id: "trading",
    label: "Trading",
    sub: "Bonding curve",
    detail: "Setiap pembelian menaikkan harga di sepanjang kurva eksponensial. Siapa pun bisa membeli dan menjual sejak detik pertama.",
    facts: [
      ["Kurva", "Eksponensial"],
      ["Target", "8.531 SOL"],
    ],
    cta: ["Lihat launchpad", "#/launchpad"],
  },
  {
    id: "graduate",
    label: "Graduate",
    sub: "Kurva penuh",
    detail: "Saat target tercapai, kurva ditutup dan likuiditas dipindahkan otomatis. Tidak ada alokasi tim tersembunyi.",
    facts: [
      ["Ke pool", "80% likuiditas"],
      ["Biaya", "$199"],
    ],
    cta: ["Aturan graduasi", "#/dokumentasi"],
  },
  {
    id: "pool",
    label: "Uniswap pool",
    sub: "LP terkunci",
    detail: "Pool Uniswap dibuat dan token LP dikunci 365 hari. Creator menerima 1,2% fee pool secara otomatis.",
    facts: [
      ["Kunci LP", "365 hari"],
      ["Fee creator", "1,2%"],
    ],
    cta: ["Contoh token lulus", "#/token/KUDA"],
  },
  {
    id: "done",
    label: "Selesai",
    sub: "Token hidup",
    detail: "Token berdiri sendiri dengan likuiditas permanen. Jalur launchpad berakhir di sini — jalur perdagangan dimulai.",
    facts: [
      ["Status", "Lulus"],
      ["Rerata", "11 menit"],
    ],
    cta: ["Token yang sudah lulus", "#/launchpad"],
  },
];
const BRANCH: Node[] = [
  {
    id: "buy",
    label: "Beli ticker",
    sub: "Masuk pasar",
    detail: "Pemegang dan trader baru membeli ticker. Order dikirim ke HyperCore lewat jalur yang sama dengan pasar lain.",
    facts: [
      ["Kolateral", "USDC"],
      ["Order", "Market · Limit"],
    ],
    cta: ["Buka market", "#/pasar"],
  },
  {
    id: "book",
    label: "HyperCore orderbook",
    sub: "CLOB on-chain",
    detail: "Matching engine on-chain HyperCore: buku pesanan penuh, eksekusi deterministik, data publik realtime via WebSocket.",
    facts: [
      ["Data", "WebSocket"],
      ["Kustodi", "Tidak ada"],
    ],
    cta: ["Buka terminal", "#/trade"],
  },
  {
    id: "perp",
    label: "HIP-3 perp",
    sub: "Builder-deployed",
    detail: "Deployer HIP-3 membuka kontrak perpetual dengan orakel, leverage, dan batas OI sendiri — diperdagangkan di buku yang sama.",
    facts: [
      ["Stake", "500.000 HYPE"],
      ["ID aset", "100000 + dex×10000 + i"],
    ],
    cta: ["Lihat DEX builder", "#/hip-3"],
  },
];
const ORDER = ["create", "trading", "graduate", "pool", "done", "buy", "book", "perp"];
const ALL_NODES = [...MAIN, ...BRANCH];

/* posisi grid desktop (kolom 0-4, baris 0-2) */
const POS: Record<string, [number, number]> = {
  create: [0, 0],
  trading: [1, 0],
  graduate: [2, 0],
  pool: [3, 0],
  done: [4, 0],
  buy: [3, 1],
  book: [4, 1],
  perp: [4, 2],
};
const ROW_H = 104;
const ROW_GAP = 52;
const rowTop = (r: number) => r * (ROW_H + ROW_GAP);

function FlowDiagram() {
  const [active, setActive] = useState("create");
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setActive((a) => ORDER[(ORDER.indexOf(a) + 1) % ORDER.length]), 2600);
    return () => clearInterval(id);
  }, [auto]);
  const node = ALL_NODES.find((n) => n.id === active) ?? MAIN[0];
  const pick = (id: string) => {
    setAuto(false);
    setActive(id);
  };
  const lit = (id: string) => ORDER.indexOf(id) <= ORDER.indexOf(active);

  const card = (n: Node, i: number) => {
    const on = n.id === active;
    return (
      <button
        key={n.id}
        onMouseEnter={() => pick(n.id)}
        onFocus={() => pick(n.id)}
        onClick={() => pick(n.id)}
        className={`h-full w-full rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
          on
            ? "border-amber/50 bg-[#151a10] shadow-[0_0_0_4px_rgba(217,255,77,.08),0_20px_40px_-20px_rgba(217,255,77,.35)]"
            : lit(n.id)
              ? "border-white/[0.12] bg-[#0e1215]"
              : "border-white/[0.07] bg-[#0b0e11]"
        }`}
      >
        <span className={`num text-[10.5px] ${on ? "text-amber" : "text-dim"}`}>{String(i).padStart(2, "0")}</span>
        <span className="mt-1 block text-[14px] font-semibold leading-[1.2] tracking-[-0.01em]">{n.label}</span>
        <span className="block text-[11.5px] text-dim">{n.sub}</span>
      </button>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* desktop diagram */}
      <div className="relative hidden lg:block" style={{ height: rowTop(2) + ROW_H }}>
        <div className="absolute left-[10%] right-[10%] h-[2px] rounded-full bg-white/[0.08]" style={{ top: ROW_H / 2 }}>
          <div className="flow-x absolute inset-0 rounded-full" />
        </div>
        <div className="absolute w-[2px] -translate-x-1/2 rounded-full bg-white/[0.08]" style={{ left: "70%", top: ROW_H, height: ROW_GAP }}>
          <div className="flow-y absolute inset-0 rounded-full" />
        </div>
        <div className="absolute h-[2px] rounded-full bg-white/[0.08]" style={{ left: "70%", width: "20%", top: rowTop(1) + ROW_H / 2 }}>
          <div className="flow-x absolute inset-0 rounded-full" />
        </div>
        <div
          className="absolute w-[2px] -translate-x-1/2 rounded-full bg-white/[0.08]"
          style={{ left: "90%", top: rowTop(1) + ROW_H, height: ROW_GAP }}
        >
          <div className="flow-y absolute inset-0 rounded-full" />
        </div>
        <span className="absolute text-[11px] text-dim" style={{ left: "calc(70% + 12px)", top: ROW_H + ROW_GAP / 2 - 8 }}>
          jalur perdagangan
        </span>
        {ALL_NODES.map((n, i) => {
          const [c, r] = POS[n.id];
          return (
            <div
              key={n.id}
              className="absolute"
              style={{ left: `calc(${c * 20}% + 8px)`, width: "calc(20% - 16px)", top: rowTop(r), height: ROW_H }}
            >
              {card(n, i + 1)}
            </div>
          );
        })}
      </div>

      {/* mobile list */}
      <div className="space-y-2 lg:hidden">
        {MAIN.map((n, i) => (
          <div key={n.id}>
            <div className="h-[84px]">{card(n, i + 1)}</div>
            {n.id === "pool" && (
              <div className="ml-6 mt-2 space-y-2 border-l border-dashed border-white/15 pl-4">
                {BRANCH.map((b, j) => (
                  <div key={b.id} className="h-[84px]">
                    {card(b, MAIN.length + j + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* detail */}
      <div className="card p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-amber">
                Tahap {ORDER.indexOf(node.id) + 1} dari {ORDER.length}
              </span>
              {auto && <span className="text-[11px] text-dim">Otomatis</span>}
            </div>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em]">{node.label}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{node.detail}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {node.facts.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[11px] text-dim">{k}</div>
                  <div className="num mt-0.5 text-[13px] font-medium">{v}</div>
                </div>
              ))}
            </div>
            <Btn href={node.cta[1]} variant="ghost" className="mt-4 w-full">
              {node.cta[0]} →
            </Btn>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="text-[12.5px] font-medium text-amber">{eyebrow}</div>
      <h2 className="mt-2 text-[clamp(1.7rem,3.6vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.04em]">{title}</h2>
      {lead ? <p className="mt-3 text-[15px] leading-relaxed text-dim">{lead}</p> : null}
    </div>
  );
}

export default function Home() {
  const { net, setMarketKey } = useApp();
  const { main, hip3, dexes } = useMarkets(net);
  const all = useMemo(() => [...main, ...hip3], [main, hip3]);
  const vol = all.reduce((s, m) => s + m.vol, 0);
  const oi = all.reduce((s, m) => s + m.oi, 0);
  const top = useMemo(() => [...main].sort((a, b) => b.vol - a.vol).slice(0, 6), [main]);
  const activeDex = useMemo(() => new Set(hip3.map((m) => m.dex)).size, [hip3]);
  const terminalRows = useMemo(() => [...all].sort((a, b) => b.vol - a.vol).slice(0, 6), [all]);
  const curve = LAUNCHES.filter((l) => l.status === "CURVE")
    .sort((a, b) => b.raised / b.target - a.raised / a.target)
    .slice(0, 5);

  return (
    <>
      {/* ── hero ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div aria-hidden className="aurora pointer-events-none absolute -left-48 -top-48 h-[560px] w-[780px] opacity-60" />
        <div aria-hidden className="grid-veil pointer-events-none absolute inset-0" />
        <div className="wrap relative grid gap-16 pb-20 pt-14 md:pt-20 lg:grid-cols-[1fr_1.04fr] lg:items-center lg:pb-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}>
            <a
              href="#/hip-3"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[12.5px] text-dim transition-colors hover:text-bone"
            >
              <span className="rounded-full bg-amber px-2 py-0.5 text-[11px] font-semibold text-ink">Live</span>
              {activeDex ? `HIP-3 aktif di ${activeDex} DEX builder` : `HIP-3 · ${dexes.length || ""} DEX builder`.replace(" ·  ", " · ")}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <h1 className="mt-6 text-[clamp(2.3rem,4.3vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.05em]">
              <span className="grad-text block">Luncurkan token.</span>
              <span className="grad-text block">Perdagangkan</span>
              <span className="block">
                <span className="grad-text">sebagai</span> <span className="text-amber">perpetual.</span>
              </span>
            </h1>
            <p className="mt-6 max-w-[540px] text-[16px] leading-relaxed text-dim">
              Graduate menyatukan launchpad bonding curve dengan terminal perpetual di HyperCore. Luncurkan token, lulus
              ke Uniswap, lalu perdagangkan di buku pesanan on-chain — dari satu dompet, tanpa kustodi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href="#/trade" variant="primary" className="px-5 py-3">
                Buka terminal
              </Btn>
              <Btn href="#/launchpad" variant="ghost" className="px-5 py-3">
                Jelajahi launchpad
              </Btn>
            </div>
            <dl className="mt-12 grid max-w-[540px] grid-cols-3 gap-6 border-t border-white/[0.07] pt-6">
              {[
                ["Volume 24 jam", vol ? fmt.usd(vol, 0) : "—"],
                ["Open interest", oi ? fmt.usd(oi, 0) : "—"],
                ["Pasar perp", all.length ? fmt.n(all.length) : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-dim">{k}</dt>
                  <dd className="num mt-1 text-[20px] font-semibold tracking-[-0.02em]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex items-center gap-2 text-[11.5px] text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-blink" />
              Data langsung dari HyperCore {net === "mainnet" ? "mainnet" : "testnet"}
            </p>
          </motion.div>
          <HeroPreview />
        </div>
      </section>

      {/* ── pasar teratas ───────────────────────────── */}
      <section className="wrap py-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12.5px] font-medium text-amber">Pasar teratas</div>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">Paling aktif 24 jam terakhir</h2>
          </div>
          <Btn href="#/pasar" variant="quiet" className="px-0">
            Semua pasar →
          </Btn>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {top.length
            ? top.map((m) => <MiniMarket key={m.key} m={m} />)
            : Array.from({ length: 6 }).map((_, i) => <span key={i} className="skeleton h-[138px] rounded-2xl" />)}
        </div>
      </section>

      {/* ── cara kerja ──────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.012]">
        <div className="wrap py-20">
          <Reveal>
            <SectionTitle
              eyebrow="Cara kerja"
              title="Dari ticker pertama sampai kontrak perpetual."
              lead="Satu alur, dua jalur. Jalur launchpad membawa token sampai lulus; jalur perdagangan membawanya ke buku pesanan HyperCore dan pasar HIP-3."
            />
          </Reveal>
          <Reveal delay={0.08} className="mt-12">
            <FlowDiagram />
          </Reveal>
        </div>
      </section>

      {/* ── bento ───────────────────────────────────── */}
      <section className="wrap py-20">
        <Reveal>
          <SectionTitle eyebrow="Platform" title="Satu akun untuk seluruh siklus token." />
        </Reveal>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="card h-full overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                <div>
                  <div className="text-[12px] font-medium text-amber">Terminal perpetual</div>
                  <h3 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em]">Buku pesanan HyperCore, realtime.</h3>
                  <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-dim">
                    Candle, buku, dan transaksi mengalir lewat WebSocket. Order market & limit, leverage hingga batas pasar,
                    serta pasar HIP-3 dari semua DEX builder.
                  </p>
                </div>
                <Btn href="#/trade" variant="primary">
                  Buka terminal
                </Btn>
              </div>
              <div className="border-t border-white/[0.06]">
                {terminalRows.length === 0
                  ? Array.from({ length: 6 }).map((_, i) => <span key={i} className="skeleton mx-6 my-3 block h-6 rounded" />)
                  : terminalRows.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => {
                          setMarketKey(m.key);
                          window.location.hash = "#/trade";
                        }}
                        className="grid w-full grid-cols-[1.4fr_1fr_0.8fr] items-center gap-3 border-b border-white/[0.04] px-6 py-2.5 text-left transition-colors last:border-0 hover:bg-white/[0.03] sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_0.9fr]"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Glyph name={m.key} size={22} />
                          <span className="truncate text-[13px] font-medium">{m.base}-USD</span>
                          {m.dex && <span className="rounded border border-white/10 px-1 text-[10px] text-dim">{m.dex}</span>}
                        </span>
                        <span className="num text-right text-[12.5px]">{fmtPx(m.mark, m.szDecimals)}</span>
                        <span className={`num text-right text-[12.5px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(m.change)}</span>
                        <span className="num hidden text-right text-[12px] text-dim sm:block">{fmt.usd(m.vol, 0)}</span>
                        <span className={`num hidden text-right text-[12px] sm:block ${m.funding >= 0 ? "text-mint" : "text-blood"}`}>
                          {(m.funding * 100).toFixed(4).replace(".", ",")}%
                        </span>
                      </button>
                    ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="card flex h-full flex-col p-6">
              <div className="text-[12px] font-medium text-amber">Launchpad</div>
              <h3 className="mt-1.5 text-[20px] font-semibold tracking-[-0.03em]">Hampir lulus</h3>
              <div className="mt-5 flex-1 space-y-4">
                {curve.map((l) => {
                  const p = l.raised / l.target;
                  return (
                    <a key={l.ticker} href={`#/token/${l.ticker}`} className="group block">
                      <div className="flex items-center gap-3">
                        <TokenAvatar t={l.ticker} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold group-hover:text-amber">{l.name}</span>
                            <span className="num text-[12px] text-amber">{(p * 100).toFixed(1).replace(".", ",")}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <div className="h-full rounded-full bg-amber" style={{ width: `${p * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
              <Btn href="#/launchpad" variant="ghost" className="mt-6 w-full">
                Semua token →
              </Btn>
            </div>
          </Reveal>

          <Reveal delay={0.04}>
            <div className="card h-full overflow-hidden">
              <div className="p-6 pb-3">
                <div className="text-[12px] font-medium text-amber">HIP-3</div>
                <h3 className="mt-1.5 text-[20px] font-semibold tracking-[-0.03em]">DEX builder aktif</h3>
                <p className="mt-1.5 text-[12.5px] text-dim">Langsung dari direktori perpDexs.</p>
              </div>
              <DexDirectory limit={6} compact />
            </div>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-2">
            <div className="card h-full p-6">
              <div className="text-[12px] font-medium text-amber">Keamanan eksekusi</div>
              <h3 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em]">Non-kustodial dari ujung ke ujung.</h3>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  ["Satu persetujuan", "Dompet Anda menandatangani approveAgent sekali. Setelah itu order dikirim tanpa pop-up."],
                  ["Agen tanpa hak tarik", "Kunci agen tersimpan di browser Anda dan hanya bisa trading — tidak bisa menarik dana."],
                  ["Signing terverifikasi", "Tanda tangan EIP-712 identik byte-per-byte dengan vektor uji resmi SDK Hyperliquid."],
                ].map(([t, dsc], i) => (
                  <div key={t} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <span className="num text-[11px] text-amber">0{i + 1}</span>
                    <div className="mt-2 text-[14px] font-semibold">{t}</div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{dsc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#080a0d] px-4 py-3 font-mono text-[11.5px] leading-relaxed text-dim">
                <span className="text-mint">connectionId</span> = keccak(msgpack(action) ‖ nonce ‖ 0x00) →{" "}
                <span className="text-bone">EIP-712 Agent</span> · chainId 1337
              </div>
              <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06]">
                {[
                  ["Vektor uji resmi", "8 / 8 cocok"],
                  ["Hak agen", "Trade saja"],
                  ["Konfirmasi mainnet", "Selalu"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#0b0e11] px-4 py-3">
                    <div className="text-[11px] text-dim">{k}</div>
                    <div className="num mt-0.5 text-[13px] text-mint">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="wrap pb-24">
        <div className="card relative overflow-hidden px-6 py-14 text-center md:px-12">
          <div aria-hidden className="aurora pointer-events-none absolute left-1/2 top-[-60%] h-[360px] w-[720px] -translate-x-1/2 opacity-70" />
          <h2 className="relative text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-0.045em]">
            Ticker berikutnya bisa milik Anda.
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-dim">
            Luncurkan di kurva hari ini, perdagangkan di buku pesanan HyperCore besok.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Btn href="#/pipeline" variant="primary" className="px-5 py-3">
              Luncurkan token
            </Btn>
            <Btn href="#/trade" variant="ghost" className="px-5 py-3">
              Mulai trading
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
