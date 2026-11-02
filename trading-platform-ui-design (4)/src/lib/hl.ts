/* ── HyperCore client ──────────────────────────────────────────
   Data     : REST POST {api}/info · WebSocket {wss}/ws (l2Book, trades, candle)
   Eksekusi : non-kustodial. Dompet utama menandatangani approveAgent SEKALI
              (EIP-712 HyperliquidSignTransaction, chainId = jaringan dompet).
              Order/cancel/leverage lalu ditandatangani kunci agen lokal
              (EIP-712 Agent, chainId 1337) — tanpa pop-up, tanpa hak tarik dana.
   Signing diverifikasi terhadap vektor resmi SDK → scripts/verify-signing.ts */

import { useEffect, useRef, useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  approveAgentPayload,
  cancelAction,
  leverageAction,
  orderAction,
  orderWire,
  roundPrice,
  roundSize,
  signL1WithKey,
  splitSig,
  type Sig,
} from "./hlsign";

export type Net = "mainnet" | "testnet";

export const API: Record<Net, string> = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz",
};
const WSS: Record<Net, string> = {
  mainnet: "wss://api.hyperliquid.xyz/ws",
  testnet: "wss://api.hyperliquid-testnet.xyz/ws",
};
export const APP_URL: Record<Net, string> = {
  mainnet: "https://app.hyperliquid.xyz",
  testnet: "https://app.hyperliquid-testnet.xyz",
};

export async function info<T>(net: Net, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${API[net]}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HyperCore /info ${r.status}`);
  return (await r.json()) as T;
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/* ── shared, de-duplicated poller ─────────────────────────── */
type Entry = {
  data: unknown;
  live: boolean;
  at: number;
  err: string | null;
  subs: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  refs: number;
  busy: boolean;
  fn: () => Promise<unknown>;
};
const registry = new Map<string, Entry>();

function runEntry(e: Entry) {
  if (e.busy) return;
  e.busy = true;
  e.fn()
    .then((d) => {
      e.data = d;
      e.live = true;
      e.err = null;
      e.at = Date.now();
    })
    .catch((err: unknown) => {
      e.live = false;
      e.err = errMsg(err);
    })
    .finally(() => {
      e.busy = false;
      e.subs.forEach((f) => f());
    });
}

export function usePolled<T>(key: string | null, fn: () => Promise<T>, interval: number) {
  const [, force] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!key) return;
    let entry = registry.get(key);
    if (!entry) {
      entry = {
        data: undefined,
        live: false,
        at: 0,
        err: null,
        subs: new Set(),
        timer: null,
        refs: 0,
        busy: false,
        fn: () => fnRef.current(),
      };
      registry.set(key, entry);
    }
    const e = entry;
    const cb = () => force((x) => x + 1);
    e.subs.add(cb);
    e.refs += 1;
    if (!e.timer) {
      runEntry(e);
      e.timer = setInterval(() => runEntry(e), interval);
    }
    cb();
    return () => {
      e.subs.delete(cb);
      e.refs -= 1;
      if (e.refs <= 0 && e.timer) {
        clearInterval(e.timer);
        e.timer = null;
      }
    };
  }, [key, interval]);

  const e = key ? registry.get(key) : undefined;
  return {
    data: e?.data as T | undefined,
    live: !!e?.live,
    at: e?.at ?? 0,
    err: e?.err ?? null,
    refresh: () => {
      if (e) runEntry(e);
    },
  };
}

/* ── WebSocket hub (satu koneksi per jaringan) ────────────── */
type Sub = { type: string; coin?: string; interval?: string };
type Handler = (data: unknown) => void;
const subKey = (s: Sub) => `${s.type}|${s.coin ?? ""}|${s.interval ?? ""}`;

function routeKey(channel: string, data: unknown): string {
  if (channel === "l2Book") return `l2Book|${(data as { coin?: string })?.coin ?? ""}|`;
  if (channel === "trades") return `trades|${(data as { coin?: string }[])?.[0]?.coin ?? ""}|`;
  if (channel === "candle") {
    const c = data as { s?: string; i?: string };
    return `candle|${c?.s ?? ""}|${c?.i ?? ""}`;
  }
  return channel;
}

class Hub {
  url: string;
  ws: WebSocket | null = null;
  open = false;
  handlers = new Map<string, Set<Handler>>();
  subs = new Map<string, Sub>();
  watchers = new Set<() => void>();
  retry = 0;
  ping: ReturnType<typeof setInterval> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  watch(f: () => void) {
    this.watchers.add(f);
    return () => {
      this.watchers.delete(f);
    };
  }

  emit() {
    this.watchers.forEach((f) => f());
  }

  send(o: unknown) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o));
  }

  ensure() {
    if (this.ws && this.ws.readyState <= 1) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.open = true;
      this.retry = 0;
      this.subs.forEach((s) => this.send({ method: "subscribe", subscription: s }));
      this.ping = setInterval(() => this.send({ method: "ping" }), 25_000);
      this.emit();
    };
    ws.onmessage = (ev) => {
      let m: { channel?: string; data?: unknown } | null = null;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        m = null;
      }
      if (!m?.channel || m.channel === "subscriptionResponse" || m.channel === "pong") return;
      const payload = m.data;
      this.handlers.get(routeKey(m.channel, payload))?.forEach((h) => h(payload));
    };
    ws.onclose = () => {
      this.open = false;
      if (this.ping) clearInterval(this.ping);
      this.ping = null;
      this.ws = null;
      this.emit();
      if (this.handlers.size) setTimeout(() => this.ensure(), Math.min(12_000, 700 * 2 ** this.retry++));
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    };
  }

  sub(s: Sub, h: Handler) {
    const k = subKey(s);
    let set = this.handlers.get(k);
    if (!set) {
      set = new Set();
      this.handlers.set(k, set);
      this.subs.set(k, s);
      this.send({ method: "subscribe", subscription: s });
    }
    set.add(h);
    this.ensure();
    return () => {
      const cur = this.handlers.get(k);
      if (!cur) return;
      cur.delete(h);
      if (cur.size === 0) {
        this.handlers.delete(k);
        this.subs.delete(k);
        this.send({ method: "unsubscribe", subscription: s });
      }
    };
  }
}

const hubs: Partial<Record<Net, Hub>> = {};
export function hub(net: Net): Hub {
  let h = hubs[net];
  if (!h) {
    h = new Hub(WSS[net]);
    hubs[net] = h;
  }
  return h;
}

export function useHubOpen(net: Net) {
  const [open, setOpen] = useState(() => hub(net).open);
  useEffect(() => {
    const h = hub(net);
    setOpen(h.open);
    return h.watch(() => setOpen(h.open));
  }, [net]);
  return open;
}

/* ── markets: perp inti + semua DEX HIP-3 ─────────────────── */
type RawU = {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
  marginMode?: string;
};
type RawC = {
  markPx?: string;
  oraclePx?: string;
  midPx?: string | null;
  prevDayPx?: string;
  dayNtlVlm?: string;
  openInterest?: string;
  funding?: string;
};

export type Mkt = {
  key: string; /* "BTC" | "xyz:TSLA" */
  base: string;
  dex: string;
  dexName: string;
  asset: number; /* id aset untuk order: inti = index, HIP-3 = 100000 + dex×10000 + index */
  szDecimals: number;
  maxLev: number;
  isolatedOnly: boolean;
  mark: number;
  oracle: number;
  mid: number;
  prev: number;
  change: number;
  vol: number;
  oi: number;
  funding: number;
};
export type Dex = { name: string; fullName: string; index: number };

async function loadDex(net: Net, dex: Dex | null): Promise<Mkt[]> {
  const body: Record<string, unknown> = { type: "metaAndAssetCtxs" };
  if (dex) body.dex = dex.name;
  const [meta, ctxs] = await info<[{ universe: RawU[] }, RawC[]]>(net, body);
  const out: Mkt[] = [];
  meta.universe.forEach((u, i) => {
    const c = ctxs[i];
    if (!c || u.isDelisted) return;
    const mark = Number(c.markPx ?? 0);
    if (!(mark > 0)) return;
    const prev = Number(c.prevDayPx ?? mark) || mark;
    out.push({
      key: u.name,
      base: u.name.includes(":") ? u.name.slice(u.name.indexOf(":") + 1) : u.name,
      dex: dex?.name ?? "",
      dexName: dex?.fullName ?? "HyperCore",
      asset: dex ? 100000 + dex.index * 10000 + i : i,
      szDecimals: u.szDecimals ?? 2,
      maxLev: u.maxLeverage || 1,
      isolatedOnly: !!(u.onlyIsolated || u.marginMode === "strictIsolated" || u.marginMode === "noCross"),
      mark,
      oracle: Number(c.oraclePx ?? mark) || mark,
      mid: Number(c.midPx ?? mark) || mark,
      prev,
      change: ((mark - prev) / prev) * 100,
      vol: Number(c.dayNtlVlm ?? 0),
      oi: Number(c.openInterest ?? 0) * mark,
      funding: Number(c.funding ?? 0),
    });
  });
  return out;
}

async function loadDexes(net: Net): Promise<Dex[]> {
  const raw = await info<({ name: string; fullName?: string } | null)[]>(net, { type: "perpDexs" });
  const out: Dex[] = [];
  raw.forEach((d, i) => {
    if (d?.name) out.push({ name: d.name, fullName: d.fullName || d.name, index: i });
  });
  return out;
}

const NO_MKTS: Mkt[] = [];
const NO_DEX: Dex[] = [];

export function useMarkets(net: Net) {
  const main = usePolled<Mkt[]>(`mkts|${net}`, () => loadDex(net, null), 8000);
  const dexQ = usePolled<Dex[]>(`dexes|${net}`, () => loadDexes(net), 300_000);
  const dexes = dexQ.data ? dexQ.data.slice(0, 12) : NO_DEX;
  const names = dexes.map((d) => d.name).join(",");
  const hip3 = usePolled<Mkt[]>(
    names ? `hip3|${net}|${names}` : null,
    async () => {
      const res = await Promise.allSettled(dexes.map((d) => loadDex(net, d)));
      return res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    },
    45_000,
  );
  return {
    main: main.data ?? NO_MKTS,
    hip3: hip3.data ?? NO_MKTS,
    dexes,
    live: main.live,
    at: main.at,
    err: main.err,
  };
}

/* ── realtime: buku, transaksi, candle ────────────────────── */
export type Level = { px: number; sz: number; n: number };
type RawLevel = { px: string; sz: string; n: number };
const toLevel = (l: RawLevel): Level => ({ px: Number(l.px), sz: Number(l.sz), n: l.n });

export function useBook(net: Net, coin: string | null) {
  const [book, setBook] = useState<{ bids: Level[]; asks: Level[]; at: number }>({ bids: [], asks: [], at: 0 });
  useEffect(() => {
    setBook({ bids: [], asks: [], at: 0 });
    if (!coin) return;
    let stop = false;
    const apply = (levels?: RawLevel[][]) => {
      if (stop || !levels) return;
      setBook({
        bids: (levels[0] ?? []).slice(0, 30).map(toLevel),
        asks: (levels[1] ?? []).slice(0, 30).map(toLevel),
        at: Date.now(),
      });
    };
    const snap = () =>
      info<{ levels: RawLevel[][] }>(net, { type: "l2Book", coin })
        .then((b) => apply(b.levels))
        .catch(() => undefined);
    snap();
    const h = hub(net);
    const off = h.sub({ type: "l2Book", coin }, (d) => apply((d as { levels: RawLevel[][] }).levels));
    const poll = setInterval(() => {
      if (!h.open) snap();
    }, 2500);
    return () => {
      stop = true;
      off();
      clearInterval(poll);
    };
  }, [net, coin]);
  return book;
}

export type Trade = { px: number; sz: number; side: "B" | "A"; time: number; tid: number };
type RawTrade = { px: string; sz: string; side: "B" | "A"; time: number; tid: number; coin: string };

export function useTrades(net: Net, coin: string | null) {
  const [rows, setRows] = useState<Trade[]>([]);
  useEffect(() => {
    setRows([]);
    if (!coin) return;
    let stop = false;
    const map = (t: RawTrade): Trade => ({ px: Number(t.px), sz: Number(t.sz), side: t.side, time: t.time, tid: t.tid });
    const snap = () =>
      info<RawTrade[]>(net, { type: "recentTrades", coin })
        .then((r) => {
          if (!stop) setRows(r.map(map).sort((a, b) => b.time - a.time).slice(0, 40));
        })
        .catch(() => undefined);
    snap();
    const h = hub(net);
    const off = h.sub({ type: "trades", coin }, (d) => {
      if (stop) return;
      const fresh = (d as RawTrade[]).map(map);
      setRows((prev) => {
        const seen = new Set(prev.map((p) => p.tid));
        return [...fresh.filter((f) => !seen.has(f.tid)).sort((a, b) => b.time - a.time), ...prev].slice(0, 40);
      });
    });
    const poll = setInterval(() => {
      if (!h.open) snap();
    }, 4000);
    return () => {
      stop = true;
      off();
      clearInterval(poll);
    };
  }, [net, coin]);
  return rows;
}

export type OHLC = { t: number; o: number; h: number; l: number; c: number; v: number };
const IV_MS: Record<string, number> = { "1m": 6e4, "5m": 3e5, "15m": 9e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 };
type RawCandle = { t: number; o: string; h: string; l: string; c: string; v: string; s?: string; i?: string };
const toOHLC = (r: RawCandle): OHLC => ({
  t: Number(r.t),
  o: Number(r.o),
  h: Number(r.h),
  l: Number(r.l),
  c: Number(r.c),
  v: Number(r.v),
});

export function useCandles(net: Net, coin: string | null, interval: string, bars = 140) {
  const [rows, setRows] = useState<OHLC[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setRows([]);
    setLoading(true);
    if (!coin) return;
    let stop = false;
    const ms = IV_MS[interval] ?? 9e5;
    const snap = () => {
      const end = Date.now();
      info<RawCandle[]>(net, { type: "candleSnapshot", req: { coin, interval, startTime: end - bars * ms, endTime: end } })
        .then((r) => {
          if (stop) return;
          setRows(r.map(toOHLC).sort((a, b) => a.t - b.t));
          setLoading(false);
        })
        .catch(() => {
          if (!stop) setLoading(false);
        });
    };
    snap();
    const h = hub(net);
    const off = h.sub({ type: "candle", coin, interval }, (d) => {
      if (stop) return;
      const c = toOHLC(d as RawCandle);
      setRows((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (c.t === last.t) return [...prev.slice(0, -1), c];
        if (c.t > last.t) return [...prev.slice(-(bars - 1)), c];
        return prev;
      });
    });
    const poll = setInterval(() => {
      if (!h.open) snap();
    }, 15_000);
    return () => {
      stop = true;
      off();
      clearInterval(poll);
    };
  }, [net, coin, interval, bars]);
  return { rows, loading };
}

/* ── format harga mengikuti aturan tick HyperCore ─────────── */
export function pxDecimals(p: number, szDecimals: number) {
  if (!(p > 0)) return 2;
  const intDigits = Math.floor(Math.log10(p)) + 1;
  return Math.max(0, Math.min(6 - szDecimals, 5 - intDigits));
}
export function fmtPx(p: number, szDecimals: number) {
  const d = pxDecimals(p, szDecimals);
  return p.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export const fmtSz = (s: number, szDecimals: number) =>
  s.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: szDecimals });

/* ── dompet & agen ────────────────────────────────────────── */
type Eth = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, fn: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, fn: (...a: unknown[]) => void) => void;
};
export const getEth = (): Eth | null => (window as unknown as { ethereum?: Eth }).ethereum ?? null;
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export async function connectEth(): Promise<{ address: string; chainId: number }> {
  const e = getEth();
  if (!e) throw new Error("Dompet tidak terdeteksi. Pasang MetaMask, Rabby, atau OKX Wallet.");
  const accs = (await e.request({ method: "eth_requestAccounts" })) as string[];
  const cid = (await e.request({ method: "eth_chainId" })) as string;
  if (!accs?.[0]) throw new Error("Akses akun ditolak.");
  return { address: accs[0], chainId: parseInt(cid, 16) || 1 };
}

export type Agent = { key: `0x${string}`; address: string; at: number };
const slot = (net: Net, user: string) => `graduate.agent.v1.${net}.${user.toLowerCase()}`;

export function loadAgent(net: Net, user: string): Agent | null {
  try {
    const raw = localStorage.getItem(slot(net, user));
    return raw ? (JSON.parse(raw) as Agent) : null;
  } catch {
    return null;
  }
}
export function forgetAgent(net: Net, user: string) {
  try {
    localStorage.removeItem(slot(net, user));
  } catch {
    /* noop */
  }
}

let lastNonce = 0;
const nextNonce = () => {
  lastNonce = Math.max(Date.now(), lastNonce + 1);
  return lastNonce;
};

type ExRes = { status?: string; response?: unknown };
async function postExchange(net: Net, action: unknown, signature: Sig, nonce: number): Promise<ExRes> {
  const r = await fetch(`${API[net]}/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, nonce, signature, vaultAddress: null, expiresAfter: null }),
  });
  const text = await r.text();
  try {
    return JSON.parse(text) as ExRes;
  } catch {
    throw new Error(text.slice(0, 200) || `HTTP ${r.status}`);
  }
}

export function humanize(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("user rejected") || m.includes("user denied") || m.includes("rejected the request"))
    return "Tanda tangan dibatalkan di dompet.";
  if (m.includes("must deposit") || m.includes("deposit before"))
    return "Deposit USDC ke Hyperliquid terlebih dahulu, lalu aktifkan trading.";
  if (m.includes("does not exist"))
    return "Agen belum terdaftar untuk akun ini. Aktifkan trading ulang dari menu dompet.";
  if (m.includes("minimum value")) return "Nilai order minimum adalah $10.";
  if (m.includes("insufficient margin")) return "Margin tidak cukup untuk order ini.";
  if (m.includes("could not immediately match")) return "Tidak ada likuiditas yang cocok saat ini — order dibatalkan.";
  if (m.includes("reduce only")) return "Order reduce-only ditolak karena akan menambah posisi.";
  if (m.includes("invalid price") || m.includes("tick size")) return "Harga tidak sesuai tick size pasar.";
  if (m.includes("chainid") || m.includes("chain id")) return "Jaringan dompet berubah. Hubungkan ulang dompet lalu coba lagi.";
  return raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
}

export async function approveAgent(net: Net, user: string, chainId: number): Promise<Agent> {
  const e = getEth();
  if (!e) throw new Error("Dompet tidak terdeteksi.");
  const key = generatePrivateKey();
  const agent = privateKeyToAccount(key);
  const nonce = nextNonce();
  const { action, typedData } = approveAgentPayload(
    agent.address,
    "graduate",
    nonce,
    net === "mainnet",
    `0x${chainId.toString(16)}`,
  );
  const raw = (await e.request({
    method: "eth_signTypedData_v4",
    params: [user, JSON.stringify(typedData)],
  })) as string;
  const res = await postExchange(net, action, splitSig(raw), nonce);
  if (res?.status !== "ok")
    throw new Error(humanize(typeof res?.response === "string" ? res.response : "Persetujuan agen ditolak HyperCore."));
  const a: Agent = { key, address: agent.address, at: Date.now() };
  localStorage.setItem(slot(net, user), JSON.stringify(a));
  return a;
}

/* ── eksekusi ─────────────────────────────────────────────── */
export type Exec = { ok: boolean; msg: string };

function parseRes(res: ExRes, okMsg: string): Exec {
  if (res?.status !== "ok")
    return { ok: false, msg: humanize(typeof res?.response === "string" ? res.response : JSON.stringify(res ?? {})) };
  const st = (res.response as { data?: { statuses?: unknown[] } } | undefined)?.data?.statuses?.[0];
  if (st == null || st === "success") return { ok: true, msg: okMsg };
  if (typeof st === "string") return { ok: true, msg: st === "waitingForFill" ? "Menunggu terisi." : okMsg };
  const o = st as { error?: string; filled?: { totalSz: string; avgPx: string }; resting?: { oid: number } };
  if (o.error) return { ok: false, msg: humanize(o.error) };
  if (o.filled) return { ok: true, msg: `Terisi ${o.filled.totalSz} @ ${Number(o.filled.avgPx).toLocaleString("id-ID")}` };
  if (o.resting) return { ok: true, msg: `Order terpasang di buku · oid ${o.resting.oid}` };
  return { ok: true, msg: okMsg };
}

async function sendL1(net: Net, agent: Agent, action: unknown, okMsg: string): Promise<Exec> {
  try {
    const nonce = nextNonce();
    const sig = await signL1WithKey(agent.key, action, nonce, net === "mainnet");
    return parseRes(await postExchange(net, action, sig, nonce), okMsg);
  } catch (e) {
    return { ok: false, msg: humanize(errMsg(e)) };
  }
}

export const SLIPPAGE = 0.03;

export function placeOrder(p: {
  net: Net;
  agent: Agent;
  m: Mkt;
  isBuy: boolean;
  size: number;
  px: number;
  market: boolean;
  reduceOnly: boolean;
  postOnly?: boolean;
}): Promise<Exec> {
  const px = roundPrice(p.market ? p.px * (p.isBuy ? 1 + SLIPPAGE : 1 - SLIPPAGE) : p.px, p.m.szDecimals);
  const sz = roundSize(p.size, p.m.szDecimals);
  if (!(px > 0)) return Promise.resolve({ ok: false, msg: "Harga tidak valid." });
  if (!(sz > 0)) return Promise.resolve({ ok: false, msg: `Ukuran terlalu kecil untuk ${p.m.base}.` });
  if (!p.reduceOnly && sz * px < 10) return Promise.resolve({ ok: false, msg: "Nilai order minimum adalah $10." });
  const tif = p.market ? "Ioc" : p.postOnly ? "Alo" : "Gtc";
  const action = orderAction([orderWire(p.m.asset, p.isBuy, px, sz, p.reduceOnly, tif)]);
  return sendL1(p.net, p.agent, action, "Order diterima HyperCore.");
}

export const cancelOrder = (net: Net, agent: Agent, asset: number, oid: number) =>
  sendL1(net, agent, cancelAction([{ a: asset, o: oid }]), "Order dibatalkan.");

export const updateLeverage = (net: Net, agent: Agent, m: Mkt, lev: number) =>
  sendL1(
    net,
    agent,
    leverageAction(m.asset, !m.isolatedOnly, Math.round(lev)),
    `Leverage ${Math.round(lev)}× ${m.isolatedOnly ? "isolated" : "cross"} tersimpan.`,
  );

/* ── akun ─────────────────────────────────────────────────── */
type RawPos = {
  position: {
    coin: string;
    szi: string;
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string | null;
    marginUsed: string;
    leverage?: { type: string; value: number };
  };
};
type RawCH = {
  marginSummary?: { accountValue?: string; totalNtlPos?: string; totalMarginUsed?: string };
  withdrawable?: string;
  assetPositions?: RawPos[];
};

export type Position = {
  coin: string;
  szi: number;
  entry: number;
  value: number;
  upnl: number;
  roe: number;
  liq: number | null;
  margin: number;
  lev: number;
  levType: string;
};
export type Account = { equity: number; ntl: number; marginUsed: number; withdrawable: number; positions: Position[] };

const parseCH = (r: RawCH): Account => ({
  equity: Number(r?.marginSummary?.accountValue ?? 0),
  ntl: Number(r?.marginSummary?.totalNtlPos ?? 0),
  marginUsed: Number(r?.marginSummary?.totalMarginUsed ?? 0),
  withdrawable: Number(r?.withdrawable ?? 0),
  positions: (r?.assetPositions ?? [])
    .map(({ position: p }) => ({
      coin: p.coin,
      szi: Number(p.szi),
      entry: Number(p.entryPx),
      value: Number(p.positionValue),
      upnl: Number(p.unrealizedPnl),
      roe: Number(p.returnOnEquity) * 100,
      liq: p.liquidationPx ? Number(p.liquidationPx) : null,
      margin: Number(p.marginUsed),
      lev: p.leverage?.value ?? 1,
      levType: p.leverage?.type ?? "cross",
    }))
    .filter((p) => p.szi !== 0),
});

type RawOO = {
  coin: string;
  side: "B" | "A";
  limitPx: string;
  sz: string;
  origSz?: string;
  oid: number;
  timestamp: number;
  orderType?: string;
  reduceOnly?: boolean;
};
export type OpenOrder = {
  coin: string;
  side: "B" | "A";
  px: number;
  sz: number;
  origSz: number;
  oid: number;
  time: number;
  type: string;
  reduceOnly: boolean;
};
const mapOO = (o: RawOO): OpenOrder => ({
  coin: o.coin,
  side: o.side,
  px: Number(o.limitPx),
  sz: Number(o.sz),
  origSz: Number(o.origSz ?? o.sz),
  oid: o.oid,
  time: o.timestamp,
  type: o.orderType ?? "Limit",
  reduceOnly: !!o.reduceOnly,
});

type RawFill = {
  coin: string;
  px: string;
  sz: string;
  side: "B" | "A";
  time: number;
  dir?: string;
  closedPnl?: string;
  fee?: string;
  oid: number;
  tid: number;
};
export type UserFill = {
  coin: string;
  px: number;
  sz: number;
  side: "B" | "A";
  time: number;
  dir: string;
  pnl: number;
  fee: number;
  tid: number;
};

export function useAccount(net: Net, user: string | null, dex = "") {
  const k = user ? `${net}|${user.toLowerCase()}|${dex}` : null;
  const body = (type: string): Record<string, unknown> => (dex ? { type, user, dex } : { type, user });
  const ch = usePolled<Account>(
    k ? `ch|${k}` : null,
    async () => parseCH(await info<RawCH>(net, body("clearinghouseState"))),
    4000,
  );
  const oo = usePolled<OpenOrder[]>(
    k ? `oo|${k}` : null,
    async () => (await info<RawOO[]>(net, body("frontendOpenOrders"))).map(mapOO),
    8000,
  );
  return {
    account: ch.data,
    orders: oo.data ?? [],
    live: ch.live,
    refresh: () => {
      ch.refresh();
      oo.refresh();
    },
  };
}

export function useFills(net: Net, user: string | null) {
  return usePolled<UserFill[]>(
    user ? `fills|${net}|${user.toLowerCase()}` : null,
    async () =>
      (await info<RawFill[]>(net, { type: "userFills", user })).slice(0, 60).map((f) => ({
        coin: f.coin,
        px: Number(f.px),
        sz: Number(f.sz),
        side: f.side,
        time: f.time,
        dir: f.dir ?? (f.side === "B" ? "Buy" : "Sell"),
        pnl: Number(f.closedPnl ?? 0),
        fee: Number(f.fee ?? 0),
        tid: f.tid,
      })),
    15_000,
  );
}

export function usePortfolioHistory(net: Net, user: string | null) {
  return usePolled<{ t: number; v: number }[]>(
    user ? `pf|${net}|${user.toLowerCase()}` : null,
    async () => {
      const raw = await info<[string, { accountValueHistory?: [number, string][] }][]>(net, { type: "portfolio", user });
      const pick = raw.find(([k]) => k === "month") ?? raw.find(([k]) => k === "allTime") ?? raw[0];
      return (pick?.[1]?.accountValueHistory ?? []).map(([t, v]) => ({ t, v: Number(v) }));
    },
    60_000,
  );
}
