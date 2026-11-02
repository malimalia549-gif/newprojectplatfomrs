import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, CircleCheck, ExternalLink } from "lucide-react";
import { FlowMap } from "@/components/FlowMap";
import { PageHeading, Reveal, SectionHeading } from "@/components/UI";

const requirements = [
  { index: "01", title: "Kelayakan deployer", body: "Dokumentasi HIP-3 menyebut persyaratan staking 500.000 HYPE untuk mainnet. Angka ini dapat berubah mengikuti pembaruan protokol." },
  { index: "02", title: "Market & oracle", body: "Deployer mendefinisikan spesifikasi market dan bertanggung jawab atas sumber harga eksternal, pembaruan oracle, serta pengoperasiannya." },
  { index: "03", title: "Slot aset", body: "Tiga aset pertama pada suatu perp DEX tidak memerlukan lelang. Aset tambahan mengikuti Dutch auction atau mekanisme reserve yang tersedia." },
  { index: "04", title: "Risiko & pengelolaan", body: "Setiap perp DEX memiliki parameter dan margin independen. Listing derivatif tidak otomatis terjadi hanya karena aset spot telah lulus." },
];

export default function Mechanism() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-16 pb-24 sm:px-8 lg:px-10 lg:pt-20">
      <PageHeading
        eyebrow="Platform / Cara kerja"
        title={<>Dari ide pertama<br />ke <span className="text-accent">pasar berikutnya.</span></>}
        description="Tickerforge memvisualisasikan perjalanan aset melalui peluncuran spot dan kemungkinan lanjutannya sebagai perpetual. Kedua fase ini saling berkaitan dalam pengalaman produk, tetapi persyaratan dan operasionalnya tetap berbeda."
        action={<Link to="/studio" className="button-primary px-5 py-3.5">Mulai di launch studio <ArrowRight size={16} /></Link>}
      />

      <section className="pt-20 pb-24">
        <Reveal><SectionHeading eyebrow="01 / Market lifecycle" title={<>Satu cerita.<br /><span className="text-accent">Dua babak.</span></>} description="Pilih tahap untuk memahami perannya. Jalur atas menyelesaikan fase spot; jalur bawah adalah kesempatan terpisah bagi builder HIP-3 yang memenuhi syarat." /></Reveal>
        <Reveal delay={.12} className="mt-14"><FlowMap detailed /></Reveal>
      </section>

      <section className="border-t border-line-soft py-20 sm:py-24">
        <Reveal><SectionHeading eyebrow="02 / Pemisahan tanggung jawab" title={<>Spot dan perp.<br />Terhubung, bukan tercampur.</>} description="Memisahkan dua jalur ini penting agar pengguna tahu apa yang dilakukan platform, dan apa yang menjadi tanggung jawab deployer." /></Reveal>
        <div className="mt-12 grid gap-10 border-y border-line-soft py-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="flex items-center gap-3 font-mono text-[11px] text-accent"><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/60">01</span> LAUNCHPAD / SPOT</div>
            <h3 className="display mt-5 text-[clamp(1.6rem,2.5vw,2.5rem)] font-semibold">Bangun fondasi likuiditas.</h3>
            <p className="mt-4 max-w-[550px] text-[13px] leading-[1.85] text-muted">Aset diperkenalkan, diperdagangkan dalam fase bonding, lalu bisa memasuki fase pool spot ketika target tercapai. Ini adalah satu siklus produk yang dapat dipantau oleh trader dan builder.</p>
            <div className="mt-7 border-t border-line-soft pt-5 font-mono text-[11px] text-faint">CREATE <ArrowRight size={12} className="mx-2 inline" /> TRADE <ArrowRight size={12} className="mx-2 inline" /> GRADUATE <ArrowRight size={12} className="mx-2 inline" /> SPOT</div>
          </Reveal>
          <Reveal delay={.1} className="lg:border-l lg:border-line-soft lg:pl-16">
            <div className="flex items-center gap-3 font-mono text-[11px] text-accent"><span className="grid h-7 w-7 place-items-center rounded-full border border-accent/60">02</span> HIP-3 / PERPETUAL</div>
            <h3 className="display mt-5 text-[clamp(1.6rem,2.5vw,2.5rem)] font-semibold">Operasikan pasar derivatif.</h3>
            <p className="mt-4 max-w-[550px] text-[13px] leading-[1.85] text-muted">Builder HIP-3 yang memenuhi syarat dapat mendefinisikan dan mengoperasikan market perpetual di infrastruktur HyperCore. Oracle, spesifikasi kontrak, dan manajemen risiko adalah tanggung jawab deployer.</p>
            <div className="mt-7 border-t border-line-soft pt-5 font-mono text-[11px] text-faint">QUALIFY <ArrowRight size={12} className="mx-2 inline" /> CONFIGURE <ArrowRight size={12} className="mx-2 inline" /> OPERATE</div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line-soft py-20 sm:py-24">
        <div className="grid gap-14 lg:grid-cols-[.75fr_1.25fr] lg:gap-24">
          <Reveal>
            <div className="eyebrow mb-5">03 / Persyaratan HIP-3</div>
            <h2 className="display text-[clamp(2rem,3.5vw,3.6rem)] font-semibold">Membangun market adalah sebuah tanggung jawab.</h2>
            <p className="mt-5 max-w-[460px] text-[13px] leading-[1.85] text-muted">Protokol menyediakan infrastruktur orderbook dan margin, bukan keputusan listing. Di luar demo ini, builder harus memenuhi aturan resmi dan menilai kelayakan asetnya sendiri.</p>
            <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals" target="_blank" rel="noreferrer" className="button-plain mt-7">Baca spesifikasi HIP-3 <ExternalLink size={15} /></a>
          </Reveal>
          <div className="border-t border-line-soft">
            {requirements.map((item, i) => (
              <Reveal key={item.index} delay={i * .06} className="grid gap-3 border-b border-line-soft py-6 sm:grid-cols-[55px_1fr]">
                <div className="font-mono text-[11px] text-accent">{item.index}</div>
                <div><h3 className="text-[16px] font-bold tracking-[-.03em] text-text">{item.title}</h3><p className="mt-2 max-w-[610px] text-[13px] leading-[1.8] text-muted">{item.body}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end">
          <Reveal><div className="eyebrow mb-5">Lihat sendiri</div><h2 className="display text-[clamp(2rem,3.8vw,3.7rem)] font-semibold">Mekanismenya lebih mudah dipahami ketika dicoba.</h2></Reveal>
          <Reveal delay={.1} className="flex flex-wrap items-center gap-3 lg:justify-end"><Link to="/launchpad" className="button-secondary px-5 py-3">Jelajahi market <ArrowUpRight size={16} /></Link><Link to="/perpetuals" className="button-primary px-5 py-3">Buka terminal <ArrowRight size={16} /></Link></Reveal>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line-soft pt-5 font-mono text-[10px] text-faint"><CircleCheck size={14} className="text-accent" /><span>Prototype interaktif, bukan implementasi protokol yang berjalan di mainnet.</span><BookOpen size={14} className="ml-auto hidden text-faint sm:block" /></div>
      </section>
    </div>
  );
}