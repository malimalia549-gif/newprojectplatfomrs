import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

/* ── routes ────────────────────────────────────────────────── */
export type NavItem = { path: string; label: string; short: string; index: string };
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "RINGKASAN",
    items: [
      { path: "/", label: "Dashboard", short: "DSH", index: "00" },
      { path: "/launchpad", label: "Launchpad", short: "LCH", index: "01" },
      { path: "/pasar", label: "Market", short: "MKT", index: "02" },
    ],
  },
  {
    group: "PERDAGANGAN",
    items: [
      { path: "/trade", label: "Trade", short: "TRD", index: "03" },
      { path: "/portofolio", label: "Portofolio", short: "PFL", index: "04" },
      { path: "/hip-3", label: "HIP-3 Deployer", short: "HP3", index: "05" },
    ],
  },
  {
    group: "BANGUN",
    items: [{ path: "/pipeline", label: "Pipeline Token", short: "PPL", index: "06" }],
  },
  {
    group: "REFERENSI",
    items: [{ path: "/dokumentasi", label: "Dokumentasi", short: "DOC", index: "07" }],
  },
];
export const ALL_ROUTES = NAV.flatMap((g) => g.items);

export function useRoute() {
  const read = () => {
    const h = window.location.hash.replace(/^#/, "");
    return h.startsWith("/") ? h : "/";
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onHash = () => {
      setRoute(read());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export const isActive = (route: string, path: string) =>
  path === "/" ? route === "/" : route.startsWith(path);

/* ── app state: ticker, wallet, toasts ─────────────────────── */
type Toast = { id: number; msg: string; tone: "amber" | "mint" | "blood" };
type AppCtx = {
  ticker: string;
  setTicker: (t: string) => void;
  balance: number;
  spend: (n: number) => void;
  toast: (msg: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
};

const Ctx = createContext<AppCtx>({
  ticker: "KUDA",
  setTicker: () => {},
  balance: 12480,
  spend: () => {},
  toast: () => {},
  toasts: [],
  dismiss: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [ticker, setTicker] = useState("KUDA");
  const [balance, setBalance] = useState(12_480.42);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (msg: string, tone: Toast["tone"] = "amber") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
      setTimeout(() => dismiss(id), 3600);
    },
    [dismiss],
  );

  const spend = useCallback((n: number) => setBalance((b) => Math.max(0, b + n)), []);

  return (
    <Ctx.Provider value={{ ticker, setTicker, balance, spend, toast, toasts, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
export const useTicker = () => useContext(Ctx);
