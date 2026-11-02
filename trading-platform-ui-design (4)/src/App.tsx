import { AnimatePresence, motion } from "framer-motion";
import Shell from "./components/Shell";
import { AppProvider, NAV_MORE, NAV_PRIMARY, useRoute } from "./store";
import Home from "./pages/Home";
import Launchpad from "./pages/Launchpad";
import TokenPage from "./pages/Token";
import MarketsPage from "./pages/MarketsPage";
import TradePage from "./pages/Trade";
import PortfolioPage from "./pages/Portfolio";
import PerpPage from "./pages/PerpPage";
import PipelinePage from "./pages/PipelinePage";
import DocsPage from "./pages/DocsPage";
import NotFound from "./pages/NotFound";

function pageFor(route: string) {
  if (route.startsWith("/token/")) return <TokenPage ticker={decodeURIComponent(route.slice(7))} />;
  switch (route) {
    case "/":
      return <Home />;
    case "/launchpad":
      return <Launchpad />;
    case "/pasar":
      return <MarketsPage />;
    case "/trade":
      return <TradePage />;
    case "/portofolio":
      return <PortfolioPage />;
    case "/hip-3":
      return <PerpPage />;
    case "/pipeline":
      return <PipelinePage />;
    case "/dokumentasi":
      return <DocsPage />;
    default:
      return <NotFound />;
  }
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="wrap py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_0.6fr_0.6fr_1fr]">
          <div>
            <a href="#/" className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-amber">
                <svg viewBox="0 0 28 28" className="h-4 w-4" aria-hidden>
                  <path d="M4 22 L11 22 L11 15 L17 15 L17 8 L24 8" fill="none" stroke="#07090b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Graduate</span>
            </a>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-dim">
              Launchpad token dan terminal perpetual non-kustodial di atas HyperCore.
            </p>
          </div>
          <div>
            <div className="text-[12px] font-medium text-bone">Produk</div>
            <ul className="mt-3 space-y-2.5 text-[13px] text-dim">
              {NAV_PRIMARY.map((n) => (
                <li key={n.path}>
                  <a href={`#${n.path}`} className="transition-colors hover:text-bone">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[12px] font-medium text-bone">Sumber daya</div>
            <ul className="mt-3 space-y-2.5 text-[13px] text-dim">
              {NAV_MORE.map((n) => (
                <li key={n.path}>
                  <a href={`#${n.path}`} className="transition-colors hover:text-bone">
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="https://hyperliquid.gitbook.io/hyperliquid-docs" target="_blank" rel="noreferrer" className="transition-colors hover:text-bone">
                  Docs HyperCore ↗
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-[12px] font-medium text-bone">Peringatan risiko</div>
            <p className="mt-3 text-[12px] leading-relaxed text-dim">
              Perpetual berleverage dapat dilikuidasi dalam hitungan menit. Pasar HIP-3 memakai orakel dan parameter risiko
              dari deployer masing-masing. Data launchpad adalah simulasi.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-[12px] text-dim">
          <span>© 2026 Graduate. Dibangun di atas HyperCore.</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            Semua sistem normal
          </span>
        </div>
      </div>
    </footer>
  );
}

function Routed() {
  const route = useRoute();
  const isTrade = route === "/trade";
  return (
    <Shell route={route}>
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {pageFor(route)}
        </motion.div>
      </AnimatePresence>
      {!isTrade && <Footer />}
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routed />
    </AppProvider>
  );
}
