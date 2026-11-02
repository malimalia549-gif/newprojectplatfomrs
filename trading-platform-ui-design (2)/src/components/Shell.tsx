import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useDemo } from "@/context/DemoContext";
import { BASE_PERPS, money, percent, priceFormat } from "@/lib/market";
import { Brand, DemoLabel } from "./UI";

const links = [
  { to: "/launchpad", label: "Launchpad" },
  { to: "/perpetuals", label: "Perpetuals" },
  { to: "/mechanism", label: "Cara kerja" },
  { to: "/fees", label: "Biaya" },
];

export function TickerStrip() {
  const items = [...BASE_PERPS, ...BASE_PERPS];
  return (
    <div className="tape relative z-40 border-b border-line-soft bg-base-2/70 py-2" aria-label="Ringkasan harga simulasi">
      <div className="tape-track">
        {items.map((market, index) => (
          <span key={`${market.symbol}-${index}`} className="flex shrink-0 items-center gap-2.5 border-r border-line-soft px-5 font-mono text-[10.5px]">
            <span className="font-semibold tracking-[0.08em] text-text">{market.symbol}-PERP</span>
            <span className="nums text-muted">{priceFormat(market.price)}</span>
            <span className={cn("nums", market.change >= 0 ? "text-up" : "text-down")}>{percent(market.change)}</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-base to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-base to-transparent" />
    </div>
  );
}

export function Header() {
  const [menu, setMenu] = useState(false);
  const { balance } = useDemo();
  const location = useLocation();

  useEffect(() => setMenu(false), [location.pathname]);

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center px-5 sm:px-8 lg:px-10">
        <Brand />
        <nav className="ml-11 hidden h-full items-center gap-8 lg:flex" aria-label="Navigasi utama">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn("nav-link text-[12px] font-bold transition-colors hover:text-text", isActive ? "active text-text" : "text-muted")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <DemoLabel />
          <span className="h-5 w-px bg-line" />
          <div className="text-right">
            <div className="micro text-faint">Saldo simulasi</div>
            <div className="nums mt-0.5 font-mono text-[12px] text-text">{money(balance)} USDC</div>
          </div>
          <Link to="/studio" className="button-primary px-4 py-2.5">
            Buat market <ArrowRight size={14} />
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3 lg:hidden">
          <DemoLabel compact />
          <button
            type="button"
            aria-label={menu ? "Tutup menu" : "Buka menu"}
            aria-expanded={menu}
            onClick={() => setMenu((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-white/[0.03] text-text"
          >
            {menu ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="glass-nav overflow-hidden border-t border-line-soft lg:hidden"
            aria-label="Navigasi seluler"
          >
            <div className="px-5 py-3 sm:px-8">
              {links.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex items-center justify-between border-b border-line-soft py-4 text-[15px] font-semibold", isActive ? "text-accent" : "text-text")}>
                  {item.label} <ArrowRight size={16} className="text-faint" />
                </NavLink>
              ))}
              <NavLink to="/guide" className="flex items-center justify-between border-b border-line-soft py-4 text-[15px] font-semibold text-text">
                Panduan <ArrowRight size={16} className="text-faint" />
              </NavLink>
              <Link to="/studio" className="button-primary mt-5 w-full px-4 py-3.5">Buat market <ArrowRight size={15} /></Link>
              <div className="mt-4 font-mono text-[11px] text-faint">Saldo demo: {money(balance)} USDC</div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  const { resetDemo } = useDemo();
  return (
    <footer className="border-t border-line-soft bg-base/80">
      <div className="mx-auto max-w-[1600px] px-5 pt-16 pb-9 sm:px-8 lg:px-10">
        <div className="grid gap-12 border-b border-line-soft pb-14 lg:grid-cols-[1.45fr_1fr_1fr_1fr]">
          <div>
            <Brand large />
            <p className="mt-5 max-w-[310px] text-[13px] leading-[1.8] text-muted">
              Dari peluncuran aset ke pasar perpetual. Satu siklus, pengalaman yang saling terhubung.
            </p>
          </div>
          <div>
            <div className="micro mb-5 text-faint">Platform</div>
            <div className="flex flex-col gap-3.5 text-[13px] text-muted">
              <Link to="/launchpad" className="transition-colors hover:text-text">Jelajahi launchpad</Link>
              <Link to="/perpetuals" className="transition-colors hover:text-text">Perpetuals</Link>
              <Link to="/studio" className="transition-colors hover:text-text">Buat market</Link>
            </div>
          </div>
          <div>
            <div className="micro mb-5 text-faint">Pelajari</div>
            <div className="flex flex-col gap-3.5 text-[13px] text-muted">
              <Link to="/mechanism" className="transition-colors hover:text-text">Cara kerja</Link>
              <Link to="/fees" className="transition-colors hover:text-text">Biaya & simulasi</Link>
              <Link to="/guide" className="transition-colors hover:text-text">Panduan & FAQ</Link>
            </div>
          </div>
          <div>
            <div className="micro mb-5 text-faint">Referensi</div>
            <div className="flex flex-col gap-3.5 text-[13px] text-muted">
              <a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals" target="_blank" rel="noreferrer" className="transition-colors hover:text-text">Dokumentasi resmi HIP-3 ↗</a>
              <button
                type="button"
                onClick={() => { if (window.confirm("Reset semua aset, saldo, dan posisi demo?")) resetDemo(); }}
                className="w-fit text-left transition-colors hover:text-text"
              >
                Reset data demo
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-7 text-[11px] leading-relaxed text-faint sm:flex-row sm:justify-between">
          <span>© 2026 Tickerforge. Konsep antarmuka produk.</span>
          <span>Seluruh harga, order, posisi, token, dan saldo pada situs ini adalah simulasi. Tidak terhubung ke mainnet.</span>
        </div>
      </div>
    </footer>
  );
}

export function ScrollRestoration() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const titles: Record<string, string> = {
      "/": "Tickerforge | Launchpad to Perpetuals",
      "/launchpad": "Launchpad | Tickerforge",
      "/perpetuals": "Perpetuals | Tickerforge",
      "/studio": "Launch Studio | Tickerforge",
      "/mechanism": "Cara Kerja | Tickerforge",
      "/fees": "Biaya | Tickerforge",
      "/guide": "Panduan | Tickerforge",
    };
    document.title = pathname.startsWith("/launchpad/") ? "Detail Market | Tickerforge" : (titles[pathname] ?? "Tickerforge");
  }, [pathname]);
  return null;
}
