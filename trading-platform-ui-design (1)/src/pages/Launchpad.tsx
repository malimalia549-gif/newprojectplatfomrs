import { useMemo, useState } from "react";
import {
  Btn,
  Card,
  DataTable,
  KV,
  Lamp,
  Meter,
  Micro,
  PageHeader,
  PageNav,
  Pill,
  Reveal,
  Tag,
  fmt,
  type Col,
} from "../components/ui";
import { Sparkline } from "../components/charts";
import { LAUNCHES, type Launch } from "../lib/data";
import { useApp } from "../store";

type Filter = "SEMUA" | "MENDEKATI" | "BARU" | "LULUS";

export default function Launchpad() {
  const { toast, spend, setTicker } = useApp();
  const [rows, setRows] = useState<Launch[]>(LAUNCHES);
  const [filter, setFilter] = useState<Filter>("SEMUA");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((l) => {
      if (s && !`${l.ticker} ${l.name}`.toLowerCase().includes(s)) return false;
      if (filter === "LULUS") return l.status === "GRADUATED";
      if (filter === "MENDEKATI") return l.status === "CURVE" && l.raised / l.target > 0.6;
      if (filter === "BARU") return l.ageMin < 45;
      return true;
    });
  }, [rows, filter, q]);

  const totals = useMemo(() => {
    const raised = rows.reduce((a, l) => a + l.raised, 0);
    const grad = rows.filter((l) => l.status === "GRADUATED").length;
    return { raised, grad, avg: rows.reduce((a, l) => a + l.ageMin, 0) / rows.length };
  }, [rows]);

  function buy(l: Launch, sol: number) {
    const room = l.target - l.raised;
    const add = Math.min(sol, room);
    if (add <= 0) return;
    setRows((r) =>
      r.map((x) =>
        x.ticker === l.ticker
          ? {
              ...x,
              raised: x.raised + add,
              mcap: x.mcap * (1 + (add / l.target) * 0.42),
              price: x.price * (1 + (add / l.target) * 0.42),
              holders: x.holders + 1,
              status: x.raised + add >= x.target ? "GRADUATED" : "CURVE",
            }
          : x,
      ),
    );
    spend(-(add * 186) / 40);
    setTicker(l.ticker);
    toast(
      x2(l, add),
      "mint",
    );
  }

  const cols: Col<Launch>[] = [
    {
      key: "rank",
      head: "#",
      cell: (l) => <Micro className="text-dim">{String(rows.indexOf(l) + 1).padStart(2, "0")}</Micro>,
      width: "w-10",
    },
    {
      key: "token",
      head: "TOKEN",
      sort: (l) => l.ticker,
      cell: (l) => (
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-edge bg-[#080b0e] font-mono text-[10px] text-amber">
            {l.ticker.slice(0, 2)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-mono text-[12px] font-bold text-bone">{l.ticker}</span>
            <span className="block truncate text-[11px] text-dim">{l.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: "progress",
      head: "KURVA",
      sort: (l) => l.raised / l.target,
      cell: (l) => (
        <span className="block w-[130px]">
          <Meter value={l.raised / l.target} segments={22} tone={l.status === "GRADUATED" ? "mint" : "amber"} />
          <span className="tnum mt-1.5 flex justify-between font-mono text-[10px] text-dim">
            <span>{((l.raised / l.target) * 100).toFixed(1).replace(".", ",")}%</span>
            <span>{fmt.n(l.raised, 0)} SOL</span>
          </span>
        </span>
      ),
    },
    {
      key: "mcap",
      head: "MARKET CAP",
      align: "right",
      sort: (l) => l.mcap,
      cell: (l) => <span className="tnum font-mono text-[12px] text-bone">{fmt.usd(l.mcap, 0)}</span>,
      hide: "hidden md:table-cell",
    },
    {
      key: "holders",
      head: "HOLDER",
      align: "right",
      sort: (l) => l.holders,
      cell: (l) => <span className="tnum font-mono text-[12px] text-dim">{fmt.n(l.holders)}</span>,
      hide: "hidden lg:table-cell",
    },
    {
      key: "trend",
      head: "TREN",
      align: "right",
      cell: (l) => <Sparkline values={l.spark} w={72} h={24} up />,
      hide: "hidden xl:table-cell",
    },
    {
      key: "status",
      head: "STATUS",
      cell: (l) =>
        l.status === "GRADUATED" ? (
          <Tag tone="mint">LULUS</Tag>
        ) : (
          <Tag tone="amber">DI KURVA</Tag>
        ),
      hide: "hidden sm:table-cell",
    },
    {
      key: "act",
      head: "",
      align: "right",
      cell: (l) =>
        l.status === "GRADUATED" ? (
          <Btn href="#/pasar" variant="ghost" className="px-3 py-1.5 text-[10px]">
            Trade
          </Btn>
        ) : (
          <Btn variant="mint" className="px-3 py-1.5 text-[10px]" onClick={() => buy(l, 250)}>
            Beli 250 SOL
          </Btn>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        crumb="PLATFORM / LAUNCHPAD"
        index="01"
        kicker="BONDING CURVE · GRADUATION"
        title={
          <>
            Antrean
            <br />
            kelulusan.
          </>
        }
        lead="Setiap ticker menempuh kurva eksponensial sampai 8.531 SOL terkumpul. Begitu penuh, likuiditas berpindah ke pool dan dikunci 365 hari — tanpa kurasi, tanpa suara validator."
        actions={
          <>
            <Btn href="#/pipeline" variant="primary">
              Buat ticker baru
            </Btn>
            <Btn href="#/dokumentasi" variant="ghost">
              Aturan graduasi
            </Btn>
          </>
        }
        meta={
          <>
            <KV k="TOKEN DIPANTAU" v={fmt.n(rows.length)} />
            <KV k="TOTAL TERKUMPUL" v={`${fmt.n(totals.raised, 0)} SOL`} tone="amber" />
            <KV k="SUDAH LULUS" v={fmt.n(totals.grad)} tone="mint" />
            <KV k="RERATA UMUR" v={`${fmt.n(totals.avg, 0)} MENIT`} />
            <KV k="TARGET KURVA" v="8.531 SOL" />
          </>
        }
      />

      <div className="wrap py-10 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.75fr_0.75fr]">
          <div>
            {/* toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {(["SEMUA", "MENDEKATI", "BARU", "LULUS"] as Filter[]).map((f) => (
                  <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
                    {f}
                  </Pill>
                ))}
              </div>
              <label className="ml-auto flex min-w-[190px] flex-1 items-center gap-2 border border-edge bg-[#0e1217] px-3 py-2 focus-within:border-amber md:max-w-[260px] md:flex-none">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-dim" stroke="currentColor" strokeWidth="1.4" fill="none">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari ticker…"
                  className="w-full bg-transparent font-mono text-[11px] text-bone outline-none placeholder:text-dim/70"
                />
              </label>
            </div>

            <Reveal>
              <Card bodyClass="p-0">
                <DataTable rows={shown} cols={cols} initialSort={{ key: "progress", dir: -1 }} empty="TIDAK ADA TOKEN COCOK" />
              </Card>
            </Reveal>
            <p className="mt-3 text-[11px] leading-relaxed text-dim">
              Klik kepala kolom untuk mengurutkan. Pembelian di halaman ini adalah simulasi:
              progres kurva, market cap, dan jumlah holder ikut bergerak.
            </p>
          </div>

          <div className="space-y-6">
            <Reveal delay={0.06}>
              <Card title="Aturan main" kicker="KONTRAK" bodyClass="p-4">
                {[
                  ["Bentuk kurva", "Eksponensial"],
                  ["Target", "8.531 SOL"],
                  ["Ke pool", "80% likuiditas"],
                  ["Kunci LP", "365 hari"],
                  ["Fee creator", "1,2%"],
                  ["Alokasi tim", "0%"],
                ].map(([k, v]) => (
                  <KV key={k} k={k} v={v} tone={k === "Alokasi tim" ? "mint" : undefined} />
                ))}
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card title="Biaya" kicker="SEKALI PER TICKER" bodyClass="p-4">
                <KV k="Create" v="$0,00" tone="mint" />
                <KV k="Graduation" v="$199,00" />
                <KV k="Pool Uniswap" v="$420,00" />
                <div className="mt-3 flex items-baseline justify-between border-t border-edge pt-3">
                  <Micro className="text-dim">TOTAL</Micro>
                  <span className="tnum font-mono text-[18px] font-bold text-amber">$619,00</span>
                </div>
              </Card>
            </Reveal>

            <Reveal delay={0.14}>
              <Card title="Setelah lulus" kicker="KE LANTAI PERDAGANGAN" bodyClass="p-4">
                <ol className="space-y-3">
                  {[
                    ["01", "Ticker terdaftar di buku spot HyperCore"],
                    ["02", "Pool Uniswap jadi sumber harga dasar"],
                    ["03", "Deployer HIP-3 dapat memilihnya jadi perp"],
                  ].map(([n, t]) => (
                    <li key={n} className="flex gap-3">
                      <span className="tnum font-mono text-[11px] text-amber">{n}</span>
                      <span className="text-[12.5px] leading-relaxed text-dim">{t}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex items-center gap-2 border-t border-edge pt-3">
                  <Lamp on color="mint" />
                  <Micro className="text-dim">TANPA PERSETUJUAN VALIDATOR</Micro>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>

        <PageNav prev={{ label: "Dashboard", to: "/" }} next={{ label: "Market", to: "/pasar" }} />
      </div>

      {/* editorial band — the detent */}
      <section className="relative overflow-hidden border-t border-edge">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img
            src="images/lever.jpg"
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="h-full w-full object-cover object-[62%_52%] opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/70" />
        </div>
        <div className="wrap relative grid gap-8 py-16 md:py-20 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <div className="mb-5 h-px w-20 bg-amber" />
            <p className="max-w-2xl font-serif text-[clamp(1.4rem,3.6vw,2.5rem)] italic leading-[1.16] text-bone">
              Tuas itu punya satu bunyi: kurva penuh, likuiditas terkunci, dan nama kamu masuk ke
              buku pesanan.
            </p>
          </div>
          <dl className="border border-edge bg-[#0e1216]/85 px-4 py-3 backdrop-blur-sm">
            <KV k="Tuas" v="GRADUATE" tone="amber" />
            <KV k="Posisi akhir" v="LP terkunci 365 hari" />
            <KV k="Pelengkap" v="Uniswap V4 · 0,30%" />
            <KV k="Alokasi tim" v="0%" tone="mint" />
          </dl>
        </div>
      </section>
    </>
  );
}

function x2(l: Launch, add: number) {
  const after = l.raised + add;
  return after >= l.target
    ? `${l.ticker} mencapai target — siap graduate.`
    : `Beli ${fmt.n(add, 0)} SOL pada ${l.ticker} · kurva ${((after / l.target) * 100).toFixed(1).replace(".", ",")}%`;
}
