import { useState } from "react";
import { cn } from "@/utils/cn";
import { MARKETS, fmtPrice } from "@/lib/sim";
import { Btn, BtnLink, Chip, Eyebrow, Icon, Reveal, SectionHead } from "./primitives";

/* ------------------------------------------------------------------ voices */

const VOICES = [
  {
    q: "Dulu setelah graduasi kami cuma bisa menunggu volume spot naik sendiri. Sekarang hari yang sama kami sudah punya orderbook perp dengan funding berjalan.",
    n: "Arga Wisesa",
    r: "Deployer · 4 market HIP-3",
    m: "$31K fee / bulan",
    c: "#3fdca5",
    off: "lg:mt-0",
  },
  {
    q: "Yang meyakinkan kami: LP dikunci permanen dan ticker dibeli lewat lelang terbuka. Tidak ada pintu belakang, tidak ada tim yang bisa menarik likuiditas.",
    n: "Mira Kusuma",
    r: "Riset · Kolektif on-chain",
    m: "audit 2×",
    c: "#e6a52c",
    off: "lg:mt-10",
  },
  {
    q: "Kami listing indeks komoditas, bukan memecoin. Oracle TWAP dari pool spot bikin market-nya cukup stabil untuk dipakai hedge oleh treasury klien.",
    n: "Bagas Nugroho",
    r: "Builder · Komoditas",
    m: "OI $6,2M",
    c: "#86c5ff",
    off: "lg:mt-4",
  },
];

export function Voices() {
  return (
    <section className="relative border-t border-line py-20 sm:py-24">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <SectionHead
          kicker="07 · dari para builder"
          title={
            <>
              Mereka sudah
              <br />
              <span className="text-gold-300">melewati garis SELESAI.</span>
            </>
          }
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {VOICES.map((v, i) => (
            <Reveal key={v.n} delay={i * 90} className={v.off}>
              <figure className="card-hover relative flex h-full flex-col overflow-hidden rounded-[13px] border border-line bg-ink-900/70 p-6">
                <span
                  className="pointer-events-none absolute -top-8 -right-2 font-display text-[120px] leading-none font-extrabold opacity-[0.07] select-none"
                  style={{ color: v.c }}
                >
                  ”
                </span>
                <blockquote className="relative text-[14.5px] leading-[1.75] text-paper/90">
                  {v.q}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <span
                    className="h-9 w-9 shrink-0 rounded-full border border-line"
                    style={{ background: `linear-gradient(140deg, ${v.c}, #0b1214 75%)` }}
                  />
                  <span className="min-w-0">
                    <span className="block font-display text-[14px] font-bold text-paper">{v.n}</span>
                    <span className="block font-mono text-[10.5px] text-faint">{v.r}</span>
                  </span>
                  <span className="ml-auto shrink-0 rounded-full border border-line bg-ink-950/70 px-2.5 py-1 font-mono text-[10px] text-mint-400">
                    {v.m}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- faq */

const FAQS = [
  {
    q: "Apa itu HIP-3 dan kenapa itu mengubah launchpad?",
    a: "HIP-3 adalah proposal Hyperliquid yang mengizinkan pihak ketiga men-deploy market perpetual mereka sendiri di HyperCore, berdampingan dengan market inti seperti BTC dan ETH. Artinya sebuah ticker yang lahir di launchpad tidak harus berakhir sebagai token spot yang likuiditasnya menipis — ia bisa punya venue kedua dengan leverage, short, dan funding, memakai matching engine yang sama.",
  },
  {
    q: "Berapa biaya untuk membeli ticker di HyperCore?",
    a: "Tidak ada harga tetap. Ticker dialokasikan lewat lelang terbuka: kamu menempatkan bid, siapa pun boleh menawar lebih tinggi selama window berjalan, dan bid tertinggi saat finalisasi memegang hak deploy. Untuk ticker yang sudah punya pool spot aktif dan volume nyata, nilai wajarnya mengikuti ekspektasi fee perp ke depan — kalkulator di bagian Ekonomi memberi gambaran kasarnya.",
  },
  {
    q: "Apakah dana saya ditahan di platform ini?",
    a: "Tidak. Seluruh alur berjalan lewat kontrak: vault kolateral, bonding curve, dan kontrak graduasi. Kunci privat tidak pernah menyentuh infrastruktur kami, LP token dikunci permanen di kontrak, dan setiap transaksi bisa kamu verifikasi lewat hash yang muncul di konsol terminal.",
  },
  {
    q: "Apa yang terjadi kalau graduasi gagal di tengah jalan?",
    a: "Graduasi bersifat atomik dalam satu transaksi: tutup kurva, swap cadangan, tambah likuiditas, kunci LP. Jika salah satu langkah gagal, semuanya di-rollback dan dana tetap berada di vault dengan kurva yang masih aktif. Tidak ada keadaan setengah lulus yang bisa merugikan holder.",
  },
  {
    q: "Bisakah ticker saya diambil alih orang lain?",
    a: "Selama window lelang masih terbuka, ya — itu sifatnya pasar terbuka. Setelah finalisasi dan market perp ter-deploy, hak atas ticker menjadi aset yang bisa dipindahtangankan secara eksplisit oleh pemegangnya, bukan disita otomatis karena ada bid baru.",
  },
  {
    q: "Bagaimana builder fee dihitung dan dibayarkan?",
    a: "Fee dipotong dari setiap taker fill di market perp kamu sesuai bps yang kamu tentukan (0,10%–1,50%), lalu didistribusikan harian ke alamat deployer dalam USDC. Tidak ada invoice, tidak ada ambang penarikan minimum, dan pembagiannya dengan validator serta insurance fund terlihat di panel distribusi.",
  },
  {
    q: "Aset apa saja yang bisa di-forge, selain memecoin?",
    a: "Apa pun yang punya sumber harga bisa dipercaya: saham tunggal, komoditas, indeks, sampai market prediksi berbasis event. Syaratnya hanya satu — oracle yang valid, baik dari pool spot yang kamu luluskan maupun dari feed eksternal yang didukung.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative border-t border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <SectionHead
              kicker="08 · pertanyaan"
              title={
                <>
                  Hal yang paling
                  <br />
                  <span className="text-ice-300">sering ditanya.</span>
                </>
              }
              lede="Tidak menemukan jawabannya? Tim builder kami aktif di Discord dan biasanya membalas di bawah sepuluh menit."
            />
            <BtnLink href="#terminal" variant="ghost" className="mt-7 px-5 py-3 text-[13.5px]">
              Coba terminalnya dulu <Icon.Arrow className="h-3.5 w-3.5" />
            </BtnLink>
          </div>

          <div className="divide-y divide-line border-y border-line">
            {FAQS.map((f, i) => {
              const on = open === i;
              return (
                <div key={f.q}>
                  <button
                    onClick={() => setOpen(on ? null : i)}
                    className="group flex w-full cursor-pointer items-start gap-4 py-5 text-left"
                    aria-expanded={on}
                  >
                    <span className="mt-[3px] font-mono text-[11px] text-faint tabular">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "flex-1 font-display text-[16.5px] leading-snug font-semibold tracking-[-0.015em] transition-colors sm:text-[18px]",
                        on ? "text-mint-300" : "text-paper group-hover:text-mint-200"
                      )}
                    >
                      {f.q}
                    </span>
                    <span
                      className={cn(
                        "relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-400",
                        on ? "rotate-180 border-mint-500/60 bg-mint-500/12 text-mint-300" : "border-line text-faint group-hover:border-ink-500"
                      )}
                    >
                      <Icon.Chevron className="h-3.5 w-3.5" />
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[74ch] pb-6 pl-9 text-[14px] leading-[1.8] text-muted">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- cta */

export function CTABand() {
  const [t, setT] = useState("");
  const [go, setGo] = useState(false);

  return (
    <section className="relative overflow-hidden border-t border-line bg-ink-900">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-[520px] rounded-[50%] bg-mint-600/12 blur-[100px]" />
      <div className="pointer-events-none absolute -right-10 -bottom-24 h-64 w-[420px] rounded-[50%] bg-gold-500/[0.09] blur-[100px]" />

      <div
        aria-hidden
        className="marquee-wrap pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden opacity-[0.055]"
      >
        <div className="marquee-track">
          {[0, 1].map((d) => (
            <div key={d} className="flex shrink-0">
              {MARKETS.map((m) => (
                <span
                  key={`${d}-${m.sym}`}
                  className="px-6 font-display text-[64px] leading-none font-extrabold whitespace-nowrap text-paper"
                >
                  {m.sym} · {fmtPrice(m.px)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Reveal>
            <Eyebrow>09 · mulai</Eyebrow>
            <h2 className="headline mt-5 text-[clamp(2.3rem,6vw,4.4rem)]">
              Ticker itu masih
              <br />
              <span className="text-mint-400">belum ada yang punya.</span>
            </h2>
            <p className="mt-6 max-w-[50ch] text-[15px] leading-relaxed text-muted">
              Deploy market spot, luluskan ke Uniswap, lalu beli tickernya di HyperCore. Dalam satu
              sesi, ticker kamu bisa punya dua venue — dan kamu dapat fee dari keduanya.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Chip tone="mint">tanpa izin</Chip>
              <Chip tone="gold">tanpa biaya listing</Chip>
              <Chip tone="ice">non-custodial</Chip>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setGo(true);
                setTimeout(() => {
                  document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth" });
                  setGo(false);
                }, 700);
              }}
              className="panel-raised rounded-[13px] p-5 sm:p-6"
            >
              <label className="eyebrow mb-3 block">cek ketersediaan ticker</label>
              <div className="flex items-center gap-2 rounded-[9px] border border-line bg-ink-950/80 px-3 focus-within:border-mint-600">
                <span className="font-mono text-[16px] text-mint-500">$</span>
                <input
                  value={t}
                  maxLength={7}
                  onChange={(e) => setT(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="KMOD"
                  className="w-full bg-transparent py-3.5 font-display text-[24px] font-bold tracking-[-0.02em] text-paper outline-none placeholder:text-ink-500"
                />
              </div>
              <Btn type="submit" className="mt-4 w-full py-3.5 text-[14.5px]">
                {go ? "Membuka terminal…" : "Forge ticker ini"}
                {!go && <Icon.Arrow className="h-4 w-4" />}
              </Btn>
              <div className="mt-4 flex items-center justify-between font-mono text-[10.5px] text-faint">
                <span>deposit awal: 0 USDC</span>
                <span className="flex items-center gap-1.5 text-mint-500">
                  <span className="h-1 w-1 rounded-full bg-mint-400 blink" /> HyperCore online
                </span>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default FAQ;
