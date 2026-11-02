import { useState } from "react";
import { Btn, Card, KV, Micro, PageHeader, PageNav, Reveal, Screw, Tag, fmt } from "../components/ui";
import { useApp } from "../store";

const SECTIONS: [string, string, string][] = [
  ["s1", "1", "Mulai cepat"],
  ["s2", "2", "Endpoint info"],
  ["s3", "3", "Rumus ID aset"],
  ["s4", "4", "Parameter HIP-3"],
  ["s5", "5", "Jadwal biaya"],
  ["s6", "6", "Siklus hidup pasar"],
  ["s7", "7", "Glosarium"],
  ["s8", "8", "Perubahan"],
];

const PARAMS: [string, string, string][] = [
  ["Stake deployer", "500.000 HYPE", "ditahan; minimal 183 hari setelah deploy"],
  ["Perp DEX per deployer", "1", "satu venue per akun deployer"],
  ["Aset tanpa lelang", "3 pertama", "sisanya lewat Dutch auction bersama"],
  ["Fee scale deployer", "0 – 300%", "di atas 100% protocol fee ikut naik"],
  ["Growth mode", "0 – 100%", "batas fee scale saat mode pertumbuhan"],
  ["Margin", "USDC · cross", "aktivasi cross margin permanen"],
  ["Deviasi orakel", "±1% / pembaruan", "orakel dioperasikan deployer"],
  ["Settlement", "haltTrading", "batalkan order, settle pada mark"],
];

const GLOSS: [string, string, string][] = [
  ["Graduasi", "GRADUATION", "Kurva penuh; likuiditas berpindah ke pool dan dikunci."],
  ["Buku pesanan", "ORDER BOOK", "Antrean beli–jual on-chain yang dicocokkan HyperCore."],
  ["Harga mark", "MARK PRICE", "Acuan posisi dan likuidasi, bukan harga eksekusi."],
  ["Pendanaan", "FUNDING", "Pembayaran berkala agar harga perp menempel harga acuan."],
  ["Likuidasi", "LIQUIDATION", "Penutupan paksa ketika margin tidak lagi mencukupi."],
  ["Open interest", "OPEN INTEREST", "Total notional posisi terbuka pada satu pasar."],
  ["Deployer", "DEPLOYER", "Pihak yang menjalankan pasar HIP-3 dan orakelnya."],
  ["Builder code", "BUILDER CODE", "Operator yang merutekan order dan menarik fee terpisah."],
];

const CHANGELOG: [string, string, string][] = [
  ["2.4.1", "18 FEB 2026", "Terminal trade: timeframe 1m–1H, tab order terbuka & riwayat akun."],
  ["2.4.0", "04 FEB 2026", "Konsol deployer HIP-3: fee scale, cap OI, dan simulasi haltTrading."],
  ["2.3.0", "21 JAN 2026", "Launchpad: filter antrean graduasi dan pembelian langsung dari tabel."],
  ["2.2.0", "09 JAN 2026", "Pipeline lima stasiun dengan rel berjalan dan kurva hidup."],
];

function Code({ lines, onCopy }: { lines: [string, boolean][]; onCopy: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div className="border border-edge bg-[#090807]">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <Micro className="text-dim">PERMINTAAN</Micro>
        <span className="flex items-center gap-3">
          <Screw />
          <button
            onClick={() => {
              onCopy();
              setDone(true);
              setTimeout(() => setDone(false), 1600);
            }}
            className={`font-mono text-[9.5px] tracking-[0.16em] uppercase transition-colors ${
              done ? "text-mint" : "text-dim hover:text-amber"
            }`}
          >
            {done ? "✓ tersalin" : "salin"}
          </button>
        </span>
      </div>
      <pre className="overflow-x-auto px-3 py-3.5 font-mono text-[11.5px] leading-[1.95]">
        {lines.map(([l, hl], i) => (
          <div key={i} className="flex gap-3">
            <span className="tnum w-4 shrink-0 select-none text-right text-edge">{i + 1}</span>
            <span className={hl ? "text-mint" : "text-bone/85"}>{l}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export default function DocsPage() {
  const { toast } = useApp();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <PageHeader
        crumb="PLATFORM / DOKUMENTASI"
        index="07"
        kicker="SPESIFIKASI TEKNIS & REFERENSI"
        title={
          <>
            Angka, rumus,
            <br />
            dan istilah.
          </>
        }
        lead="Referensi ringkas untuk tim produk dan trader: endpoint publik, rumus ID aset builder-deployed, parameter pasar HIP-3, jadwal biaya, siklus hidup pasar, dan glosarium dua bahasa."
        actions={
          <>
            <Btn variant="primary" onClick={() => go("s2")}>
              Loncat ke endpoint
            </Btn>
            <Btn href="#/trade" variant="ghost">
              Buka terminal
            </Btn>
          </>
        }
        meta={
          <>
            <KV k="Sumber" v="api.hyperliquid.xyz" tone="amber" />
            <KV k="Format" v="JSON · POST /info" />
            <KV k="Autentikasi" v="tidak diperlukan" tone="mint" />
            <KV k="Pasar HIP-3 live" v={fmt.n(164)} />
            <KV k="Versi dokumen" v="2.4.1" />
          </>
        }
      />

      <div className="wrap py-10 md:py-12">
        <div className="grid gap-10 lg:grid-cols-[0.28fr_0.72fr]">
          <nav className="lg:sticky lg:top-[7rem] lg:self-start">
            <Micro className="text-dim">DAFTAR ISI</Micro>
            <ul className="mt-3 space-y-px border-l border-edge">
              {SECTIONS.map(([id, n, t]) => (
                <li key={id}>
                  <button
                    onClick={() => go(id)}
                    className="group flex w-full items-center gap-3 border-l-2 border-transparent py-2 pl-3 text-left transition-colors hover:border-amber hover:bg-[#13181c]"
                  >
                    <span className="tnum font-mono text-[10px] text-amber">{n}</span>
                    <span className="text-[12.5px] text-bone/75 transition-colors group-hover:text-bone">{t}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="panel brushed mt-6 p-4">
              <Micro className="text-dim">BUTUH BANTUAN?</Micro>
              <p className="mt-2 text-[12px] leading-relaxed text-dim">
                Spesifikasi pasar HIP-3 berbeda per deployer. Selalu baca kontrak dan sumber
                orakel sebelum membuka posisi.
              </p>
              <Btn href="#/hip-3" variant="quiet" className="mt-3 w-full text-[10px]">
                Ke konsol deployer →
              </Btn>
            </div>
          </nav>

          <div className="min-w-0">
            <Sec id="s1" n="1" title="Mulai cepat" kicker="TIGA LANGKAH">
              <p className="max-w-2xl text-[13.5px] leading-relaxed text-dim">
                Graduate tidak memerlukan kontrak terpisah untuk tiap tahap. Satu dompet menandatangani
                tiga jenis aksi: membuat ticker di kurva, mengirim order ke HyperCore, dan (bagi
                deployer) mendaftarkan perp DEX dengan stake HYPE.
              </p>
              <div className="mt-5 grid gap-px border border-edge bg-edge sm:grid-cols-3">
                {[
                  ["01", "Buat ticker", "Tanpa biaya, tanpa izin — kurva langsung aktif."],
                  ["02", "Tunggu graduasi", "8.531 SOL terkumpul, likuiditas dikunci 365 hari."],
                  ["03", "Perdagangkan", "Spot di buku HyperCore; perp bila deployer mendaftarkan."],
                ].map(([n, t, d]) => (
                  <div key={n} className="bg-[#0e1216] px-4 py-4">
                    <span className="tnum font-mono text-[11px] text-amber">{n}</span>
                    <div className="mt-2 text-[13.5px] font-semibold text-bone">{t}</div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-dim">{d}</p>
                  </div>
                ))}
              </div>
            </Sec>

            <Sec id="s2" n="2" title="Endpoint info publik" kicker="TANPA KUNCI API">
              <p className="max-w-2xl text-[13.5px] leading-relaxed text-dim">
                Seluruh metadata pasar tersedia lewat satu endpoint. Direktori venue deployer dan
                konteks aset (harga, volume, open interest, funding, leverage maksimal) datang dari
                dua tipe permintaan berikut.
              </p>
              <div className="mt-4">
                <Code
                  onCopy={() => toast("Snippet endpoint disalin ke papan klip.", "mint")}
                  lines={[
                    ["POST https://api.hyperliquid.xyz/info", true],
                    ['{ "type": "perpDexs" }              // direktori venue + alamat deployer', false],
                    ['{ "type": "metaAndAssetCtxs" }      // harga, vol 24j, OI, funding, lev', false],
                    ['{ "type": "allMids" }               // harga tengah semua pasar', false],
                  ]}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Tag tone="mint">READ-ONLY</Tag>
                <Tag tone="dim">RATE LIMIT 1.200 REQ/MENIT</Tag>
                <Tag tone="amber">RESPON JSON</Tag>
              </div>
            </Sec>

            <Sec id="s3" n="3" title="Rumus ID aset" kicker="{DEX}:{COIN}">
              <p className="max-w-2xl text-[13.5px] leading-relaxed text-dim">
                Order builder-deployed memakai jalur HyperCore biasa. Yang berbeda hanya penamaan
                dan ID aset integer, sehingga dua deployer dapat memakai ticker pendek yang sama
                tanpa bertabrakan di API.
              </p>
              <div className="mt-4">
                <Code
                  onCopy={() => toast("Rumus ID aset disalin.", "mint")}
                  lines={[
                    ["asset_id = 100000 + perpDexIndex × 10000 + indexInMeta", true],
                    ["100000 + (1 × 10000) + 42 = 110042", false],
                    ['nama pasar  →  "grvd:KUDA"', false],
                    ["aksi order  →  order/cancel HyperCore standar", false],
                  ]}
                />
              </div>
              <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-dim">
                Klien yang sudah berbicara HyperCore tidak memerlukan jalur kode khusus HIP-3 —
                cukup memetakan nama <span className="text-bone">{"{dex}:{coin}"}</span> ke integer
                yang benar.
              </p>
            </Sec>

            <Sec id="s4" n="4" title="Parameter pasar HIP-3" kicker="ATURAN SAAT INI">
              <Card bodyClass="p-0" className="mt-1">
                <table className="w-full">
                  <tbody>
                    {PARAMS.map(([k, v, n]) => (
                      <tr key={k} className="border-b border-edge/70 last:border-0">
                        <td className="px-4 py-3 text-[13px] text-bone">{k}</td>
                        <td className="tnum px-4 py-3 text-right font-mono text-[12px] text-amber">{v}</td>
                        <td className="hidden px-4 py-3 text-right md:table-cell">
                          <Micro className="text-dim">{n}</Micro>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </Sec>

            <Sec id="s5" n="5" title="Jadwal biaya" kicker="LAUNCHPAD + PERDAGANGAN">
              <div className="grid gap-px border border-edge bg-edge sm:grid-cols-2">
                {[
                  ["Create ticker", "$0,00"],
                  ["Graduation", "$199,00"],
                  ["Pembuatan pool", "$420,00"],
                  ["Fee maker / taker spot", "0,02% / 0,045%"],
                  ["Fee taker perp HIP-3", "0,09% × (1 + scale)"],
                  ["Bagian deployer", "50% dari fee pasar"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 bg-[#0e1216] px-4 py-3.5">
                    <Micro className="text-dim">{k}</Micro>
                    <span className="tnum font-mono text-[12.5px] text-bone">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-dim">
                Diskon tier staking, rujukan, dan penyesuaian kolateral mempengaruhi tarif akhir.
                Pasar HIP-3 menagih dua kali fee perp validator; protokol menerima pendapatan yang
                sama per trade, deployer menerima sisanya.
              </p>
            </Sec>

            <Sec id="s6" n="6" title="Siklus hidup pasar" kicker="CREATE → SETTLE">
              <ol className="mt-1 space-y-px border border-edge bg-edge">
                {[
                  ["Deploy", "Stake 500.000 HYPE, daftarkan satu perp DEX."],
                  ["Listing", "Tiga aset pertama tanpa lelang; berikutnya Dutch auction."],
                  ["Operasi", "Orakel diperbarui dalam batas deviasi, cap OI ditegakkan."],
                  ["Perdagangan", "Order masuk HyperCore dengan ID aset builder."],
                  ["Settlement", "haltTrading membatalkan order dan menutup posisi pada mark."],
                  ["Pemulihan", "Aksi yang sama dapat melanjutkan atau mendaur ulang aset."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex items-start gap-4 bg-[#0e1216] px-4 py-3.5">
                    <span className="tnum mt-0.5 font-mono text-[11px] text-amber">0{i + 1}</span>
                    <span>
                      <span className="block text-[13px] font-semibold text-bone">{t}</span>
                      <span className="mt-1 block text-[12.5px] leading-relaxed text-dim">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Sec>

            <Sec id="s7" n="7" title="Glosarium" kicker="ID — ING">
              <dl className="border-t border-edge">
                {GLOSS.map(([id, en, d]) => (
                  <div key={id} className="grid gap-1.5 border-b border-edge/70 py-4 md:grid-cols-[0.3fr_0.7fr] md:gap-6">
                    <dt>
                      <span className="block text-[14px] font-semibold text-bone">{id}</span>
                      <Micro className="text-amber">{en}</Micro>
                    </dt>
                    <dd className="text-[13px] leading-relaxed text-dim">{d}</dd>
                  </div>
                ))}
              </dl>
            </Sec>

            <Sec id="s8" n="8" title="Perubahan" kicker="RIILIS ANTARMUKA">
              <ul className="mt-1 space-y-px border border-edge bg-edge">
                {CHANGELOG.map(([v, d, t]) => (
                  <li key={v} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-[#0e1216] px-4 py-3.5">
                    <span className="tnum font-mono text-[12px] font-bold text-amber">v{v}</span>
                    <Micro className="text-dim">{d}</Micro>
                    <span className="w-full text-[12.5px] leading-relaxed text-bone/80 md:w-auto md:flex-1">{t}</span>
                  </li>
                ))}
              </ul>
            </Sec>

            <PageNav prev={{ label: "Pipeline token", to: "/pipeline" }} next={{ label: "Dashboard", to: "/" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function Sec({
  id,
  n,
  title,
  kicker,
  children,
}: {
  id: string;
  n: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section id={id} style={{ scrollMarginTop: "7rem" }} className="mb-12 border-b border-edge pb-10 last:border-0">
        <div className="flex items-baseline gap-3">
          <Micro className="text-amber">{n}</Micro>
          <Micro className="text-dim">{kicker}</Micro>
        </div>
        <h2 className="mt-2 text-[clamp(1.35rem,3vw,2rem)] font-bold tracking-[-0.035em]">{title}</h2>
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}
