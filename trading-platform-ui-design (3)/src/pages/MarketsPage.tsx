import { useMemo, useState } from "react";
import {
  Btn,
  Card,
  DataTable,
  KV,
  Lamp,
  Micro,
  PageHeader,
  PageNav,
  Pill,
  Reveal,
  Tag,
  fmt,
  type Col,
} from "../components/ui";
import { DepthChart, Sparkline } from "../components/charts";
import { MARKETS, type Market } from "../lib/data";
import { useLiveMarkets, type LiveMarket } from "../lib/hypercore";
import { useApp } from "../store";

const SECTORS = ["SEMUA", "LAUNCHPAD", "EKUITAS", "KOMODITAS", "FX", "INDEKS", "KRIPTO"] as const;

export default function MarketsPage() {
  const { ticker, setTicker, toast } = useApp();
  const [sector, setSector] = useState<(typeof SECTORS)[number]>("SEMUA");
  const [q, setQ] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);
  const { markets: direct, live: dataLive, at } = useLiveMarkets();

  const liveCols: Col<LiveMarket>[] = [
    {
      key: "coin",
      head: "PASAR HYPERCORE",
      sort: (m) => m.coin,
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Lamp on color="mint" />
          <span className="font-mono text-[12px] font-bold text-bone">{m.coin}</span>
          <Micro className="text-dim">PERP · ASET {m.index}</Micro>
        </span>
      ),
    },
    {
      key: "price",
      head: "MARK",
      align: "right",
      sort: (m) => m.price,
      cell: (m) => <span className="tnum font-mono text-[12px] text-bone">{fmt.price(m.price)}</span>,
    },
    {
      key: "change",
      head: "24 JAM",
      align: "right",
      sort: (m) => m.change,
      cell: (m) => <span className={`tnum font-mono text-[12px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(m.change)}</span>,
    },
    {
      key: "vol",
      head: "VOLUME 24J",
      align: "right",
      sort: (m) => m.vol,
      cell: (m) => <span className="tnum font-mono text-[12px] text-dim">{fmt.usd(m.vol, 0)}</span>,
      hide: "hidden md:table-cell",
    },
    {
      key: "oi",
      head: "OPEN INT",
      align: "right",
      sort: (m) => m.oi,
      cell: (m) => <span className="tnum font-mono text-[12px] text-dim">{fmt.usd(m.oi, 0)}</span>,
      hide: "hidden lg:table-cell",
    },
    {
      key: "funding",
      head: "FUNDING / 8J",
      align: "right",
      sort: (m) => m.funding,
      cell: (m) => (
        <span className={`tnum font-mono text-[12px] ${m.funding >= 0 ? "text-mint" : "text-blood"}`}>
          {(m.funding * 100).toFixed(4).replace(".", ",")}%
        </span>
      ),
      hide: "hidden sm:table-cell",
    },
    {
      key: "lev",
      head: "LEV",
      align: "right",
      cell: (m) => <span className="tnum font-mono text-[12px] text-amber">{m.lev}×</span>,
      hide: "hidden xl:table-cell",
    },
    {
      key: "act",
      head: "",
      align: "right",
      cell: (m) => (
        <Btn
          variant="ghost"
          className="px-3 py-1.5 text-[10px]"
          onClick={() => {
            setTicker(m.coin);
            toast(`${m.coin} dimuat ke terminal perdagangan.`, "mint");
            window.location.hash = "#/trade";
          }}
        >
          Trade
        </Btn>
      ),
    },
  ];

  const rows = useMemo(
    () =>
      MARKETS.filter((m) => {
        if (sector !== "SEMUA" && m.sector !== sector) return false;
        if (onlyLive && m.status !== "LIVE") return false;
        const s = q.trim().toLowerCase();
        return !s || `${m.pair} ${m.name}`.toLowerCase().includes(s);
      }),
    [sector, q, onlyLive],
  );

  const byVenue = useMemo(() => {
    const map = new Map<string, number>();
    MARKETS.forEach((m) => map.set(m.dex, (map.get(m.dex) ?? 0) + m.vol));
    const arr = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const max = arr[0]?.[1] ?? 1;
    return arr.map(([dex, vol]) => ({ dex, vol, w: (vol / max) * 100 }));
  }, []);

  const cols: Col<Market>[] = [
    {
      key: "pair",
      head: "PASAR",
      sort: (m) => m.pair,
      cell: (m) => (
        <span className="flex items-center gap-3">
          <Lamp on={m.status === "LIVE"} color={m.status === "HALTED" ? "blood" : "mint"} />
          <span className="min-w-0">
            <span className={`block font-mono text-[12px] font-bold ${m.pair === `grvd:${ticker}` ? "text-amber" : "text-bone"}`}>
              {m.pair}
            </span>
            <span className="block truncate text-[11px] text-dim">{m.name}</span>
          </span>
        </span>
      ),
    },
    {
      key: "kind",
      head: "TIPE",
      cell: (m) => <Tag tone={m.kind === "PERP" ? "amber" : "dim"}>{m.kind}</Tag>,
      hide: "hidden lg:table-cell",
    },
    {
      key: "price",
      head: "HARGA",
      align: "right",
      sort: (m) => m.price,
      cell: (m) => <span className="tnum font-mono text-[12px] text-bone">{m.price >= 1 ? fmt.n(m.price, 2) : m.price.toFixed(7)}</span>,
    },
    {
      key: "change",
      head: "24 JAM",
      align: "right",
      sort: (m) => m.change,
      cell: (m) => <span className={`tnum font-mono text-[12px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(m.change)}</span>,
    },
    {
      key: "vol",
      head: "VOLUME",
      align: "right",
      sort: (m) => m.vol,
      cell: (m) => <span className="tnum font-mono text-[12px] text-dim">{fmt.usd(m.vol, 0)}</span>,
      hide: "hidden md:table-cell",
    },
    {
      key: "oi",
      head: "OPEN INT",
      align: "right",
      sort: (m) => m.oi,
      cell: (m) => <span className="tnum font-mono text-[12px] text-dim">{m.oi ? fmt.usd(m.oi, 0) : "—"}</span>,
      hide: "hidden xl:table-cell",
    },
    {
      key: "funding",
      head: "FUNDING",
      align: "right",
      sort: (m) => m.funding,
      cell: (m) => (
        <span className={`tnum font-mono text-[12px] ${m.funding >= 0 ? "text-mint" : "text-blood"}`}>
          {m.kind === "PERP" ? `${fmt.n(m.funding * 100, 4)}%` : "—"}
        </span>
      ),
      hide: "hidden lg:table-cell",
    },
    {
      key: "spark",
      head: "7 HARI",
      align: "right",
      cell: (m) => <Sparkline values={m.spark} w={80} h={24} up={m.change >= 0} />,
      hide: "hidden xl:table-cell",
    },
    {
      key: "act",
      head: "",
      align: "right",
      cell: (m) =>
        m.status === "HALTED" ? (
          <Tag tone="blood">HALTED</Tag>
        ) : m.status === "SOON" ? (
          <Tag tone="dim">SEGERA</Tag>
        ) : (
          <Btn variant="ghost" className="px-3 py-1.5 text-[10px]">
            Trade
          </Btn>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        crumb="PLATFORM / MARKET"
        index="02"
        kicker="164 PASAR · 10 VENUE BUILDER"
        title={
          <>
            Semua buku,
            <br />
            satu mesin.
          </>
        }
        lead="Spot hasil graduasi dan perpetual builder-deployed diperdagangkan di matching engine yang sama. Klik baris untuk memuat pasar itu di terminal."
        actions={
          <>
            <Pill active={onlyLive} tone="mint" onClick={() => setOnlyLive((v) => !v)}>
              Hanya yang live
            </Pill>
            <Btn href="#/trade" variant="primary">
              Buka terminal
            </Btn>
          </>
        }
        meta={
          <>
            <KV k="Volume agregat 24j" v="$1,39 M" tone="amber" />
            <KV k="Open interest" v="$3,93 M" />
            <KV k="Pasar dihentikan" v="1" tone="blood" />
            <KV k="Rerata spread" v="1,4 bps" tone="mint" />
          </>
        }
      />

      <div className="wrap py-10 md:py-12">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <Pill key={s} active={sector === s} onClick={() => setSector(s)}>
                {s}
              </Pill>
            ))}
          </div>
          <label className="ml-auto flex min-w-[190px] items-center gap-2 border border-edge bg-[#0e1217] px-3 py-2 focus-within:border-amber md:max-w-[250px]">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-dim" stroke="currentColor" strokeWidth="1.4" fill="none">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari pair atau nama…"
              className="w-full bg-transparent font-mono text-[11px] text-bone outline-none placeholder:text-dim/70"
            />
          </label>
        </div>

        {direct.length > 0 && (
          <Reveal>
            <Card
              bodyClass="p-0"
              title="HyperCore langsung"
              kicker={`${direct.length} PERP · REFRESH 5 DTK`}
              tools={
                <span className="flex items-center gap-2">
                  <Micro className="text-mint">
                    {dataLive
                      ? `SINKRON ${new Date(at).toLocaleTimeString("id-ID", { hour12: false })}`
                      : "MENYAMBUNG…"}
                  </Micro>
                  <Lamp on={dataLive} color={dataLive ? "mint" : "amber"} pulse />
                </span>
              }
            >
              <DataTable
                rows={direct.slice(0, 10)}
                cols={liveCols}
                initialSort={{ key: "vol", dir: -1 }}
                dense
              />
            </Card>
          </Reveal>
        )}

        <Reveal>
          <Card
            bodyClass="p-0"
            title="Daftar pasar"
            kicker={`${rows.length} DITAMPILKAN`}
            tools={<Micro className="text-dim">KLIK BARIS → TERMINAL</Micro>}
          >
            <DataTable
              rows={rows}
              cols={cols}
              initialSort={{ key: "vol", dir: -1 }}
              empty="TIDAK ADA PASAR PADA FILTER INI"
              onRow={(m) => {
                if (m.status === "HALTED") {
                  toast(`${m.pair} sedang dihentikan deployer (haltTrading).`, "blood");
                  return;
                }
                const coin = m.pair.split(":")[1] ?? m.pair;
                setTicker(coin);
                toast(`${m.pair} dimuat ke terminal.`, "mint");
                window.location.hash = "#/trade";
              }}
            />
          </Card>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <Card title="Kedalaman agregat" kicker={`grvd:${ticker} · ±2%`} bodyClass="p-4">
              <DepthChart
                bids={[9, 14, 22, 31, 44, 58, 71, 88].map((v) => v * 1000)}
                asks={[7, 12, 19, 28, 39, 52, 66, 81].map((v) => v * 1000)}
                height={168}
              />
              <div className="mt-3 grid grid-cols-3 gap-px border border-edge bg-edge">
                {[
                  ["BID DALAM 2%", "$412 RBU", "mint"],
                  ["ASK DALAM 2%", "$388 RBU", "blood"],
                  ["RASIO", "1,06", "amber"],
                ].map(([k, v, tone]) => (
                  <div key={k} className="bg-[#0e1216] px-3 py-2.5">
                    <Micro className="text-dim">{k}</Micro>
                    <div className={`tnum mt-1 font-mono text-[13px] ${tone === "mint" ? "text-mint" : tone === "blood" ? "text-blood" : "text-amber"}`}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.06}>
            <Card title="Volume per venue" kicker="24 JAM" bodyClass="p-4">
              <ul className="space-y-3.5">
                {byVenue.map((v) => (
                  <li key={v.dex}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[12px] text-bone">
                        {v.dex}
                        <span className="text-dim">:</span>
                      </span>
                      <span className="tnum font-mono text-[11.5px] text-dim">{fmt.usd(v.vol, 0)}</span>
                    </div>
                    <div className="mt-1.5 h-[7px] w-full bg-[#0e1217]">
                      <div
                        className="h-full bg-gradient-to-r from-[#8a4a12] to-amber transition-[width] duration-700"
                        style={{ width: `${v.w}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-edge pt-3">
                <KV k="Deployer terdaftar" v="10" />
                <KV k="Stake per deployer" v="500.000 HYPE" tone="amber" />
              </div>
            </Card>
          </Reveal>
        </div>

        <PageNav prev={{ label: "Launchpad", to: "/launchpad" }} next={{ label: "Trade", to: "/trade" }} />
      </div>
    </>
  );
}
