import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { BASE_ASSETS, BASE_PERPS, bound, type LaunchAsset } from "@/lib/market";

export type SpotTrade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  time: string;
};

export type Position = {
  id: string;
  symbol: string;
  side: "long" | "short";
  margin: number;
  leverage: number;
  entry: number;
  quantity: number;
  openedAt: string;
};

type Result = { ok: boolean; message: string };

export type CreateAssetInput = {
  name: string;
  symbol: string;
  description: string;
  category: string;
  color: string;
  price: number;
  graduationTarget: number;
};

type DemoContextValue = {
  assets: LaunchAsset[];
  favorites: string[];
  balance: number;
  holdings: Record<string, number>;
  spotTrades: SpotTrade[];
  positions: Position[];
  quotes: Record<string, number>;
  toggleFavorite: (symbol: string) => void;
  createAsset: (input: CreateAssetInput) => Result;
  tradeSpot: (symbol: string, side: "buy" | "sell", amount: number) => Result;
  simulateCommunity: (symbol: string) => Result;
  placeOrder: (symbol: string, side: "long" | "short", margin: number, leverage: number) => Result;
  closePosition: (id: string) => Result;
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function stored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(`tickerforge:v2:${key}`);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try { window.localStorage.setItem(`tickerforge:v2:${key}`, JSON.stringify(value)); } catch { /* Storage is optional for the demo. */ }
}

const initialQuotes = Object.fromEntries(BASE_PERPS.map((m) => [m.symbol, m.price]));

export function DemoProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<LaunchAsset[]>(() => stored("assets", BASE_ASSETS));
  const [favorites, setFavorites] = useState<string[]>(() => stored("favorites", []));
  const [balance, setBalance] = useState<number>(() => stored("balance", 10000));
  const [holdings, setHoldings] = useState<Record<string, number>>(() => stored("holdings", {}));
  const [spotTrades, setSpotTrades] = useState<SpotTrade[]>(() => stored("spotTrades", []));
  const [positions, setPositions] = useState<Position[]>(() => stored("positions", []));
  const [quotes, setQuotes] = useState<Record<string, number>>(initialQuotes);

  useEffect(() => persist("assets", assets), [assets]);
  useEffect(() => persist("favorites", favorites), [favorites]);
  useEffect(() => persist("balance", balance), [balance]);
  useEffect(() => persist("holdings", holdings), [holdings]);
  useEffect(() => persist("spotTrades", spotTrades), [spotTrades]);
  useEffect(() => persist("positions", positions), [positions]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setQuotes((old) => {
        const next = { ...old };
        BASE_PERPS.forEach((market) => {
          next[market.symbol] = Math.max(0.00001, (old[market.symbol] ?? market.price) * (1 + (Math.random() - 0.5) * 0.0013));
        });
        return next;
      });
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const toggleFavorite = (symbol: string) => {
    setFavorites((current) => current.includes(symbol) ? current.filter((s) => s !== symbol) : [...current, symbol]);
  };

  const createAsset = (input: CreateAssetInput): Result => {
    const symbol = input.symbol.toUpperCase().trim();
    if (!/^[A-Z0-9]{2,8}$/.test(symbol)) return { ok: false, message: "Ticker harus 2-8 huruf atau angka." };
    if (assets.some((asset) => asset.symbol === symbol) || BASE_PERPS.some((market) => market.symbol === symbol)) {
      return { ok: false, message: "Ticker ini sudah digunakan. Pilih ticker lain." };
    }
    const asset: LaunchAsset = {
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      symbol,
      change: 0,
      volume: 0,
      marketCap: input.price * 10_000_000,
      progress: 0,
      graduationTarget: input.graduationTarget,
      holders: 1,
      status: "bonding",
      created: "Baru saja",
      seed: symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
      custom: true,
    };
    setAssets((current) => [asset, ...current]);
    return { ok: true, message: "Market demo berhasil dibuat." };
  };

  const tradeSpot = (symbol: string, side: "buy" | "sell", amount: number): Result => {
    const asset = assets.find((item) => item.symbol === symbol);
    if (!asset) return { ok: false, message: "Aset tidak ditemukan." };
    if (asset.status === "graduated") return { ok: false, message: "Kurva sudah lulus. Trading bonding tidak tersedia." };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Masukkan jumlah yang valid." };

    if (side === "buy" && amount > balance) return { ok: false, message: "Saldo demo USDC tidak cukup." };
    if (side === "sell" && amount > (holdings[symbol] ?? 0) + 1e-8) return { ok: false, message: "Jumlah token demo tidak cukup." };

    const quantity = side === "buy" ? amount / asset.price : amount;
    const total = side === "buy" ? amount : amount * asset.price;
    const price = asset.price;
    const priceMove = bound(total / 60000, 0.0001, 0.055) * (side === "buy" ? 1 : -1);

    setBalance((current) => current + (side === "buy" ? -total : total));
    setHoldings((current) => ({ ...current, [symbol]: Math.max(0, (current[symbol] ?? 0) + (side === "buy" ? quantity : -quantity)) }));
    setAssets((current) => current.map((item) => {
      if (item.symbol !== symbol) return item;
      const target = item.graduationTarget ?? 120_000;
      const nextProgress = bound(item.progress + (side === "buy" ? total / target * 100 : -total / target * 65), 0, 100);
      const nextPrice = item.price * (1 + priceMove);
      return {
        ...item,
        price: nextPrice,
        marketCap: nextPrice * 10_000_000,
        volume: item.volume + total,
        holders: item.holders + (side === "buy" ? 1 : 0),
        progress: nextProgress,
        status: nextProgress >= 100 ? "graduated" : "bonding",
      };
    }));
    setSpotTrades((current) => [{
      id: crypto.randomUUID(), symbol, side, quantity, price, total,
      time: new Date().toISOString(),
    }, ...current].slice(0, 40));
    return { ok: true, message: `${side === "buy" ? "Pembelian" : "Penjualan"} demo berhasil dicatat.` };
  };

  const simulateCommunity = (symbol: string): Result => {
    const asset = assets.find((item) => item.symbol === symbol);
    if (!asset || asset.status !== "bonding") return { ok: false, message: "Market ini tidak berada di fase bonding." };
    const graduated = asset.progress + 22 >= 100;
    setAssets((current) => current.map((item) => item.symbol !== symbol ? item : {
      ...item,
      progress: bound(item.progress + 22, 0, 100),
      volume: item.volume + (item.graduationTarget ?? 120_000) * .22,
      holders: item.holders + 24,
      price: item.price * 1.025,
      marketCap: item.marketCap * 1.025,
      status: item.progress + 22 >= 100 ? "graduated" : "bonding",
    }));
    return { ok: true, message: graduated ? "Target graduasi demo tercapai. Tidak ada pool onchain yang dibuat." : "Aktivitas komunitas demo ditambahkan ke progress market." };
  };

  const placeOrder = (symbol: string, side: "long" | "short", margin: number, leverage: number): Result => {
    const market = BASE_PERPS.find((item) => item.symbol === symbol);
    if (!market) return { ok: false, message: "Market tidak ditemukan." };
    if (!Number.isFinite(margin) || margin < 10) return { ok: false, message: "Margin minimum demo adalah 10 USDC." };
    if (margin > balance) return { ok: false, message: "Saldo demo USDC tidak cukup." };
    if (!Number.isFinite(leverage) || leverage < 1 || leverage > market.leverage) return { ok: false, message: "Leverage di luar batas market." };
    const entry = quotes[symbol] ?? market.price;
    setBalance((current) => current - margin);
    setPositions((current) => [{
      id: crypto.randomUUID(), symbol, side, margin, leverage, entry,
      quantity: margin * leverage / entry,
      openedAt: new Date().toISOString(),
    }, ...current]);
    return { ok: true, message: `Posisi ${side.toUpperCase()} demo dibuka pada ${symbol}-PERP.` };
  };

  const closePosition = (id: string): Result => {
    const position = positions.find((item) => item.id === id);
    if (!position) return { ok: false, message: "Posisi tidak ditemukan." };
    const mark = quotes[position.symbol] ?? position.entry;
    const pnl = (mark - position.entry) * position.quantity * (position.side === "long" ? 1 : -1);
    setBalance((current) => current + Math.max(0, position.margin + pnl));
    setPositions((current) => current.filter((item) => item.id !== id));
    return { ok: true, message: "Posisi demo ditutup. PnL telah masuk ke saldo demo." };
  };

  const resetDemo = () => {
    setAssets(BASE_ASSETS);
    setFavorites([]);
    setBalance(10000);
    setHoldings({});
    setSpotTrades([]);
    setPositions([]);
    setQuotes(initialQuotes);
    try { window.localStorage.removeItem("tickerforge:v2:studioDraft"); } catch { /* Ignore storage errors. */ }
  };

  return (
    <DemoContext.Provider value={{ assets, favorites, balance, holdings, spotTrades, positions, quotes, toggleFavorite, createAsset, tradeSpot, simulateCommunity, placeOrder, closePosition, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}