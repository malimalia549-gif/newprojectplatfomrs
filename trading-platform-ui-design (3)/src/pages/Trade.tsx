import { useMemo, useState } from "react";
import Orderbook from "../components/Orderbook";
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
  Tabs,
  fmt,
  type Col,
} from "../components/ui";
import { CandleChart } from "../components/charts";
import { MARKETS, POSITIONS, makeCandles, type Candle, type Market, type Position } from "../lib/data";
import { useCandles, useLiveMarkets } from "../lib/hypercore";
import { useApp } from "../store";

const TF: [string, number, number][] = [
  ["1m", 101, 0.012],
  ["5m", 211, 0.02],
  ["15m", 307, 0.028],
  ["1J", 401, 0.045],
  ["4J", 503, 0.06],
  ["1H", 601, 0.09],
];

type TabId = "POSISI" | "ORDER" | "RIWAYAT";

export default function TradePage() {
  const { ticker, toast } = useApp();
  const [inst, setInst] = useState<"SPOT" | "PERP">("SPOT");
  const [tf, setTf] = useState(2);
  const [tab, setTab] = useState<TabId>("POSISI");
  const [pos, setPos] = useState(POSITIONS);

  /* ── data langsung dari HyperCore, simulasi sebagai cadangan ── */
  const { markets: liveMarkets, live: dataLive } = useLiveMarkets();
  const real = liveMarkets.find((m) => m.coin.toUpperCase() === ticker.toUpperCase());

  const market: Market = useMemo(() => {
    if (real)
      return {
        pair: real.coin,
        dex: "hyper",
        name: `${real.coin} · HyperCore CLOB`,
        kind: "PERP",
        sector: "KRIPTO",
        price: real.price,
        change: real.change,
        vol: real.vol,
        oi: real.oi,
        funding: real.funding,
        lev: real.lev,
        status: "LIVE",
        spark: [],
      };
    return MARKETS.find((m) => m.pair === `grvd:${ticker}`) ?? MARKETS[0];
  }, [real, ticker]);

  const HL = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const { rows: hlCandles, live: candlesLive } = useCandles(real?.coin ?? null, HL[tf]);
  const candles: Candle[] =
    candlesLive && hlCandles.length > 4
      ? hlCandles
      : makeCandles(TF[tf][1], 74, market.price * 0.72, TF[tf][2]);

  const cols: Col<Position>[] = [
    {
      key: "pair",
      head: "PASAR",
      cell: (p) => (
        <span className="flex items-center gap-2.5">
          <Lamp on color={p.side === "LONG" ? "mint" : "blood"} />
          <span className="font-mono text-[12px] font-bold text-bone">{p.pair}</span>
          <Tag tone={p.side === "LONG" ? "mint" : "blood"}>{p.side}</Tag>
        </span>
      ),
    },
    {
      key: "size",
      head: "UKURAN",
      align: "right",
      sort: (p) => p.size,
      cell: (p) => <span className="tnum font-mono text-[12px] text-bone">{fmt.usd(p.size, 0)}</span>,
    },
    {
      key: "entry",
      head: "MASUK",
      align: "right",
      cell: (p) => <span className="tnum font-mono text-[12px] text-dim">{fmt.price(p.entry)}</span>,
      hide: "hidden md:table-cell",
    },
    {
      key: "mark",
      head: "MARK",
      align: "right",
      cell: (p) => <span className="tnum font-mono text-[12px] text-bone">{fmt.price(p.mark)}</span>,
      hide: "hidden md:table-cell",
    },
    {
      key: "lev",
      head: "LEV",
      align: "right",
      cell: (p) => <span className="tnum font-mono text-[12px] text-dim">{p.lev}×</span>,
      hide: "hidden lg:table-cell",
    },
    {
      key: "pnl",
      head: "PNL",
      align: "right",
      sort: (p) => pnl(p),
      cell: (p) => {
        const v = pnl(p);
        return (
          <span className={`tnum font-mono text-[12px] ${v >= 0 ? "text-mint" : "text-blood"}`}>
            {v >= 0 ? "+" : "−"}
            {fmt.usd(Math.abs(v), 2)}
            <span className="ml-1.5 text-[10px] opacity-70">
              {fmt.pct((v / p.margin) * 100)}
            </span>
          </span>
        );
      },
    },
    {
      key: "act",
      head: "",
      align: "right",
      cell: (p) => (
        <Btn
          variant="ghost"
          className="px-3 py-1.5 text-[10px]"
          onClick={() => {
            setPos((s) => s.filter((x) => x.pair !== p.pair));
            toast(`Posisi ${p.pair} ditutup pada ${fmt.price(p.mark)}.`, pnl(p) >= 0 ? "mint" : "blood");
          }}
        >
          Tutup
        </Btn>
      ),
    },
  ];

  const totalPnl = pos.reduce((a, p) => a + pnl(p), 0);

  return (
    <>
      <PageHeader
        crumb="PLATFORM / TRADE"
        index="03"
        kicker={inst === "SPOT" ? "HYPERCORE · CLOB SPOT" : "HIP-3 · PERPETUAL"}
        title={
          <>
            {market.pair}
            <span className="text-dim">/USDC</span>
          </>
        }
        lead={`${market.name} · dicocokkan oleh matching engine HyperCore dengan margin USDC. Grafik, buku, dan tiket di halaman ini hidup.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Pill active={inst === "SPOT"} onClick={() => setInst("SPOT")}>
              Spot
            </Pill>
            <Pill active={inst === "PERP"} tone="mint" onClick={() => setInst("PERP")}>
              Perpetual
            </Pill>
          </div>
        }
        meta={
          <>
            <div className="flex items-baseline gap-3">
              <span className="tnum font-mono text-[26px] font-bold leading-none text-bone">
                {fmt.price(market.price)}
              </span>
              <span className={`tnum font-mono text-[13px] ${market.change >= 0 ? "text-mint" : "text-blood"}`}>
                {fmt.pct(market.change)}
              </span>
            </div>
            <div className="mt-3">
              <KV k="Volume 24 jam" v={fmt.usd(market.vol, 0)} />
              <KV k="Open interest" v={inst === "PERP" ? fmt.usd(market.oi, 0) : "—"} />
              <KV k="Funding / 8 jam" v={inst === "PERP" ? `${fmt.n(market.funding * 100, 4)}%` : "—"} tone="amber" />
              <KV k="Leverage maks" v={inst === "PERP" ? `${market.lev || 25}×` : "—"} />
              <KV k="Sumber data" v={dataLive ? "HYPERCORE · LANGSUNG" : "SIMPULAN"} tone={dataLive ? "mint" : undefined} />
            </div>
          </>
        }
      />

      <div className="wrap py-8 md:py-10">
        {/* chart */}
        <Reveal>
          <Card
            title={`Grafik · ${market.pair}`}
            kicker={`${TF[tf][0]} · ${candlesLive ? "HYPERCORE LANGSUNG" : "SIMULASI"}`}
            tools={
              <div className="flex items-center gap-1">
                {TF.map(([l], i) => (
                  <button
                    key={l}
                    onClick={() => setTf(i)}
                    className={`border px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] transition-colors ${
                      i === tf
                        ? "border-amber bg-amber/15 text-amber"
                        : "border-transparent text-dim hover:border-edge hover:text-bone"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
            bodyClass="p-2"
          >
            <CandleChart data={candles} height={330} />
            <div className="grid grid-cols-2 gap-px border-t border-edge bg-edge sm:grid-cols-4">
              {[
                ["TERTINGGI 24J", fmt.price(market.price * 1.062)],
                ["TERENDAH 24J", fmt.price(market.price * 0.914)],
                ["VWAP", fmt.price(market.price * 0.998)],
                ["SPREAD", "1,4 bps"],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0e1216] px-3 py-2.5">
                  <Micro className="text-dim">{k}</Micro>
                  <div className="tnum mt-1 font-mono text-[12.5px] text-bone">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <div className="mt-6">
          <Orderbook ticker={ticker} />
        </div>

        {/* positions */}
        <div className="mt-10">
          <Card
            bodyClass="p-0"
            title="Akun perdagangan"
            kicker="MARGIN USDC · CROSS"
            tools={
              <span className="flex items-center gap-3">
                <Micro className="text-dim">PNL TOTAL</Micro>
                <span className={`tnum font-mono text-[12px] ${totalPnl >= 0 ? "text-mint" : "text-blood"}`}>
                  {totalPnl >= 0 ? "+" : "−"}
                  {fmt.usd(Math.abs(totalPnl), 2)}
                </span>
              </span>
            }
          >
            <Tabs<TabId>
              className="px-2"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "POSISI", label: "Posisi", count: pos.length },
                { id: "ORDER", label: "Order terbuka", count: 2 },
                { id: "RIWAYAT", label: "Riwayat", count: 6 },
              ]}
            />
            {tab === "POSISI" && <DataTable rows={pos} cols={cols} empty="BELUM ADA POSISI TERBUKA" />}
            {tab === "ORDER" && (
              <ul>
                {[
                  ["LIMIT BUY", `${market.pair}`, fmt.price(market.price * 0.96), "12.400 TKN", "TERBUKA 4 MENIT"],
                  ["LIMIT SELL", "hip3:NVDA", "$191,4000", "42 TKN", "TERBUKA 1 JAM"],
                ].map((r) => (
                  <li key={r[0]} className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-4 py-3 last:border-0">
                    <span className="flex items-center gap-3">
                      <Tag tone="amber">{r[0]}</Tag>
                      <span className="font-mono text-[12px] text-bone">{r[1]}</span>
                    </span>
                    <span className="tnum font-mono text-[11.5px] text-dim">
                      {r[2]} · {r[3]} · {r[4]}
                    </span>
                    <Btn
                      variant="quiet"
                      className="px-2 py-1 text-[10px]"
                      onClick={() => toast("Order dibatalkan.", "blood")}
                    >
                      Batalkan
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
            {tab === "RIWAYAT" && (
              <ul>
                {[
                  ["FILL", "grvd:KUDA", "BELI 4.200 TKN", "+$11,93"],
                  ["FUNDING", "hip3:NVDA", "Diterima 8 jam", "+$1,15"],
                  ["FILL", "hip3:XAU", "JUAL 0,8 kontrak", "+$9,20"],
                  ["GRADUASI", "grvd:AYAM", "Likuiditas dikunci", "—"],
                  ["FILL", "hip3:CL", "BELI 12 kontrak", "−$4,10"],
                  ["DEPOSIT", "USDC", "Bridge masuk", "+$2.500,00"],
                ].map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-4 py-2.5 last:border-0">
                    <span className="flex items-center gap-3">
                      <Micro className="text-dim">{r[0]}</Micro>
                      <span className="font-mono text-[12px] text-bone">{r[1]}</span>
                    </span>
                    <span className="text-[11.5px] text-dim">{r[2]}</span>
                    <span
                      className={`tnum font-mono text-[12px] ${
                        r[3].startsWith("+") ? "text-mint" : r[3].startsWith("−") ? "text-blood" : "text-dim"
                      }`}
                    >
                      {r[3]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <PageNav prev={{ label: "Market", to: "/pasar" }} next={{ label: "Portofolio", to: "/portofolio" }} />
      </div>
    </>
  );
}

function pnl(p: Position) {
  const sign = p.side === "LONG" ? 1 : -1;
  return p.size * (p.mark / p.entry - 1) * sign;
}
