import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  approveAgent,
  connectEth,
  errMsg,
  forgetAgent,
  getEth,
  humanize,
  loadAgent,
  shortAddr,
  type Agent,
  type Net,
} from "./lib/hl";

/* ── navigasi ──────────────────────────────────────────────── */
export type NavItem = { path: string; label: string; index: string };
export const NAV_PRIMARY: NavItem[] = [
  { path: "/trade", label: "Trade", index: "01" },
  { path: "/pasar", label: "Market", index: "02" },
  { path: "/launchpad", label: "Launchpad", index: "03" },
  { path: "/portofolio", label: "Portofolio", index: "04" },
  { path: "/hip-3", label: "HIP-3", index: "05" },
];
export const NAV_MORE: NavItem[] = [
  { path: "/pipeline", label: "Pipeline token", index: "06" },
  { path: "/dokumentasi", label: "Dokumentasi", index: "07" },
];
export const ALL_ROUTES: NavItem[] = [{ path: "/", label: "Beranda", index: "00" }, ...NAV_PRIMARY, ...NAV_MORE];

export function useRoute() {
  const read = () => {
    const h = window.location.hash.replace(/^#/, "").split("?")[0];
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
  path === "/" ? route === "/" : route === path || route.startsWith(`${path}/`);

/* ── state aplikasi ────────────────────────────────────────── */
type Toast = { id: number; msg: string; tone: "amber" | "mint" | "blood" };
export type Wallet = { address: string; chainId: number };

type AppCtx = {
  ticker: string;
  setTicker: (t: string) => void;
  balance: number;
  spend: (n: number) => void;
  toast: (msg: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
  net: Net;
  setNet: (n: Net) => void;
  wallet: Wallet | null;
  agent: Agent | null;
  connect: () => Promise<Wallet | null>;
  disconnect: () => void;
  enableTrading: () => Promise<boolean>;
  resetAgent: () => void;
  marketKey: string;
  setMarketKey: (k: string) => void;
};

const Ctx = createContext<AppCtx>({
  ticker: "KUDA",
  setTicker: () => {},
  balance: 0,
  spend: () => {},
  toast: () => {},
  toasts: [],
  dismiss: () => {},
  net: "mainnet",
  setNet: () => {},
  wallet: null,
  agent: null,
  connect: async () => null,
  disconnect: () => {},
  enableTrading: async () => false,
  resetAgent: () => {},
  marketKey: "BTC",
  setMarketKey: () => {},
});

const readLS = (k: string, fb: string) => {
  try {
    return localStorage.getItem(k) ?? fb;
  } catch {
    return fb;
  }
};
const writeLS = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* noop */
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [ticker, setTicker] = useState("KUDA");
  const [balance, setBalance] = useState(12_480.42);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [net, setNetState] = useState<Net>(() => (readLS("graduate.net", "mainnet") === "testnet" ? "testnet" : "mainnet"));
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [marketKey, setMarketKeyState] = useState(() => readLS("graduate.market", "BTC"));

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (msg: string, tone: Toast["tone"] = "amber") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );
  const spend = useCallback((n: number) => setBalance((b) => Math.max(0, b + n)), []);

  const setNet = useCallback((n: Net) => {
    setNetState(n);
    writeLS("graduate.net", n);
  }, []);
  const setMarketKey = useCallback((k: string) => {
    setMarketKeyState(k);
    writeLS("graduate.market", k);
  }, []);

  /* agen dimuat ulang setiap dompet/jaringan berubah */
  useEffect(() => {
    setAgent(wallet ? loadAgent(net, wallet.address) : null);
  }, [wallet, net]);

  /* sambung ulang diam-diam bila sebelumnya sudah diizinkan */
  useEffect(() => {
    const e = getEth();
    if (!e || readLS("graduate.connected", "0") !== "1") return;
    Promise.all([e.request({ method: "eth_accounts" }), e.request({ method: "eth_chainId" })])
      .then(([a, c]) => {
        const list = a as string[];
        if (list?.[0]) setWallet({ address: list[0], chainId: parseInt(String(c), 16) || 1 });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const e = getEth();
    if (!e?.on) return;
    const onAcc = (a: unknown) => {
      const list = a as string[];
      setWallet((w) => (list?.[0] ? { address: list[0], chainId: w?.chainId ?? 1 } : null));
    };
    const onChain = (c: unknown) =>
      setWallet((w) => (w ? { ...w, chainId: parseInt(String(c), 16) || w.chainId } : w));
    e.on("accountsChanged", onAcc);
    e.on("chainChanged", onChain);
    return () => {
      e.removeListener?.("accountsChanged", onAcc);
      e.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      const w = await connectEth();
      setWallet(w);
      writeLS("graduate.connected", "1");
      toast(`Dompet terhubung · ${shortAddr(w.address)}`, "mint");
      return w;
    } catch (e) {
      toast(humanize(errMsg(e)), "blood");
      return null;
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setAgent(null);
    writeLS("graduate.connected", "0");
    toast("Dompet diputuskan dari Graduate.", "amber");
  }, [toast]);

  const enableTrading = useCallback(async () => {
    if (!wallet) return false;
    try {
      const a = await approveAgent(net, wallet.address, wallet.chainId);
      setAgent(a);
      toast("Trading aktif. Order kini ditandatangani agen lokal tanpa pop-up.", "mint");
      return true;
    } catch (e) {
      toast(humanize(errMsg(e)), "blood");
      return false;
    }
  }, [wallet, net, toast]);

  const resetAgent = useCallback(() => {
    if (wallet) forgetAgent(net, wallet.address);
    setAgent(null);
    toast("Agen lokal dihapus dari browser ini.", "amber");
  }, [wallet, net, toast]);

  return (
    <Ctx.Provider
      value={{
        ticker,
        setTicker,
        balance,
        spend,
        toast,
        toasts,
        dismiss,
        net,
        setNet,
        wallet,
        agent,
        connect,
        disconnect,
        enableTrading,
        resetAgent,
        marketKey,
        setMarketKey,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
export const useTicker = () => useContext(Ctx);
