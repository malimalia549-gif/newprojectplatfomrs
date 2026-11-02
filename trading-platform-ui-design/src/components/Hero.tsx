import { useEffect, useRef } from "react";
import FlowDiagram from "./FlowDiagram";
import { BtnLink, Chip, Eyebrow, Icon, Reveal } from "./primitives";

const HERO_STATS = [
  { k: "Market HIP-3 live", v: "37" },
  { k: "Volume 24 jam", v: "$412M" },
  { k: "Finalitas", v: "0.4s" },
];

export function Hero() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", on);
    return () => {
      el.removeEventListener("pointermove", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="alur" ref={ref} className="spot relative overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-16 sm:px-8 lg:pt-16 lg:pb-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12">
          {/* ------------------------------------------------ left column */}
          <div className="relative">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="mint">HIP-3 · Builder Deployed</Chip>
                <Chip tone="neutral">HyperCore Orderbook</Chip>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <h1 className="headline mt-6 text-[clamp(2.7rem,6.6vw,4.9rem)] text-paper">
                Launchpad yang
                <br />
                tidak berhenti
                <br />
                di{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-mint-400">SELESAI</span>
                  <svg
                    viewBox="0 0 220 18"
                    className="absolute -bottom-1 left-0 z-0 h-[14px] w-[104%] text-mint-600/70"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d="M2 12.5C48 5.5 96 4.2 148 7.4c24 1.5 46 3.6 70 6.4"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      className="draw-line"
                      style={{ ["--len" as string]: 260 }}
                    />
                  </svg>
                </span>
                <span className="text-mint-400">.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-7 max-w-[52ch] text-[15.5px] leading-[1.75] text-muted">
                <span className="font-mono text-[13px] text-paper">
                  Create → Trading → Graduate → Uniswap Pool
                </span>{" "}
                adalah jalur spot biasa. Tickerforge membuka cabang kedua:{" "}
                <span className="text-paper">beli tickernya di HyperCore orderbook</span>, lalu
                market kamu live sebagai{" "}
                <span className="text-mint-300">perpetual HIP-3</span> dengan leverage, funding per
                jam, dan builder fee yang mengalir ke alamatmu.
              </p>
            </Reveal>

            <Reveal delay={230}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <BtnLink href="#terminal" className="px-6 py-3.5 text-[14.5px]">
                  Forge market sekarang
                  <Icon.Arrow className="h-4 w-4" />
                </BtnLink>
                <BtnLink href="#market" variant="ghost" className="px-6 py-3.5 text-[14.5px]">
                  Lihat orderbook live
                </BtnLink>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-10 grid max-w-[520px] grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
                {HERO_STATS.map((s) => (
                  <div key={s.k} className="group bg-ink-900/90 px-4 py-3.5 transition-colors hover:bg-ink-850">
                    <div className="font-display text-[22px] leading-none font-extrabold tracking-[-0.03em] text-paper transition-colors group-hover:text-mint-300">
                      {s.v}
                    </div>
                    <div className="mt-1.5 font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">
                      {s.k}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={360}>
              <div className="mt-7 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["#3fdca5", "#e6a52c", "#86c5ff", "#ff8579"].map((c) => (
                    <span
                      key={c}
                      className="h-6 w-6 rounded-full border-2 border-ink-950"
                      style={{ background: `linear-gradient(140deg, ${c}, #0b1214)` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-faint">
                  1.284 builder sudah mengantre ticker
                  <br />
                  <span className="text-mint-500">+62 dalam 24 jam terakhir</span>
                </p>
              </div>
            </Reveal>
          </div>

          {/* ----------------------------------------------- right column */}
          <Reveal delay={140} className="lg:sticky lg:top-24">
            <div className="relative">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Eyebrow>Alur lengkap · klik untuk inspeksi</Eyebrow>
                <span className="hidden font-mono text-[10px] tracking-[0.16em] text-faint uppercase sm:block">
                  mainnet
                </span>
              </div>
              <FlowDiagram />
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[24px] bg-mint-600/[0.07] blur-3xl" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default Hero;
