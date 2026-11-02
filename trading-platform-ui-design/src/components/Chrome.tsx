import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { MARKETS, fmtPrice } from "@/lib/sim";
import { BtnLink, Icon, useScrollProgress } from "./primitives";

/* ------------------------------------------------------------- ticker tape */

export function TickerTape() {
  const [rows, setRows] = useState(() =>
    MARKETS.map((m) => ({ ...m, px: m.px, chg: m.chg }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((m) => {
          const drift = (Math.random() - 0.5) * (m.px * 0.0016);
          const px = Math.max(0.0001, m.px + drift);
          const chg = m.chg + (Math.random() - 0.5) * 0.09;
          return { ...m, px, chg };
        })
      );
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const item = (m: (typeof rows)[number], i: number) => {
    const up = m.chg >= 0;
    return (
      <div
        key={`${m.sym}-${i}`}
        className="flex shrink-0 items-center gap-2.5 border-r border-line/70 px-5 py-2 font-mono text-[11.5px]"
      >
        <span
          className={cn(
            "h-1 w-1 rounded-full",
            m.kind === "builder" ? "bg-gold-400" : m.kind === "equity" ? "bg-ice-400" : "bg-mint-400"
          )}
        />
        <span className="font-semibold tracking-[0.1em] text-paper">{m.sym}</span>
        <span className="tabular text-muted">{fmtPrice(m.px)}</span>
        <span className={cn("tabular font-medium", up ? "text-mint-400" : "text-coral-400")}>
          {up ? "▲" : "▼"} {Math.abs(m.chg).toFixed(2)}%
        </span>
      </div>
    );
  };

  return (
    <div className="marquee-wrap relative z-40 overflow-hidden border-b border-line bg-ink-900/90">
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0">
            {rows.map((m, i) => item(m, i + dup * 100))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-950 to-transparent" />
    </div>
  );
}

/* --------------------------------------------------------------------- nav */

const NAV = [
  { href: "#alur", label: "Alur" },
  { href: "#terminal", label: "Terminal" },
  { href: "#market", label: "Market" },
  { href: "#ekonomi", label: "Ekonomi" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const p = useScrollProgress();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="h-[2px] w-full bg-ink-800">
        <div
          className="h-full bg-gradient-to-r from-mint-500 via-mint-300 to-gold-400 transition-[width] duration-150"
          style={{ width: `${p * 100}%` }}
        />
      </div>
      <div
        className={cn(
          "transition-all duration-500",
          solid
            ? "border-b border-line bg-ink-950/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-5 py-3.5 sm:px-8">
          <a href="#top" className="group flex items-center gap-2.5">
            <span className="relative">
              <Icon.Logo className="h-8 w-8 text-mint-400 transition-transform duration-500 group-hover:rotate-[30deg]" />
              <span className="absolute inset-0 -z-10 rounded-full bg-mint-500/20 blur-lg transition-opacity group-hover:opacity-100 opacity-0" />
            </span>
            <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-paper">
              TICKER<span className="text-mint-400">FORGE</span>
            </span>
          </a>

          <nav className="ml-4 hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="link-underline text-[13.5px] font-medium text-muted hover:text-paper"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-line bg-ink-900/70 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase md:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full rounded-full bg-mint-400 opacity-70 [animation:pulse-ring_2s_ease-out_infinite]" />
                <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
              </span>
              HyperCore mainnet
            </div>
            <BtnLink href="#terminal" className="hidden px-4 py-2.5 text-[13px] sm:inline-flex">
              Forge Market
              <Icon.Arrow className="h-3.5 w-3.5" />
            </BtnLink>
            <button
              onClick={() => setOpen((o) => !o)}
              className="btn-ghost grid h-10 w-10 cursor-pointer place-items-center rounded-[8px] lg:hidden"
              aria-label="Menu"
            >
              <div className="space-y-[5px]">
                <span
                  className={cn(
                    "block h-px w-5 bg-paper transition-transform",
                    open && "translate-y-[6px] rotate-45"
                  )}
                />
                <span className={cn("block h-px w-5 bg-paper transition-opacity", open && "opacity-0")} />
                <span
                  className={cn(
                    "block h-px w-5 bg-paper transition-transform",
                    open && "-translate-y-[6px] -rotate-45"
                  )}
                />
              </div>
            </button>
          </div>
        </div>

        <div
          className={cn(
            "grid overflow-hidden border-t border-line/60 transition-[grid-template-rows] duration-400 lg:hidden",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0">
            <div className="flex flex-col px-5 py-3">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line/50 py-3 font-display text-lg font-semibold text-paper last:border-0"
                >
                  {n.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ footer */

const FOOT = [
  {
    title: "Produk",
    links: ["Launchpad Spot", "Graduation Engine", "HyperCore Ticker", "HIP-3 Perp Deploy", "Builder Fee Vault"],
  },
  {
    title: "Developer",
    links: ["Dokumentasi", "API Reference", "Deployer SDK", "Audit Report", "Status"],
  },
  {
    title: "Komunitas",
    links: ["Discord", "X / Twitter", "Governance Forum", "Builder Grant", "Brand Kit"],
  },
];

export function Footer() {
  const [mail, setMail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink-900">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-[50%] bg-mint-600/10 blur-[110px]" />

      <div className="relative mx-auto max-w-[1280px] px-5 pt-16 pb-8 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Icon.Logo className="h-9 w-9 text-mint-400" />
              <span className="font-display text-xl font-extrabold tracking-[-0.03em]">
                TICKER<span className="text-mint-400">FORGE</span>
              </span>
            </div>
            <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-muted">
              Launchpad yang tidak berhenti di spot. Luluskan likuiditas ke Uniswap, beli tickernya di
              HyperCore, dan market perpetual kamu live sebagai HIP-3.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!mail.includes("@")) return;
                setSent(true);
                setMail("");
                setTimeout(() => setSent(false), 3200);
              }}
              className="mt-7 flex max-w-[380px] items-center gap-2 rounded-[10px] border border-line bg-ink-950/70 p-1.5 focus-within:border-mint-600"
            >
              <input
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                placeholder="builder@domain.xyz"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-[12.5px] text-paper outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                className="btn-mint shrink-0 cursor-pointer rounded-[7px] px-4 py-2 text-[12.5px] font-semibold"
              >
                {sent ? "Terkirim ✓" : "Akses Awal"}
              </button>
            </form>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FOOT.map((col) => (
              <div key={col.title}>
                <div className="eyebrow mb-4">{col.title}</div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#top"
                        className="group inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-mint-300"
                      >
                        <span className="h-px w-0 bg-mint-400 transition-all duration-300 group-hover:w-3" />
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[11px] tracking-[0.12em] text-faint uppercase">
            © 2026 Tickerforge Labs — Bukan nasihat keuangan
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {["v3.1.0", "HIP-3 Ready", "Non-custodial"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-line bg-ink-950/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-faint uppercase"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none relative -mb-2 select-none overflow-hidden text-center font-display text-[clamp(3.4rem,15vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.05em] text-transparent [-webkit-text-stroke:1px_rgba(120,200,180,0.13)]"
      >
        TICKERFORGE
      </div>
    </footer>
  );
}
