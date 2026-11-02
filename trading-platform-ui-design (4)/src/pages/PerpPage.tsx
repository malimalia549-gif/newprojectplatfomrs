import { useState } from "react";
import { DexDirectory } from "../components/terminal";
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
import { MARKETS, type Market } from "../lib/data";
import { useApp } from "../store";

const RISIKO: [string, string, string][] = [
  [
    "01",
    "Orakel dioperasikan deployer",
    "Mark price pasar builder tidak dijaga validator. Saat likuiditas tipis atau akhir pekan, mark bisa menyimpang dari harga spot — dan likuidasi dihitung dari mark.",
  ],
  [
    "02",
    "haltTrading menutup paksa",
    "Deployer dapat menghentikan pasar: seluruh order dibatalkan dan posisi disettle pada mark berjalan, bukan pada harga masuk maupun harga likuidasi.",
  ],
  [
    "03",
    "Cross margin tidak bisa dibatalkan",
    "Sekali aset HIP-3 diaktifkan untuk cross margin, keputusannya permanen dan wajib memenuhi standar likuiditas, orakel, serta ketahanan manipulasi validator.",
  ],
  [
    "04",
    "Stake adalah jaminan, bukan asuransi",
    "500.000 HYPE dapat di-slash bila deployer memanipulasi orakel atau melanggar aturan pasar. Itu mekanisme keamanan protokol, bukan dana kompensasi trader.",
  ],
];

export default function PerpPage() {
  const { toast } = useApp();
  const [scale, setScale] = useState(100);
  const [oiCap, setOiCap] = useState(24_000_000);
  const [maxLev, setMaxLev] = useState(20);
  const [devBps, setDevBps] = useState(60);
  const [halted, setHalted] = useState(false);

  const base = 0.045; // % taker fee perp validator
  const hip3 = base * 2;
  const trader = hip3 * (1 + scale / 100);
  const deployer = trader / 2;
  const maint = 1 / (2 * maxLev);

  const rows = MARKETS.filter((m) => m.kind === "PERP").slice(0, 6);
  const cols: Col<Market>[] = [
    {
      key: "pair",
      head: "PASAR",
      cell: (m) => (
        <span className="flex items-center gap-2.5">
          <Lamp on={!halted || m.dex !== "grvd"} color={halted && m.dex === "grvd" ? "blood" : "mint"} />
          <span className="font-mono text-[12px] font-bold text-bone">{m.pair}</span>
        </span>
      ),
    },
    { key: "oi", head: "OPEN INTEREST", align: "right", sort: (m) => m.oi, cell: (m) => <span className="tnum font-mono text-[12px] text-dim">{fmt.usd(m.oi, 0)}</span> },
    {
      key: "cap",
      head: "TERHADAP CAP",
      align: "right",
      cell: (m) => {
        const p = Math.min(1, m.oi / oiCap);
        return (
          <span className="flex items-center justify-end gap-3">
            <Meter value={p} segments={12} tone={p > 0.8 ? "mint" : "amber"} className="w-[70px]" />
            <span className="tnum w-11 text-right font-mono text-[11px] text-dim">{(p * 100).toFixed(0)}%</span>
          </span>
        );
      },
      hide: "hidden md:table-cell",
    },
    { key: "lev", head: "LEV MAKS", align: "right", cell: (m) => <span className="tnum font-mono text-[12px] text-bone">{Math.min(m.lev || 25, maxLev)}×</span>, hide: "hidden lg:table-cell" },
    {
      key: "fee",
      head: "FEE TAKER",
      align: "right",
      cell: () => <span className="tnum font-mono text-[12px] text-amber">{trader.toFixed(4).replace(".", ",")}%</span>,
      hide: "hidden sm:table-cell",
    },
    {
      key: "st",
      head: "STATUS",
      align: "right",
      cell: (m) =>
        halted && m.dex === "grvd" ? <Tag tone="blood">HALTED</Tag> : m.status === "HALTED" ? <Tag tone="blood">HALTED</Tag> : <Tag tone="mint">LIVE</Tag>,
    },
  ];

  return (
    <>
      <PageHeader
        crumb="PLATFORM / HIP-3 DEPLOYER"
        index="05"
        kicker="BUILDER-DEPLOYED PERPETUALS"
        title={
          <>
            Konsol
            <br />
            deployer.
          </>
        }
        lead="Satu deployer menjalankan satu perp DEX: memilih aset, mengoperasikan orakel, menetapkan leverage dan fee, membatasi open interest, serta dapat menghentikan pasar. Matching, margin, dan settlement tetap milik HyperCore."
        actions={
          <>
            <Btn
              variant={halted ? "mint" : "blood"}
              onClick={() => {
                setHalted((h) => !h);
                toast(
                  halted ? "Trading dilanjutkan — order book dibuka kembali." : "haltTrading dipanggil: order dibatalkan, posisi disettle pada mark.",
                  halted ? "mint" : "blood",
                );
              }}
            >
              {halted ? "Lanjutkan trading" : "Panggil haltTrading"}
            </Btn>
            <Btn href="#/dokumentasi" variant="ghost">
              Spesifikasi HIP-3
            </Btn>
          </>
        }
        meta={
          <>
            <KV k="DEX index" v="1 → aset 110042" tone="amber" />
            <KV k="Stake ditahan" v="500.000 HYPE" />
            <KV k="Ikatan minimum" v="183 hari" />
            <KV k="Aset tanpa lelang" v="3 pertama" tone="mint" />
            <KV k="Status venue" v={halted ? "HALT TRADING" : "OPERASIONAL"} tone={halted ? undefined : "mint"} />
          </>
        }
      />

      {halted && (
        <div className="border-b border-blood/40 bg-blood/[0.07]">
          <div className="wrap flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3">
              <Lamp on color="blood" pulse />
              <span className="font-mono text-[11.5px] tracking-[0.12em] text-blood uppercase">
                haltTrading aktif — pasar grvd disettle pada mark berjalan
              </span>
            </span>
            <Btn variant="quiet" className="text-[10px]" onClick={() => setHalted(false)}>
              Pulihkan
            </Btn>
          </div>
        </div>
      )}

      <div className="wrap py-10 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* parameter console */}
          <Reveal>
            <Card title="Parameter pasar" kicker="DIATUR DEPLOYER" bodyClass="p-5">
              <Slider
                label="Fee scale deployer"
                value={scale}
                min={0}
                max={300}
                step={5}
                suffix="%"
                hint="Di atas 100% protocol fee ikut naik agar setara dengan bagian deployer."
                onChange={setScale}
              />
              <Slider
                label="Batas open interest"
                value={oiCap}
                min={1_000_000}
                max={120_000_000}
                step={500_000}
                fmt={(v) => fmt.usd(v, 0)}
                hint="OI bersifat streaming: melewati cap membuat order penambah posisi ditolak."
                onChange={setOiCap}
              />
              <Slider
                label="Leverage maksimum"
                value={maxLev}
                min={5}
                max={40}
                step={1}
                suffix="×"
                hint={`Maintenance margin = 1 / (2 × leverage) = ${(maint * 100).toFixed(2).replace(".", ",")}%`}
                onChange={setMaxLev}
              />
              <Slider
                label="Deviasi orakel per pembaruan"
                value={devBps}
                min={10}
                max={200}
                step={5}
                suffix=" bps"
                hint="Orakel HIP-3 dibatasi ±1% per pembaruan; deviasi besar mempercepat drift mark."
                onChange={setDevBps}
              />

              <div className="mt-6 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-4">
                {[
                  ["FEE TRADER", `${trader.toFixed(4).replace(".", ",")}%`, "amber"],
                  ["BAGIAN DEPLOYER", `${deployer.toFixed(4).replace(".", ",")}%`, "mint"],
                  ["BAGIAN PROTOKOL", `${(trader - deployer).toFixed(4).replace(".", ",")}%`, undefined],
                  ["NOTIONAL MAKS", fmt.usd(oiCap, 0), undefined],
                ].map(([k, v, tone]) => (
                  <div key={k} className="bg-[#0e1216] px-3 py-3">
                    <Micro className="text-dim">{k}</Micro>
                    <div className={`tnum mt-1 font-mono text-[14px] ${tone === "amber" ? "text-amber" : tone === "mint" ? "text-mint" : "text-bone"}`}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={0.06}>
              <Card title="Ikatan stake" kicker="500.000 HYPE" bodyClass="p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <Micro className="text-dim">TERKUNCI</Micro>
                    <div className="tnum mt-1 font-mono text-[26px] font-bold leading-none text-amber">100%</div>
                  </div>
                  <div className="text-right">
                    <Micro className="text-dim">SISA IKATAN</Micro>
                    <div className="tnum mt-1 font-mono text-[14px] text-bone">121 hari</div>
                  </div>
                </div>
                <Meter value={0.34} className="mt-4" segments={30} />
                <p className="mt-3 text-[12px] leading-relaxed text-dim">
                  Stake dapat di-slash bila orakel dimanipulasi atau aturan pasar dilanggar, dan
                  tetap ditahan minimal 183 hari setelah deploy — termasuk 30 hari setelah semua
                  pasar dihentikan.
                </p>
                <div className="mt-4 border-t border-edge pt-3">
                  <KV k="Risiko slash saat ini" v="RENDAH" tone="mint" />
                  <KV k="Sengketa terbuka" v="0" />
                </div>
              </Card>
            </Reveal>

            <Reveal delay={0.1}>
              <Card title="Antrean listing" kicker="LELANG BELANDA" bodyClass="p-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[13px] font-bold text-bone">grvd:EMAS</span>
                  <span className="tnum font-mono text-[18px] font-bold text-amber">14.208 HYPE</span>
                </div>
                <Micro className="mt-1 block text-dim">HARGA LELANG TURUN SETIAP 10 MENIT</Micro>
                <Meter value={0.58} className="mt-4" segments={26} />
                <div className="mt-4 space-y-2 border-t border-edge pt-3">
                  <KV k="Aset ke-1 s.d. ke-3" v="TANPA LELANG" tone="mint" />
                  <KV k="Aset ke-4 dst" v="LELANG SHARED" />
                  <KV k="Aset live venue ini" v="6" />
                </div>
              </Card>
            </Reveal>
          </div>
        </div>

        <div className="mt-10">
          <Card bodyClass="p-0" title="Pasar yang kamu deploy" kicker={`${rows.length} ASET`} tools={<Micro className="text-dim">CAP OI {fmt.usd(oiCap, 0)}</Micro>}>
            <DataTable rows={rows} cols={cols} initialSort={{ key: "oi", dir: -1 }} />
          </Card>
        </div>

        <div className="mt-10">
          <Card
            bodyClass="p-0"
            title="DEX builder aktif"
            kicker="DATA LANGSUNG · perpDexs"
            tools={<Btn href="#/trade" variant="ghost" className="px-3 py-1.5 text-[12px]">Buka terminal</Btn>}
          >
            <DexDirectory />
          </Card>
        </div>
      </div>

      <div className="wrap py-12">
        <div className="border-b border-edge pb-4">
          <Micro className="text-amber">BATAS TANGGUNG JAWAB</Micro>
          <h2 className="mt-2 text-[clamp(1.4rem,3.2vw,2.2rem)] font-bold tracking-[-0.035em]">
            Apa yang bukan milik protokol
          </h2>
        </div>
        <div className="mt-6 grid gap-x-10 lg:grid-cols-2">
          {RISIKO.map(([n, t, d]) => (
            <div key={n} className="grid grid-cols-[auto_1fr] gap-x-5 border-b border-edge py-5">
              <span className="tnum font-mono text-[11px] text-amber">{n}</span>
              <div>
                <h3 className="text-[14.5px] font-semibold text-bone">{t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-dim">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <PageNav prev={{ label: "Portofolio", to: "/portofolio" }} next={{ label: "Pipeline token", to: "/pipeline" }} />
      </div>
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  hint,
  onChange,
  fmt: f,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  hint: string;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <div className="border-b border-edge py-4 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <Micro className="text-dim">{label}</Micro>
        <span className="tnum font-mono text-[15px] font-bold text-amber">
          {f ? f(value) : fmt.n(value)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full"
        style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
        aria-label={label}
      />
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-dim">{hint}</p>
    </div>
  );
}
