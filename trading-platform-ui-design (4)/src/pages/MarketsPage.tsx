import { useMemo, useState } from "react";
import { Btn, DataTable, Reveal, fmt, type Col } from "../components/ui";
import { Glyph } from "../components/terminal";
import { fmtPx, useMarkets, type Mkt } from "../lib/hl";
import { useApp } from "../store";

function Movers({ title, rows, go }: { title: string; rows: Mkt[]; go: (m: Mkt) => void }) {
  return (
    <div className="card h-full overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-3 text-[13px] font-semibold">{title}</div>
      {rows.length === 0
        ? Array.from({ length: 5 }).map((_, i) => <span key={i} className="skeleton mx-4 my-3 block h-5 rounded" />)
        : rows.map((m) => (
            <button
              key={m.key}
              onClick={() => go(m)}
              className="flex w-full items-center justify-between gap-3 border-b border-white/[0.04] px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-white/[0.03]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Glyph name={m.key} size={22} />
                <span className="truncate text-[13px] font-medium">{m.base}</span>
                {m.dex && <span className="rounded border border-white/10 px-1 text-[10px] text-dim">{m.dex}</span>}
              </span>
              <span className="flex items-center gap-4">
                <span className="num text-[12px] text-dim">{fmtPx(m.mark, m.szDecimals)}</span>
                <span className={`num w-16 text-right text-[12.5px] font-medium ${m.change >= 0 ? "text-mint" : "text-blood"}`}>
                  {fmt.pct(m.change)}
                </span>
              </span>
            </button>
          ))}
    </div>
  );
}

export default function MarketsPage() {
  const { net, setMarketKey } = useApp();
  const { main, hip3, dexes, live, at } = useMarkets(net);
  const [tab, setTab] = useState<"core" | "hip3">("core");
  const [dex, setDex] = useState("");
  const [q, setQ] = useState("");

  const all = useMemo(() => [...main, ...hip3], [main, hip3]);
  const list = useMemo(() => {
    let l = tab === "core" ? main : hip3;
    if (tab === "hip3" && dex) l = l.filter((m) => m.dex === dex);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((m) => m.key.toLowerCase().includes(s) || m.dexName.toLowerCase().includes(s));
    return l;
  }, [tab, dex, q, main, hip3]);

  const liquid = useMemo(() => all.filter((m) => m.vol > 250_000), [all]);
  const gainers = useMemo(() => [...liquid].sort((a, b) => b.change - a.change).slice(0, 5), [liquid]);
  const losers = useMemo(() => [...liquid].sort((a, b) => a.change - b.change).slice(0, 5), [liquid]);
  const vol = all.reduce((s, m) => s + m.vol, 0);
  const oi = all.reduce((s, m) => s + m.oi, 0);
  const up = all.filter((m) => m.change > 0).length;

  const go = (m: Mkt) => {
    setMarketKey(m.key);
    window.location.hash = "#/trade";
  };

  const cols: Col<Mkt>[] = [
    {
      key: "name",
      head: "PASAR",
      sort: (m) => m.key,
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Glyph name={m.key} size={26} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold">{m.base}-USD</span>
              <span className="num rounded bg-white/[0.05] px-1 text-[10px] text-dim">{m.maxLev}×</span>
            </span>
            <span className="block text-[11px] text-dim">{m.dex ? `${m.dexName} · HIP-3` : "HyperCore"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "mark",
      head: "HARGA",
      align: "right",
      sort: (m) => m.mark,
      cell: (m) => <span className="num text-[12.5px]">{fmtPx(m.mark, m.szDecimals)}</span>,
    },
    {
      key: "change",
      head: "24 JAM",
      align: "right",
      sort: (m) => m.change,
      cell: (m) => (
        <span className={`num text-[12.5px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(m.change)}</span>
      ),
    },
    {
      key: "vol",
      head: "VOLUME 24J",
      align: "right",
      sort: (m) => m.vol,
      cell: (m) => <span className="num text-[12.5px] text-dim">{fmt.usd(m.vol, 0)}</span>,
      hide: "hidden md:table-cell",
    },
    {
      key: "oi",
      head: "OPEN INTEREST",
      align: "right",
      sort: (m) => m.oi,
      cell: (m) => <span className="num text-[12.5px] text-dim">{fmt.usd(m.oi, 0)}</span>,
      hide: "hidden lg:table-cell",
    },
    {
      key: "funding",
      head: "FUNDING / 1J",
      align: "right",
      sort: (m) => m.funding,
      cell: (m) => (
        <span className={`num text-[12.5px] ${m.funding >= 0 ? "text-mint" : "text-blood"}`}>
          {(m.funding * 100).toFixed(4).replace(".", ",")}%
        </span>
      ),
      hide: "hidden sm:table-cell",
    },
    {
      key: "act",
      head: "",
      align: "right",
      cell: () => (
        <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11.5px] font-medium text-bone">Trade</span>
      ),
      hide: "hidden md:table-cell",
    },
  ];

  return (
    <div className="wrap py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="text-[12.5px] font-medium text-amber">Market</div>
          <h1 className="mt-1 text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold tracking-[-0.045em]">Semua pasar, satu mesin</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-dim">
            Perp inti HyperCore dan seluruh pasar HIP-3 dari DEX builder — harga, volume, open interest, dan funding langsung
            dari API publik.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-dim">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-mint" : "bg-amber"} animate-blink`} />
          {live
            ? `Tersinkron ${new Date(at).toLocaleTimeString("id-ID", { hour12: false })} · ${net === "mainnet" ? "mainnet" : "testnet"}`
            : "Menyambung ke HyperCore…"}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Volume 24 jam", vol ? fmt.usd(vol, 0) : "—"],
          ["Open interest", oi ? fmt.usd(oi, 0) : "—"],
          ["Pasar aktif", all.length ? `${fmt.n(main.length)} inti · ${fmt.n(hip3.length)} HIP-3` : "—"],
          ["Naik 24 jam", all.length ? `${fmt.n(up)} dari ${fmt.n(all.length)}` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <div className="text-[12px] text-dim">{k}</div>
            <div className="num mt-1.5 text-[19px] font-semibold tracking-[-0.02em]">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Reveal>
          <Movers title="Kenaikan terbesar" rows={gainers} go={go} />
        </Reveal>
        <Reveal delay={0.05}>
          <Movers title="Penurunan terbesar" rows={losers} go={go} />
        </Reveal>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
          {(
            [
              ["core", `Perp HyperCore · ${main.length}`],
              ["hip3", `HIP-3 builder · ${hip3.length}`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setDex("");
              }}
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
            placeholder="Cari pasar"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-dim/70"
          />
        </label>
      </div>
      {tab === "hip3" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setDex("")}
            className={`rounded-lg border px-2.5 py-1 text-[12px] transition-colors ${
              !dex ? "border-amber/40 bg-amber/10 text-amber" : "border-white/10 text-dim hover:text-bone"
            }`}
          >
            Semua DEX
          </button>
          {dexes.filter((x) => hip3.some((m) => m.dex === x.name)).map((x) => (
            <button
              key={x.name}
              onClick={() => setDex(x.name)}
              className={`rounded-lg border px-2.5 py-1 text-[12px] transition-colors ${
                dex === x.name ? "border-amber/40 bg-amber/10 text-amber" : "border-white/10 text-dim hover:text-bone"
              }`}
            >
              {x.fullName}
            </button>
          ))}
        </div>
      )}

      <div className="card mt-4 overflow-hidden">
        <DataTable
          rows={list}
          cols={cols}
          initialSort={{ key: "vol", dir: -1 }}
          onRow={go}
          empty={main.length ? "TIDAK ADA PASAR YANG COCOK" : "MEMUAT PASAR HYPERCORE…"}
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-[11.5px] text-dim">
        <span>Klik baris untuk membuka pasar di terminal.</span>
        <Btn href="#/trade" variant="quiet" className="px-0 text-[12px]">
          Buka terminal →
        </Btn>
      </div>
    </div>
  );
}
