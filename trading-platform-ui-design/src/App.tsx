import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { Footer, Nav, TickerTape } from "@/components/Chrome";
import Hero from "@/components/Hero";
import LaunchTerminal from "@/components/LaunchTerminal";
import { MarketDepth, StatsBand } from "@/components/MarketDepth";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Economics from "@/components/Economics";
import { CTABand, FAQ, Voices } from "@/components/FAQ";
import { Icon } from "@/components/primitives";

function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1100px_620px_at_12%_-8%,rgba(63,220,165,0.11),transparent_62%),radial-gradient(880px_560px_at_92%_4%,rgba(77,159,232,0.09),transparent_60%),radial-gradient(760px_520px_at_60%_105%,rgba(230,165,44,0.07),transparent_62%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/85 to-ink-950" />
      <div className="grid-bg absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint-500/40 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-mint-400/70 to-transparent blur-[1px] [animation:sweep_11s_linear_infinite] opacity-40" />
      <div className="noise-bg absolute inset-0 opacity-[0.035] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_45%,rgba(2,5,6,0.85)_100%)]" />
    </div>
  );
}

function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 900);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Kembali ke atas"
      className={cn(
        "btn-ghost fixed right-5 bottom-5 z-50 grid h-11 w-11 cursor-pointer place-items-center rounded-full transition-all duration-400 sm:right-8 sm:bottom-8",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <Icon.Arrow className="h-4 w-4 -rotate-90 text-mint-400" />
    </button>
  );
}

export default function App() {
  return (
    <div id="top" className="relative min-h-screen">
      <Background />
      <TickerTape />
      <Nav />
      <main>
        <Hero />
        <StatsBand />
        <LaunchTerminal />
        <MarketDepth />
        <HowItWorks />
        <Features />
        <Economics />
        <Voices />
        <FAQ />
        <CTABand />
      </main>
      <Footer />
      <ToTop />
    </div>
  );
}
