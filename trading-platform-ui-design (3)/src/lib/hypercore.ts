/* ── HyperCore live data + real execution layer ───────────────
   Baca : POST https://api.hyperliquid.xyz/info        (tanpa autentikasi)
   Tulis: POST https://api.hyperliquid.xyz/exchange    (EIP-712 Agent signature)
   Signing L1 action: msgpack(action) ‖ vault(20B) ‖ nonce(8B BE) → keccak256
   EIP-712 domain { name:"Exchange", version:"1", chainId:1337, verifyingContract:0x0 } */

import { useEffect, useState } from "react";
import { encode } from "@msgpack/msgpack";
import { keccak_256 } from "@noble/hashes/sha3.js";

const INFO = "https://api.hyperliquid.xyz/info";
const EXCHANGE_MAIN = "https://api.hyperliquid.xyz/exchange";
const EXCHANGE_TEST = "https://api.hyperliquid-testnet.xyz/exchange";

export type Level = { px: number; sz: number };

async function info<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(INFO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HyperCore /info ${res.status}`);
  return (await res.json()) as T;
}

/* ── universe + asset contexts ─────────────────────────────── */
type Uni = { name: string; szDecimals: number; maxLeverage: number; onlyIsolated?: boolean; isDelisted?: boolean };
type Ctx = {
  dayNtlVlm: string;
  funding: string;
  markPx: string;
  midPx?: string;
  openInterest: string;
  oraclePx?: string;
  prevDayPx: string;
};

export type LiveMarket = {
  index: number;
  coin: string;
  price: number;
  prev: number;
  change: number;
  vol: number;
  oi: number;
  funding: number;
  lev: number;
  szDecimals: number;
};

export async function fetchLiveMarkets(): Promise<LiveMarket[]> {
  const [meta, ctxs] = await info<[ { universe: Uni[] }, Ctx[] ]>({ type: "metaAndAssetCtxs" });
  return meta.universe
    .map((u, i): LiveMarket | null => {
      const c = ctxs?.[i];
      if (!c || u.isDelisted) return null;
      const price = Number(c.markPx || c.oraclePx || 0);
      const prev = Number(c.prevDayPx || price);
      return {
        index: i,
        coin: u.name,
        price,
        prev,
        change: prev ? ((price - prev) / prev) * 100 : 0,
        vol: Number(c.dayNtlVlm || 0),
        oi: Number(c.openInterest || 0) * price,
        funding: Number(c.funding || 0),
        lev: u.maxLeverage || 20,
        szDecimals: u.szDecimals ?? 2,
      };
    })
    .filter((m): m is LiveMarket => m !== null && m.price > 0);
}

export function useLiveMarkets(poll = 5000) {
  const [markets, setMarkets] = useState<LiveMarket[]>([]);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    let stop = false;
    const run = async () => {
      try {
        const m = await fetchLiveMarkets();
        if (stop) return;
        setMarkets(m);
        setLive(true);
        setErr(null);
        setAt(Date.now());
      } catch (e) {
        if (!stop) {
          setLive(false);
          setErr(e instanceof Error ? e.message : String(e));
        }
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [poll]);

  return { markets, live, err, at };
}

/* ── L2 order book ─────────────────────────────────────────── */
export function useL2(coin: string | null, poll = 1600) {
  const [bids, setBids] = useState<Level[]>([]);
  const [asks, setAsks] = useState<Level[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!coin) {
      setBids([]);
      setAsks([]);
      setLive(false);
      return;
    }
    let stop = false;
    const run = async () => {
      try {
        const book = await info<{ levels: [ { px: string; sz: string }[], { px: string; sz: string }[] ] }>({
          type: "l2Book",
          coin,
        });
        if (stop) return;
        const b = (book.levels?.[0] ?? []).map((l) => ({ px: Number(l.px), sz: Number(l.sz) }));
        const a = (book.levels?.[1] ?? []).map((l) => ({ px: Number(l.px), sz: Number(l.sz) }));
        setBids(b.sort((x, y) => y.px - x.px).slice(0, 10));
        setAsks(a.sort((x, y) => x.px - y.px).slice(0, 10));
        setLive(true);
      } catch {
        if (!stop) setLive(false);
      }
    };
    run();
    const id = setInterval(run, poll);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [coin, poll]);

  return { bids, asks, live };
}

/* ── candles ───────────────────────────────────────────────── */
const IV: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

export type OHLC = { t: number; o: number; h: number; l: number; c: number; v: number };

export async function fetchCandles(coin: string, interval: string, n = 74): Promise<OHLC[]> {
  const ms = IV[interval] ?? 900_000;
  const endTime = Date.now();
  const rows = await info<{ t: number; o: string; h: string; l: string; c: string; v: string }[]>({
    type: "candleSnapshot",
    req: { coin, interval, startTime: endTime - n * ms, endTime },
  });
  return rows
    .map((r) => ({
      t: Number(r.t),
      o: Number(r.o),
      h: Number(r.h),
      l: Number(r.l),
      c: Number(r.c),
      v: Number(r.v),
    }))
    .sort((a, b) => a.t - b.t);
}

export function useCandles(coin: string | null, interval: string, n = 74) {
  const [rows, setRows] = useState<OHLC[]>([]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!coin) {
      setRows([]);
      setLive(false);
      return;
    }
    let stop = false;
    const run = async () => {
      try {
        const r = await fetchCandles(coin, interval, n);
        if (stop) return;
        setRows(r);
        setLive(r.length > 0);
      } catch {
        if (!stop) setLive(false);
      }
    };
    run();
    const id = setInterval(run, 20_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [coin, interval, n]);
  return { rows, live };
}

/* ── wallet ────────────────────────────────────────────────── */
type Eip1193 = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  providers?: Eip1193[];
};

function provider(): Eip1193 | null {
  const w = window as unknown as { ethereum?: Eip1193 };
  const eth = w.ethereum;
  if (!eth) return null;
  return eth.providers?.[0] ?? eth;
}

export const hasWallet = () => !!provider();

export async function connectWallet(): Promise<string> {
  const p = provider();
  if (!p) throw new Error("Dompet injeksi tidak ditemukan — pasang MetaMask atau Rabby.");
  const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("Izin akun ditolak.");
  return accounts[0];
}

export async function accountUsdc(user: string): Promise<number> {
  const state = await info<{ marginSummary?: { accountValue?: string }; withdrawable?: string }>({
    type: "clearinghouseState",
    user,
  });
  return Number(state.withdrawable ?? state.marginSummary?.accountValue ?? 0);
}

/* ── L1 action signing ─────────────────────────────────────── */
function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  parts.forEach((p) => {
    out.set(p, o);
    o += p.length;
  });
  return out;
}

function u64be(n: number) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(Math.max(0, Math.floor(n))));
  return b;
}

const hex = (b: Uint8Array) =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");

async function signL1(action: unknown, nonce: number, address: string, isTestnet: boolean) {
  const packed = encode(action as Record<string, unknown>) as Uint8Array;
  const connectionId = keccak_256(
    concatBytes([packed, new Uint8Array(20), u64be(nonce)]),
  );
  const typed = {
    domain: {
      name: "Exchange",
      version: "1",
      chainId: 1337,
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" },
      ],
    },
    primaryType: "Agent",
    message: { source: isTestnet ? "b" : "a", connectionId: `0x${hex(connectionId)}` },
  };
  const p = provider();
  if (!p) throw new Error("Dompet tidak tersedia.");
  const sig = (await p.request({
    method: "eth_signTypedData_v4",
    params: [address, JSON.stringify(typed)],
  })) as string;
  return {
    r: `0x${sig.slice(2, 66)}`,
    s: `0x${sig.slice(66, 130)}`,
    v: parseInt(sig.slice(130, 132), 16),
  };
}

async function post(action: unknown, signature: unknown, nonce: number, isTestnet: boolean) {
  const url = isTestnet ? EXCHANGE_TEST : EXCHANGE_MAIN;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, signature, nonce }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, raw: text.slice(0, 300) };
  }
}

const roundPx = (p: number) =>
  p >= 10_000 ? Math.round(p * 10) / 10 : p >= 100 ? Math.round(p * 100) / 100 : p >= 1 ? Math.round(p * 1000) / 1000 : Math.round(p * 1e7) / 1e7;

export type OrderReq = {
  address: string;
  assetIndex: number;
  szDecimals: number;
  isBuy: boolean;
  price: number;
  size: number; /* jumlah unit aset dasar */
  isMarket: boolean;
  reduceOnly?: boolean;
  isTestnet: boolean;
  leverage?: number;
};

export type ExecResult = { ok: boolean; message: string; raw: unknown };

export async function placeOrder(req: OrderReq): Promise<ExecResult> {
  try {
    if (req.leverage && req.leverage > 0) {
      try {
        const nonceL = Date.now();
        const actionL = {
          type: "updateLeverage",
          asset: req.assetIndex,
          isCross: true,
          leverage: Math.round(req.leverage),
        };
        const sigL = await signL1(actionL, nonceL, req.address, req.isTestnet);
        await post(actionL, sigL, nonceL, req.isTestnet);
      } catch {
        /* leverage set gagal ≠ order gagal — lanjut */
      }
    }

    const px = roundPx(req.price);
    const sz = Number(req.size.toFixed(Math.max(0, Math.min(req.szDecimals, 8))));
    if (!(sz > 0)) return { ok: false, message: "Ukuran order nol.", raw: null };

    const action = {
      type: "order",
      grouping: "na",
      orders: [
        {
          a: req.assetIndex,
          b: req.isBuy,
          p: String(px),
          s: String(sz),
          r: !!req.reduceOnly,
          t: { limit: { tif: req.isMarket ? "Ioc" : "Gtc" } },
        },
      ],
    };
    const nonce = Date.now();
    const signature = await signL1(action, nonce, req.address, req.isTestnet);
    const out = await post(action, signature, nonce, req.isTestnet);

    const statuses = out?.statuses;
    if (Array.isArray(statuses)) {
      const first = statuses[0];
      if (first?.error) return { ok: false, message: first.error, raw: out };
      if (first?.filled) {
        const f = first.filled;
        return {
          ok: true,
          message: `TERISI ${f.totalSz ?? sz} @ ${f.avgPx ?? px} · oid ${f.oid ?? "—"}`,
          raw: out,
        };
      }
      if (first?.resting) return { ok: true, message: `RESTING · oid ${first.resting.oid}`, raw: out };
    }
    if (out?.error) return { ok: false, message: String(out.error), raw: out };
    if (out?.response?.data?.statuses) return { ok: true, message: "Order diterima HyperCore.", raw: out };
    return { ok: false, message: out ? JSON.stringify(out).slice(0, 160) : "Respons kosong.", raw: out };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      raw: null,
    };
  }
}

export async function setLeverage(req: {
  address: string;
  assetIndex: number;
  leverage: number;
  isTestnet: boolean;
}): Promise<ExecResult> {
  try {
    const nonce = Date.now();
    const action = {
      type: "updateLeverage",
      asset: req.assetIndex,
      isCross: true,
      leverage: Math.round(req.leverage),
    };
    const signature = await signL1(action, nonce, req.address, req.isTestnet);
    const out = await post(action, signature, nonce, req.isTestnet);
    if (out?.error) return { ok: false, message: String(out.error), raw: out };
    return { ok: true, message: `Leverage akun diatur ke ${Math.round(req.leverage)}× (cross).`, raw: out };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e), raw: null };
  }
}

/* ── convenience ───────────────────────────────────────────── */
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
