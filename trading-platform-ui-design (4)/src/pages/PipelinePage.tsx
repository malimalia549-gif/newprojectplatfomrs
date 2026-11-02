import Pipeline from "../components/Pipeline";
import { Btn, Card, KV, Micro, PageHeader, PageNav, Reveal, fmt } from "../components/ui";
import { useApp } from "../store";

export default function PipelinePage() {
  const { ticker, setTicker, toast } = useApp();

  return (
    <>
      <PageHeader
        crumb="PLATFORM / PIPELINE TOKEN"
        index="06"
        kicker="CREATE → TRADING → GRADUATE → UNISWAP POOL → SELESAI"
        title={
          <>
            Mesin
            <br />
            peluncuran.
          </>
        }
        lead="Lima stasiun pada satu rel. Tekan RUN dan biarkan chip token berjalan sendiri sampai likuiditas terkunci, atau ambil alih setiap stasiun secara manual — kurva, harga, dan market cap dihitung langsung."
        actions={
          <>
            <Btn href="#/launchpad" variant="ghost">
              Lihat antrean launchpad
            </Btn>
            <Btn
              variant="primary"
              onClick={() => {
                setTicker(ticker);
                toast(`Ticker ${ticker} dimuat ke mesin pipeline.`, "amber");
                document.getElementById("pipeline-root")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Muat {ticker}
            </Btn>
          </>
        }
        meta={
          <>
            <KV k="Ticker aktif" v={ticker} tone="amber" />
            <KV k="Target kurva" v="8.531 SOL" />
            <KV k="Likuiditas ke pool" v={fmt.usd(284119, 0)} />
            <KV k="Kunci LP" v="365 hari" tone="mint" />
            <KV k="Biaya total" v="$619,00" />
          </>
        }
      />

      <div id="pipeline-root" style={{ scrollMarginTop: "6rem" }}>
        <Pipeline ticker={ticker} setTicker={setTicker} />
      </div>

      <div className="wrap pb-4 pt-12">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <Card bodyClass="p-0" title="Rincian biaya" kicker="SEKALI PER TICKER">
              <table className="w-full">
                <tbody>
                  {[
                    ["Create ticker", "$0,00", "tanpa kurasi, tanpa izin"],
                    ["Graduation", "$199,00", "ditarik saat kurva penuh"],
                    ["Pembuatan pool", "$420,00", "termasuk penguncian LP"],
                    ["Fee trading spot", "0,02% / 0,045%", "maker / taker"],
                    ["Fee creator dari pool", "1,2%", "mengalir otomatis"],
                  ].map(([k, v, n]) => (
                    <tr key={k} className="border-b border-edge/70 last:border-0">
                      <td className="px-4 py-3 text-[13px] text-bone">{k}</td>
                      <td className="tnum px-4 py-3 text-right font-mono text-[12.5px] text-amber">{v}</td>
                      <td className="hidden px-4 py-3 text-right md:table-cell">
                        <Micro className="text-dim">{n}</Micro>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Reveal>

          <Reveal delay={0.06}>
            <Card title="Catatan operasional" kicker="SEBELUM MENEKAN RUN" bodyClass="p-5">
              {[
                ["01", "Likuiditas yang dikunci tidak dapat ditarik creator selama 365 hari; penguncian terjadi on-chain, bukan lewat perjanjian."],
                ["02", "Graduation menetapkan harga dasar dari harga akhir kurva. Tidak ada alokasi tim di luar yang tertulis pada kontrak."],
                ["03", "Ticker yang lulus tidak otomatis menjadi perpetual — itu keputusan terpisah dari deployer HIP-3."],
                ["04", "Setelah lulus, order spot masuk lewat jalur HyperCore biasa dengan ID aset {dex}:{coin}."],
              ].map(([n, t]) => (
                <div key={n} className="flex gap-4 border-b border-edge/70 py-3.5 last:border-0">
                  <span className="tnum font-mono text-[11px] text-amber">{n}</span>
                  <p className="text-[13px] leading-relaxed text-dim">{t}</p>
                </div>
              ))}
            </Card>
          </Reveal>
        </div>

        <PageNav prev={{ label: "HIP-3 Deployer", to: "/hip-3" }} next={{ label: "Dokumentasi", to: "/dokumentasi" }} />
      </div>
    </>
  );
}
