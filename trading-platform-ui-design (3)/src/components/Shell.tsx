import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lamp, Micro } from "./ui";
import { ALL_ROUTES, NAV, isActive, useApp } from "../store";
import { MARKETS } from "../lib/data";
import { fmt } from "./ui";

/* ── 16px line icons ───────────────────────────────────────── */
const I = {
  dash: "M2 2h5v5H2zM8 2h5v3H8zM8 6h5v7H8zM2 8h5v5H2z",
  rocket: "M8 1c2.4 1.6 3.6 4 3.6 6.6L8 12 4.4 7.6C4.4 5 5.6 2.6 8 1zM4 12l-2 2M12 12l2 2",
  grid: "M2 4h12M2 8h12M2 12h12M6 2v12",
  chart: "M2 13l3.5-4 2.5 2.5L14 4M14 4h-3M14 4v3",
  wallet: "M2 4h10a2 2 0 012 2v6a2 2 0 01-2 2H2zM11 9h3",
  cog: "M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13",
  flow: "M2 3h4v4H2zM10 9h4v4h-4zM6 5h2a2 2 0 012 2v2",
  book: "M3 2h8a2 2 0 012 2v10H5a2 2 0 01-2-2zM3 12h10",
};
function Icon({ name, className = "" }: { name: keyof typeof I; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <path d={I[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const ICON_FOR: Record<string, keyof typeof I> = {
  "/": "dash",
  "/launchpad": "rocket",
  "/pasar": "grid",
  "/trade": "chart",
  "/portofolio": "wallet",
  "/hip-3": "cog",
  "/pipeline": "flow",
  "/dokumentasi": "book",
};

/* ── ticker tape ───────────────────────────────────────────── */
function Tape() {
  const items = useMemo(() => [...MARKETS, ...MARKETS], []);
  return (
    <div className="relative hidden h-7 overflow-hidden border-b border-white/[0.06] bg-white/[0.015] md:block">
      <div className="animate-tape flex h-full w-max items-center gap-7 pl-4">
        {items.map((m, i) => (
          <span key={`${m.pair}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-mono text-[10px] tracking-[0.08em] text-dim">{m.pair}</span>
            <span className="tnum font-mono text-[10px] text-bone/90">
              {m.price >= 1 ? fmt.n(m.price, 2) : m.price.toFixed(7)}
            </span>
            <span className={`tnum font-mono text-[10px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>
              {fmt.pct(m.change)}
            </span>
            <span className="text-edge">·</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}

/* ── command palette ───────────────────────────────────────── */
function Palette({ open, close }: { open: boolean; close: () => void }) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => ref.current?.focus(), 40);
    }
  }, [open]);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pages = ALL_ROUTES.filter((r) => !s || r.label.toLowerCase().includes(s)).map((r) => ({
      kind: "HALAMAN",
      label: r.label,
      sub: r.path,
      to: r.path,
    }));
    const mkts = MARKETS.filter((m) => !s || m.pair.toLowerCase().includes(s) || m.name.toLowerCase().includes(s))
      .slice(0, 6)
      .map((m) => ({ kind: "PASAR", label: m.pair, sub: m.name, to: "/trade" }));
    return [...pages, ...mkts].slice(0, 9);
  }, [q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/70 px-4 pt-[14vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="glass w-full max-w-[560px] overflow-hidden rounded-2xl"
            initial={{ y: -14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-amber/15 font-mono text-[11px] text-amber">
                ⌘
              </span>
              <input
                ref={ref}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari halaman atau pasar…"
                className="w-full bg-transparent text-[13.5px] text-bone outline-none placeholder:text-dim/70"
              />
              <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-dim">ESC</span>
            </div>
            <ul className="max-h-[46vh] overflow-y-auto p-1.5">
              {hits.map((h, i) => (
                <li key={`${h.label}-${i}`}>
                  <a
                    href={`#${h.to}`}
                    onClick={close}
                    className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Micro className="shrink-0 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-amber">{h.kind}</Micro>
                      <span className="truncate text-[13.5px] text-bone">{h.label}</span>
                    </span>
                    <Micro className="shrink-0 text-dim">{h.sub}</Micro>
                  </a>
                </li>
              ))}
              {hits.length === 0 && (
                <li className="px-4 py-10 text-center">
                  <Micro className="text-dim">TIDAK ADA HASIL UNTUK “{q}”</Micro>
                </li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── toasts ────────────────────────────────────────────────── */
function Toasts() {
  const { toasts, dismiss } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[95] flex w-[292px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={() => dismiss(t.id)}
            className={`glass pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-left ${
              t.tone === "mint" ? "border-mint/30" : t.tone === "blood" ? "border-blood/30" : "border-amber/30"
            }`}
          >
            <Lamp on color={t.tone} className="mt-1.5" />
            <span className="text-[12.5px] leading-relaxed text-bone">{t.msg}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── shell ─────────────────────────────────────────────────── */
export default function Shell({ route, children }: { route: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ping, setPing] = useState(38);
  const [block, setBlock] = useState(1_284_339_210);
  const { balance } = useApp();

  useEffect(() => {
    const id = setInterval(() => {
      setPing(31 + Math.round(Math.random() * 15));
      setBlock((b) => b + 4);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setDrawer(false), [route]);

  const SideNav = () => (
    <nav className="flex flex-col gap-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <Micro className="mb-2.5 block px-3 text-dim/60">{g.group}</Micro>
          <ul className="space-y-0.5">
            {g.items.map((r) => {
              const on = isActive(route, r.path);
              return (
                <li key={r.path}>
                  <a
                    href={`#${r.path}`}
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 ${
                      on
                        ? "bg-amber/[0.11] text-amber"
                        : "text-dim hover:bg-white/[0.04] hover:text-bone"
                    }`}
                  >
                    <Icon name={ICON_FOR[r.path]} className="h-[15px] w-[15px] shrink-0" />
                    <span className="flex-1 truncate text-[12.5px] font-medium">{r.label}</span>
                    {on && <Lamp on className="opacity-80" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <div aria-hidden className="grid-veil pointer-events-none fixed inset-0 z-[55]" />

      {/* masthead */}
      <header className="fixed inset-x-0 top-0 z-[70] border-b border-white/[0.06] bg-ink/85 backdrop-blur-xl">
        <Tape />
        <div className="flex h-14 items-center gap-3 px-3 md:gap-5 md:px-5">
          <button
            onClick={() => setDrawer(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-dim transition-colors hover:text-bone lg:hidden"
            aria-label="Buka navigasi"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>

          <a href="#/" className="flex items-center gap-2.5">
            <span className="relative grid h-7 w-7 place-items-center rounded-[9px] bg-amber text-ink">
              <svg viewBox="0 0 28 28" className="h-4 w-4" aria-hidden>
                <path d="M4 22 L11 22 L11 15 L17 15 L17 8 L24 8" fill="none" stroke="#07090b" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.01em]">Graduate</span>
          </a>

          <button
            onClick={() => setOpen(true)}
            className="ml-2 hidden flex-1 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/20 md:flex md:max-w-[320px]"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-dim" stroke="currentColor" strokeWidth="1.5" fill="none">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            <span className="flex-1 text-[12.5px] text-dim">Cari pasar atau halaman…</span>
            <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-dim">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-2.5 md:gap-4">
            <span className="hidden items-center gap-2 xl:flex">
              <Lamp on color="mint" pulse />
              <Micro className="text-dim">
                <span className="tnum text-bone/80">{ping}ms</span> · BLOCK{" "}
                <span className="tnum text-bone/80">{block.toLocaleString("id-ID")}</span>
              </Micro>
            </span>
            <span className="hidden items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5 sm:flex">
              <span className="tnum font-mono text-[11.5px] text-bone">{fmt.n(balance, 2)}</span>
              <Micro className="text-dim">USDC</Micro>
            </span>
            <a
              href="#/trade"
              className="rounded-xl bg-amber px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink transition-all hover:shadow-[0_10px_28px_-12px_rgba(217,255,77,.8)]"
            >
              Trade
            </a>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-[10px] font-bold text-bone">
              KF
            </span>
          </div>
        </div>
      </header>

      {/* sidebar — desktop */}
      <aside className="fixed bottom-0 left-0 top-[5.25rem] z-[60] hidden w-[226px] flex-col justify-between overflow-y-auto border-r border-white/[0.06] bg-white/[0.015] px-3 py-5 lg:flex">
        <SideNav />
        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
          <div className="flex items-center justify-between">
            <Micro className="text-dim">DEMO WALLET</Micro>
            <Lamp on color="mint" />
          </div>
          <div className="mt-2 text-[12px] font-medium text-bone">0x7a4f…91c2</div>
          <div className="mt-1 flex items-center justify-between">
            <Micro className="text-dim">TIER 2 · FEE −12%</Micro>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.05] font-mono text-[9px] text-bone">
              KF
            </span>
          </div>
        </div>
      </aside>

      {/* sidebar — icon rail */}
      <aside className="fixed bottom-0 left-0 top-[5.25rem] z-[60] hidden w-[58px] flex-col items-center gap-4 overflow-y-auto border-r border-white/[0.06] bg-white/[0.015] py-5 md:flex lg:hidden">
        {ALL_ROUTES.map((r) => {
          const on = isActive(route, r.path);
          return (
            <a
              key={r.path}
              href={`#${r.path}`}
              title={r.label}
              className={`grid h-9 w-9 place-items-center rounded-xl transition-all duration-200 ${
                on ? "bg-amber/[0.12] text-amber" : "text-dim hover:bg-white/[0.05] hover:text-bone"
              }`}
            >
              <Icon name={ICON_FOR[r.path]} className="h-[16px] w-[16px]" />
            </a>
          );
        })}
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-ink/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 top-[5.25rem] z-[85] w-[250px] overflow-y-auto border-r border-white/[0.07] bg-ink/95 p-4 backdrop-blur-xl md:hidden"
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <SideNav />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Palette open={open} close={() => setOpen(false)} />
      <Toasts />

      <main className="relative z-[2] md:pl-[58px] lg:pl-[226px]">
        <div className="pt-14 md:pt-[5.25rem]">{children}</div>
      </main>
    </div>
  );
}
