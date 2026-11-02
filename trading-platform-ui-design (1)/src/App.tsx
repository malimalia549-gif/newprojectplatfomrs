import { AnimatePresence, motion } from "framer-motion";
import Shell from "./components/Shell";
import { AppProvider, useRoute } from "./store";
import Dashboard from "./pages/Home";
import Launchpad from "./pages/Launchpad";
import MarketsPage from "./pages/MarketsPage";
import TradePage from "./pages/Trade";
import PortfolioPage from "./pages/Portfolio";
import PerpPage from "./pages/PerpPage";
import PipelinePage from "./pages/PipelinePage";
import DocsPage from "./pages/DocsPage";
import NotFound from "./pages/NotFound";

function Routed() {
  const route = useRoute();
  const page = (() => {
    switch (route) {
      case "/":
        return <Dashboard />;
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
  })();

  return (
    <Shell route={route}>
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {page}
        </motion.div>
      </AnimatePresence>
      <Colophon />
    </Shell>
  );
}

function Colophon() {
  return (
    <footer className="mt-16 border-t border-edge bg-[#0c0a08]">
      <div className="mx-auto max-w-[1240px] px-5 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 28 28" className="h-6 w-6" aria-hidden>
                <rect x="1" y="1" width="26" height="26" fill="none" stroke="#3a3226" strokeWidth="1.5" />
                <path d="M5 21 L11 21 L11 15 L17 15 L17 9 L23 9" fill="none" stroke="#ff8a1f" strokeWidth="2.2" />
                <circle cx="23" cy="9" r="2.6" fill="#ff8a1f" />
              </svg>
              <span className="font-mono text-[13px] font-bold tracking-[0.26em]">GRADUATE</span>
            </div>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-dim">
              Launchpad token dan pasar perpetual builder-deployed di atas HyperCore. Satu akun
              margin USDC untuk kurva, pool, spot, dan perp.
            </p>
          </div>
          <div>
            <p className="micro engrave text-dim">PLATFORM</p>
            <ul className="mt-3 space-y-2.5 text-[12.5px] text-bone/70">
              {[
                ["Status jaringan", "#/dokumentasi"],
                ["Jadwal biaya", "#/dokumentasi"],
                ["API & endpoint", "#/dokumentasi"],
                ["Glosarium", "#/dokumentasi"],
              ].map(([l, h]) => (
                <li key={l}>
                  <a href={h} className="transition-colors hover:text-amber">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="micro engrave text-dim">PERINGATAN RISIKO</p>
            <p className="mt-3 text-[12px] leading-relaxed text-dim">
              Perpetual berleverage dapat menlikuidasi posisi dalam hitungan menit. Staking
              deployer 500.000 HYPE adalah mekanisme keamanan protokol, bukan dana kompensasi.
              Orakel pasar HIP-3 dioperasikan deployer masing-masing.
            </p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-6">
          <p className="micro engrave text-dim">GRADUATE © 2026 · ANTARMUKA SIMULASI · DATA DISEDERHANAKAN</p>
          <p className="micro engrave text-dim/70">DIBANGUN DI ATAS HYPERCORE L1</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Routed />
    </AppProvider>
  );
}
