import { useState } from "react";
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
  Reveal,
  Tag,
  fmt,
  type Col,
} from "../components/ui";
import { AreaCurve, Sparkline } from "../components/charts";
import { EQUITY, POSITIONS, makeSpark, type Position } from "../lib/data";
import { useApp } from "../store";

const ALLOC: [string, number, string][] = [
  ["USDC menganggur", 42, "#e9ecef"],
  ["Margin perp", 31, "#d9ff4d"],
  ["Posisi spot", 18, "#3edc99"],
  ["Kurva launchpad", 9, "#8b9299"],
];

const HIST: [string, string, string, string][] = [
  ["2026-02-18 09:41", "FILL · grvd:KUDA", "BELI 4.200 TKN", "+$11,93"],
  ["2026-02-18 04:00", "FUNDING · hip3:NVDA", "8 jam", "+$1,15"],
  ["2026-02-17 22:14", "FILL · hip3:XAU", "JUAL 0,8 kontrak", "+$9,20"],
  ["2026-02-17 15:02", "LIQUIDATION CHECK", "margin 23,4%", "AMAN"],
  ["2026-02-16 11:37", "GRADUASI · grvd:AYAM", "LP dikunci 365 hari", "—"],
  ["2026-02-15 08:20", "DEPOSIT · USDC", "bridge masuk", "+$2.500,00"],
];

export default function PortfolioPage() {
  const { balance, toast, spend } = useApp();
  const [pos, setPos] = useState(POSITIONS);

  const upnl = pos.reduce((a, p) => a + pnl(p), 0);
  const marginUsed = pos.reduce((a, p) => a + p.margin, 0);
  const equity = balance + marginUsed + upnl;

  const cols: Col<Position>[] = [
    {
      key: "pair",
      head: "PASAR",
      cell: (p) => (
        <span className="flex items-center gap-2.5">
          <Lamp on color={p.side === "LONG" ? "mint" : "blood"} />
          <span className="font-mono text-[12px] font-bold text-bone">{p.pair}</span>
          <Tag tone={p.side === "LONG" ? "mint" : "blood"}>
            {p.side} {p.lev}×
          </Tag>
        </span>
      ),
    },
    { key: "margin", head: "MARGIN", align: "right", sort: (p) => p.margin, cell: (p) => <span className="tnum font-mono text-[12px] text-bone">{fmt.usd(p.margin, 0)}</span> },
    { key: "size", head: "NOTIONAL", align: "right", sort: (p) => p.size, cell: (p) => <span className="tnum font-mono text-[12px] text-dim">{fmt.usd(p.size, 0)}</span>, hide: "hidden md:table-cell" },
    { key: "liq", head: "LIKUIDASI", align: "right", cell: (p) => <span className="tnum font-mono text-[12px] text-blood">{fmt.price(liq(p))}</span>, hide: "hidden lg:table-cell" },
    {
      key: "pnl",
      head: "PNL",
      align: "right",
      sort: (p) => pnl(p),
      cell: (p) => {
        const v = pnl(p);
        return <span className={`tnum font-mono text-[12px] ${v >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct((v / p.margin) * 100)}</span>;
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
            spend(pnl(p));
            toast(`${p.pair} ditutup · PnL direalisasi ${fmt.usd(pnl(p), 2)}.`, pnl(p) >= 0 ? "mint" : "blood");
          }}
        >
          Tutup
        </Btn>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumb="PLATFORM / PORTOFOLIO"
        index="04"
        kicker="SATU AKUN MARGIN · USDC"
        title={
          <>
            Semua posisi,
            <br />
            satu neraca.
          </>
        }
        lead="Kurva launchpad, spot, dan perpetual berbagi satu akun margin USDC di HyperCore. Tidak ada pemindahan dana antar sub-akun."
        actions={
          <>
            <Btn variant="primary" onClick={() => toast("Permintaan deposit dikirim ke bridge USDC.", "mint")}>
              Deposit USDC
            </Btn>
            <Btn variant="ghost" onClick={() => toast("Penarikan masuk antrean — 1 konfirmasi blok.", "amber")}>
              Tarik dana
            </Btn>
          </>
        }
        meta={
          <>
            <div className="tnum font-mono text-[28px] font-bold leading-none text-bone">{fmt.usd(equity, 2)}</div>
            <Micro className="mt-1 block text-dim">NILAI EKUITAS</Micro>
            <div className="mt-3">
              <KV k="PnL belum realisasi" v={`${upnl >= 0 ? "+" : "−"}${fmt.usd(Math.abs(upnl), 2)}`} tone={upnl >= 0 ? "mint" : undefined} />
              <KV k="Saldo menganggur" v={fmt.usd(balance, 2)} />
              <KV k="Margin terpakai" v={`${fmt.n((marginUsed / equity) * 100, 1)}%`} tone="amber" />
            </div>
          </>
        }
      />

      <div className="wrap py-10 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Reveal>
            <Card
              title="Kurva ekuitas"
              kicker="64 HARI"
              tools={<Micro className="text-mint">+41,8%</Micro>}
              bodyClass="p-4"
            >
              <AreaCurve values={EQUITY} height={190} />
              <div className="mt-4 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
                {[
                  ["TERBAIK", "$19.884"],
                  ["TERBURUK", "$12.940"],
                  ["DRAWDOWN", "−8,4%"],
                  ["SHARPE", "2,41"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#0e1216] px-3 py-2.5">
                    <Micro className="text-dim">{k}</Micro>
                    <div className="tnum mt-1 font-mono text-[13px] text-bone">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={0.06}>
              <Card title="Alokasi" kicker="NILAI EKUITAS" bodyClass="p-4">
                <div className="flex h-3 w-full overflow-hidden border border-edge">
                  {ALLOC.map(([k, v, c]) => (
                    <span key={k} style={{ width: `${v}%`, background: c, opacity: 0.85 }} className="transition-all duration-500 hover:opacity-100" />
                  ))}
                </div>
                <ul className="mt-4 space-y-2.5">
                  {ALLOC.map(([k, v, c]) => (
                    <li key={k} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5" style={{ background: c }} />
                        <span className="text-[12.5px] text-bone/85">{k}</span>
                      </span>
                      <span className="tnum font-mono text-[12px] text-dim">{v}%</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card title="Tier biaya" kicker="STAKING HYPE" bodyClass="p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[13px] font-bold text-amber">TIER 2</span>
                  <Micro className="text-dim">DISKON 12%</Micro>
                </div>
                <Meter value={0.62} className="mt-3" segments={26} />
                <p className="mt-3 text-[12px] leading-relaxed text-dim">
                  Stake 6.200 dari 10.000 HYPE yang dibutuhkan untuk Tier 3 (diskon 22%).
                </p>
                <div className="mt-3 border-t border-edge pt-3">
                  <KV k="Maker" v="0,0176%" tone="mint" />
                  <KV k="Taker" v="0,0396%" />
                </div>
              </Card>
            </Reveal>
          </div>
        </div>

        <div className="mt-10">
          <Card title="Posisi terbuka" kicker={`${pos.length} AKTIF`} bodyClass="p-0">
            <DataTable rows={pos} cols={cols} initialSort={{ key: "pnl", dir: -1 }} empty="TIDAK ADA POSISI — BUKA DARI TERMINAL TRADE" />
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Riwayat akun" kicker="7 HARI TERAKHIR" bodyClass="p-0">
            <ul>
              {HIST.map((r, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-edge/70 px-4 py-3 last:border-0 sm:grid-cols-[0.9fr_1.1fr_0.8fr_auto]">
                  <Micro className="text-dim">{r[0]}</Micro>
                  <span className="truncate font-mono text-[11.5px] text-bone">{r[1]}</span>
                  <span className="hidden truncate text-[11.5px] text-dim sm:block">{r[2]}</span>
                  <span
                    className={`tnum justify-self-end font-mono text-[12px] ${
                      r[3].startsWith("+") ? "text-mint" : r[3].startsWith("−") ? "text-blood" : "text-dim"
                    }`}
                  >
                    {r[3]}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Kesehatan akun" kicker="RISIKO" bodyClass="p-4">
            <div className="flex items-end justify-between">
              <div>
                <Micro className="text-dim">RASIO MARGIN</Micro>
                <div className="tnum mt-1 font-mono text-[30px] font-bold leading-none text-mint">312%</div>
              </div>
              <Sparkline values={makeSpark(91, 26, 100, 0.04)} w={92} h={34} up />
            </div>
            <div className="mt-4">
              <Meter value={0.234} tone="mint" segments={30} />
              <div className="mt-1.5 flex justify-between">
                <Micro className="text-dim">0%</Micro>
                <Micro className="text-amber">AMBANG MARGIN CALL 150%</Micro>
                <Micro className="text-dim">400%</Micro>
              </div>
            </div>
            <div className="mt-4 border-t border-edge pt-3">
              <KV k="Jarak likuidasi terjauh" v="18,4%" tone="mint" />
              <KV k="Eksposur terkonsentrasi" v="NVDA · 41%" tone="amber" />
              <KV k="Cross margin" v="AKTIF (PERMANEN)" />
            </div>
          </Card>
        </div>

        <PageNav prev={{ label: "Trade", to: "/trade" }} next={{ label: "HIP-3 Deployer", to: "/hip-3" }} />
      </div>
    </>
  );
}

function pnl(p: Position) {
  const sign = p.side === "LONG" ? 1 : -1;
  return p.size * (p.mark / p.entry - 1) * sign;
}
function liq(p: Position) {
  const sign = p.side === "LONG" ? 1 : -1;
  return p.entry * (1 - sign * (0.95 / p.lev));
}
