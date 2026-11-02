import { HashRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DemoProvider } from "@/context/DemoContext";
import { Header, Footer, ScrollRestoration, TickerStrip } from "@/components/Shell";
import Home from "@/pages/Home";
import Launchpad from "@/pages/Launchpad";
import AssetDetail from "@/pages/AssetDetail";
import Perpetuals from "@/pages/Perpetuals";
import Studio from "@/pages/Studio";
import Mechanism from "@/pages/Mechanism";
import Fees from "@/pages/Fees";
import Guide from "@/pages/Guide";

function NotFound() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8 lg:px-10">
      <div className="eyebrow">404 / Halaman tidak ditemukan</div>
      <h1 className="display mt-6 text-[clamp(2.8rem,7vw,6rem)] font-semibold">Rutenya berakhir di sini.</h1>
      <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted">Halaman yang kamu cari tidak tersedia. Kembali ke beranda atau jelajahi market yang ada.</p>
      <Link to="/" className="button-primary mt-8 px-5 py-3">Kembali ke beranda <ArrowRight size={16} /></Link>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <ScrollRestoration />
      <TickerStrip />
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: .25, ease: "easeOut" }}
          className="flex-1"
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/launchpad" element={<Launchpad />} />
            <Route path="/launchpad/:symbol" element={<AssetDetail />} />
            <Route path="/perpetuals" element={<Perpetuals />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/mechanism" element={<Mechanism />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <DemoProvider>
        <AppLayout />
      </DemoProvider>
    </HashRouter>
  );
}