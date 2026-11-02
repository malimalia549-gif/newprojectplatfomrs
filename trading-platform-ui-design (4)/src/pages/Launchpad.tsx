import { useMemo, useState } from "react";
import { Btn, Reveal, fmt } from "../components/ui";
import { Sparkline } from "../components/charts";
import { TokenAvatar } from "../components/token";
import { LAUNCHES, type Launch } from "../lib/data";

type Tab = "trending" | "dekat" | "baru" | "lulus";
const TABS: [Tab, string][] = [
  ["trending", "Trending"],
  ["dekat", "Hampir lulus"],
  ["baru", "Terbaru"],
  ["lulus", "Sudah lulus"],
];
export const ageLabel = (m: number) => (m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${m % 60} mnt`);

function TokenCard({ l }: { l: Launch }) {
  const p = Math.min(1, l.raised / l.target);
  const done = l.status === "GRADUATED";
  return (
    <a href={`#/token/${l.ticker}`} className="card card-hover group flex flex-col p-4">
      <div className="flex items-start gap-3">
        <TokenAvatar t={l.ticker} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[14px] font-semibold tracking-[-0.01em] group-hover:text-amber">{l.name}</span>
            {done ? (
              <span className="shrink-0 rounded-full bg-mint/[0.12] px-2 py-0.5 text-[10.5px] font-semibold text-mint">Lulus</span>
            ) : (
              <span className="shrink-0 text-[11px] text-dim">{ageLabel(l.ageMin)}</span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-dim">
            ${l.ticker} · {l.creator}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] text-dim">Market cap</div>
          <div className="num text-[16px] font-semibold tracking-[-0.01em]">{fmt.usd(l.mcap, 0)}</div>
        </div>
        <Sparkline values={l.spark} w={88} h={30} up />
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className={`h-full rounded-full ${done ? "bg-mint" : "bg-amber"}`} style={{ width: `${p * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-dim">
          <span className="num">{done ? "Kurva penuh" : `${(p * 100).toFixed(1).replace(".", ",")}% ke graduate`}</span>
          <span className="num">{fmt.n(l.holders)} holder</span>
        </div>
      </div>
    </a>
  );
}

export default function Launchpad() {
  const [tab, setTab] = useState<Tab>("trending");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = LAUNCHES.filter((l) => !s || `${l.ticker} ${l.name}`.toLowerCase().includes(s));
    if (tab === "dekat")
      return list.filter((l) => l.status === "CURVE").sort((a, b) => b.raised / b.target - a.raised / a.target);
    if (tab === "baru") return [...list].sort((a, b) => a.ageMin - b.ageMin);
    if (tab === "lulus") return list.filter((l) => l.status === "GRADUATED");
    return [...list].sort((a, b) => b.holders - a.holders);
  }, [tab, q]);

  const hot = useMemo(
    () => LAUNCHES.filter((l) => l.status === "CURVE").sort((a, b) => b.raised / b.target - a.raised / a.target)[0],
    [],
  );
  const stats = useMemo(() => {
    const curve = LAUNCHES.filter((l) => l.status === "CURVE");
    return [
      ["Token di kurva", fmt.n(curve.length), "aktif sekarang"],
      ["Lulus 24 jam", fmt.n(LAUNCHES.length - curve.length + 35), "rerata 11 menit"],
      ["SOL di kurva", fmt.n(curve.reduce((s, l) => s + l.raised, 0)), "terkumpul"],
      ["Holder unik", fmt.n(LAUNCHES.reduce((s, l) => s + l.holders, 0)), "lintas token"],
    ];
  }, []);
  const hp = hot.raised / hot.target;

  return (
    <div className="wrap py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="text-[12.5px] font-medium text-amber">Launchpad</div>
          <h1 className="mt-1 text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold tracking-[-0.045em]">
            Token yang sedang menuju kelulusan
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-dim">
            Setiap token menempuh bonding curve sampai 8.531 SOL. Setelah penuh, likuiditas dikunci di Uniswap dan ticker
            siap masuk buku pesanan HyperCore.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn href="#/dokumentasi" variant="ghost">
            Cara kerja
          </Btn>
          <Btn href="#/pipeline" variant="primary">
            Luncurkan token
          </Btn>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Reveal>
          <a href={`#/token/${hot.ticker}`} className="card card-hover group relative block h-full overflow-hidden p-6">
            <div aria-hidden className="aurora pointer-events-none absolute -right-24 -top-28 h-72 w-96 opacity-70" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-center gap-4">
                <TokenAvatar t={hot.ticker} size={64} />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/[0.14] px-2 py-0.5 text-[11px] font-semibold text-amber">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber animate-blink" />
                    Hampir lulus
                  </span>
                  <div className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] group-hover:text-amber">{hot.name}</div>
                  <div className="text-[13px] text-dim">
                    ${hot.ticker} · oleh {hot.creator}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-dim">Market cap</div>
                <div className="num text-[24px] font-semibold tracking-[-0.02em]">{fmt.usd(hot.mcap, 0)}</div>
              </div>
            </div>
            <div className="relative mt-7">
              <div className="flex items-end justify-between text-[12px]">
                <span className="text-dim">Progres bonding curve</span>
                <span className="num text-[15px] font-semibold text-amber">{(hp * 100).toFixed(1).replace(".", ",")}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9bc232] to-amber shadow-[0_0_16px_rgba(217,255,77,.5)]"
                  style={{ width: `${hp * 100}%` }}
                />
              </div>
              <div className="num mt-1.5 flex justify-between text-[11px] text-dim">
                <span>
                  {fmt.n(hot.raised)} / {fmt.n(hot.target)} SOL
                </span>
                <span>sisa {fmt.n(hot.target - hot.raised)} SOL</span>
              </div>
            </div>
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              {[
                ["Holder", fmt.n(hot.holders)],
                ["Umur", ageLabel(hot.ageMin)],
                ["Harga", `$${hot.price.toFixed(7).replace(".", ",")}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[11px] text-dim">{k}</div>
                  <div className="num mt-0.5 text-[13.5px] font-medium">{v}</div>
                </div>
              ))}
            </div>
          </a>
        </Reveal>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(([k, v, s], i) => (
            <Reveal key={k} delay={0.04 * i}>
              <div className="card h-full p-5">
                <div className="text-[12px] text-dim">{k}</div>
                <div className="num mt-2 text-[26px] font-semibold tracking-[-0.03em]">{v}</div>
                <div className="mt-1 text-[11.5px] text-dim">{s}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                tab === k ? "bg-white/[0.08] text-bone" : "text-dim hover:text-bone"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <label className="ml-auto flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 focus-within:border-amber/50 sm:w-[260px]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-dim" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau ticker"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-dim/70"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((l) => (
          <TokenCard key={l.ticker} l={l} />
        ))}
      </div>
      {rows.length === 0 && (
        <div className="card mt-5 px-6 py-14 text-center">
          <div className="text-[14px] font-medium">Tidak ada token yang cocok</div>
          <p className="mt-1 text-[12.5px] text-dim">Coba kata kunci lain atau pindah tab.</p>
        </div>
      )}
      <p className="mt-6 text-[11.5px] text-dim">
        Data launchpad di halaman ini adalah simulasi antarmuka — kontrak bonding curve belum terhubung. Pasar perpetual di
        halaman Trade memakai data dan eksekusi HyperCore sungguhan.
      </p>
    </div>
  );
}
