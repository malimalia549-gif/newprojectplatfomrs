import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HeroMarketVisual } from "@/components/Charts";
import { FlowMap } from "@/components/FlowMap";
import { LaunchTable, PerpTable } from "@/components/MarketRows";
import { Reveal, SectionHeading } from "@/components/UI";
import { BASE_PERPS } from "@/lib/market";
import { useDemo } from "@/context/DemoContext";
import { cn } from "@/utils/cn";

export default function Home() {
  const [tab, setTab] = useState<"launch" | "perp">("launch");
  const { assets, quotes } = useDemo();

  return (
    <>
      <section className="relative flex min-h-[680px] items-center overflow-hidden border-b border-line-soft sm:min-h-[calc(100svh-72px)]">
        <HeroMarketVisual />
        <div className="relative mx-auto w-full max-w-[1600px] px-5 py-28 sm:px-8 lg:px-10">
          <div className="hero-enter">
            <div className="glass mb-7 inline-flex items-center gap-2.5 rounded-full px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="ping-soft absolute inset-0 rounded-full bg-accent" />
                <span className="relative h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="micro text-muted">Launchpad → Perpetuals · satu siklus</span>
            </div>
            <h1 className="display text-[clamp(3.4rem,9.2vw,10.6rem)] leading-[.87] font-bold tracking-[-.09em] text-text">
              TICKER<span className="gradient-text">FORGE</span>
            </h1>
          </div>
          <div className="hero-enter mt-8 max-w-[640px] [animation-delay:120ms]">
            <h2 className="display text-[clamp(1.8rem,3.7vw,3.4rem)] font-semibold text-text">
              Luncurkan aset. Bangun pasarnya.
            </h2>
            <p className="mt-5 max-w-[530px] text-[14px] leading-[1.85] text-muted sm:text-[16px]">
              Satu pengalaman dari bonding curve ke likuiditas spot. Untuk builder yang memenuhi syarat HIP-3, perjalanan bisa berlanjut ke perpetual di HyperCore.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/launchpad" className="button-primary px-6 py-[15px]">
                Jelajahi launchpad <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link to="/perpetuals" className="button-secondary px-6 py-[15px]">
                Buka perpetuals <ArrowUpRight size={16} strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line-soft py-20 sm:py-28">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="01 / Satu siklus market"
              title={<>Spot adalah titik awal.<br /><span className="text-accent">Bukan garis akhir.</span></>}
              description="Dari peluncuran aset hingga kemungkinan listing perpetual, setiap langkah memiliki tujuan dan persyaratannya sendiri. Pilih tahap untuk melihat konteksnya."
              href="/mechanism"
              linkText="Pelajari mekanisme"
            />
          </Reveal>
          <Reveal delay={.1} className="mt-12">
            <FlowMap />
          </Reveal>
        </div>
      </section>

      <section className="border-b border-line-soft py-20 sm:py-28">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-10">
          <Reveal>
            <SectionHeading
              eyebrow="02 / Eksplorasi market"
              title={<>Temukan pasar<br />yang bergerak.</>}
              description="Jelajahi aset yang sedang membangun likuiditas, atau lihat pasar perpetual yang tersedia di terminal demo."
            />
          </Reveal>
          <Reveal delay={.1} className="mt-10">
            <div className="flex items-center justify-between border-b border-line">
              <div className="flex gap-8">
                {(["launch", "perp"] as const).map((value) => (
                  <button key={value} onClick={() => setTab(value)} className={cn("relative pb-4 text-[13px] font-bold transition-colors", tab === value ? "text-text" : "text-faint hover:text-muted")}>
                    {value === "launch" ? "Launchpad" : "Perpetuals"}
                    {tab === value && <motion.span layoutId="market-tab" className="absolute right-0 bottom-0 left-0 h-[2px] bg-accent" />}
                  </button>
                ))}
              </div>
              <Link to={tab === "launch" ? "/launchpad" : "/perpetuals"} className="button-plain pb-3">
                Lihat semua <ArrowRight size={15} />
              </Link>
            </div>
            <div className="bg-base-2">
              {tab === "launch" ? <LaunchTable assets={assets.slice(0, 5)} /> : <PerpTable markets={BASE_PERPS.slice(0, 5)} quotes={quotes} />}
            </div>
            <p className="mt-3 font-mono text-[10px] text-faint">Data ilustratif. Harga dan aktivitas bukan feed mainnet.</p>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-line-soft py-20 sm:py-28">
        <div className="mx-auto grid max-w-[1600px] gap-12 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-24 lg:px-10">
          <Reveal>
            <div className="eyebrow mb-5">03 / Dirancang untuk dua sisi pasar</div>
            <h2 className="display text-[clamp(2rem,4.5vw,4.6rem)] font-semibold">Satu identitas.<br /><span className="text-accent">Dua cara diperdagangkan.</span></h2>
          </Reveal>
          <Reveal delay={.12} className="flex flex-col border-t border-line-soft">
            <div className="grid gap-4 border-b border-line-soft py-7 sm:grid-cols-[160px_1fr]">
              <div className="font-mono text-[11px] text-accent">01 / SPOT</div>
              <div><h3 className="text-[18px] font-bold tracking-[-.04em]">Lahir di launchpad.</h3><p className="mt-2 max-w-[530px] text-[13px] leading-[1.8] text-muted">Harga pertama terbentuk di bonding curve. Progress menuju graduasi, aktivitas, dan kepemilikan bisa dipantau di satu tempat.</p></div>
            </div>
            <div className="grid gap-4 border-b border-line-soft py-7 sm:grid-cols-[160px_1fr]">
              <div className="font-mono text-[11px] text-accent">02 / LIKUIDITAS</div>
              <div><h3 className="text-[18px] font-bold tracking-[-.04em]">Berlanjut ke pool spot.</h3><p className="mt-2 max-w-[530px] text-[13px] leading-[1.8] text-muted">Graduasi mengakhiri fase kurva. Rencana produk memisahkan peluncuran spot dari keputusan listing derivatif, agar risikonya tetap jelas.</p></div>
            </div>
            <div className="grid gap-4 py-7 sm:grid-cols-[160px_1fr]">
              <div className="font-mono text-[11px] text-accent">03 / PERPETUAL</div>
              <div><h3 className="text-[18px] font-bold tracking-[-.04em]">Peluang pasar baru di HyperCore.</h3><p className="mt-2 max-w-[530px] text-[13px] leading-[1.8] text-muted">HIP-3 memberi builder yang memenuhi persyaratan jalan untuk mengoperasikan market perpetual dengan oracle dan parameter risiko yang dikelolanya.</p></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="hero-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-7 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <Reveal>
            <div className="eyebrow mb-5">Mulai dari sini</div>
            <h2 className="display max-w-[750px] text-[clamp(2.4rem,5vw,5rem)] font-semibold">Market berikutnya<br /><span className="text-accent">mungkin milikmu.</span></h2>
            <p className="mt-5 max-w-[550px] text-[14px] leading-[1.8] text-muted">Rancang identitas aset, atur parameter awal, lalu lihat bagaimana market-nya hidup dalam lingkungan simulasi.</p>
          </Reveal>
          <Reveal delay={.15} className="pb-2">
            <Link to="/studio" className="button-primary px-7 py-4">Mulai buat market <ArrowRight size={17} /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}