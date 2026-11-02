import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../store";
import { roundPrice } from "../lib/hlsign";
import {
  APP_URL,
  SLIPPAGE,
  cancelOrder,
  fmtPx,
  fmtSz,
  placeOrder,
  shortAddr,
  updateLeverage,
  useAccount,
  useFills,
  useMarkets,
  type Level,
  type Mkt,
  type OpenOrder,
  type Position,
  type Trade,
} from "../lib/hl";
import { fmt } from "./ui";

/* ── primitives ────────────────────────────────────────────── */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const HUES = [72, 158, 200, 248, 286, 330, 18, 44];
export function Glyph({ name, size = 28 }: { name: string; size?: number }) {
  const base = name.includes(":") ? name.slice(name.indexOf(":") + 1) : name;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = HUES[h % HUES.length];
  const label = base.slice(0, base.length > 4 ? 3 : Math.min(3, base.length));
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-[#07090b]"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.33),
        letterSpacing: "-0.03em",
        background: `linear-gradient(140deg, hsl(${hue} 90% 74%), hsl(${(hue + 36) % 360} 60% 50%))`,
      }}
    >
      {label}
    </span>
  );
}

export function Identicon({ addr, size = 22 }: { addr: string; size?: number }) {
  let h = 0;
  for (let i = 2; i < addr.length; i++) h = (h * 33 + addr.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 70 + ((h >> 9) % 90)) % 360;
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${h % 360}deg, hsl(${a} 80% 62%), hsl(${b} 75% 55%), hsl(${a} 80% 62%))`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18)",
      }}
    />
  );
}

const Chevron = ({ open }: { open?: boolean }) => (
  <svg
    viewBox="0 0 12 12"
    className={`h-3 w-3 text-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden
  >
    <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function SumRow({ k, v, tone }: { k: string; v: ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <span className="text-dim">{k}</span>
      <span className={`num ${tone ?? "text-bone"}`}>{v}</span>
    </div>
  );
}

/* ── market bar ────────────────────────────────────────────── */
export function MarketBar({ m, mid, open, onSelect }: { m?: Mkt; mid: number; open: boolean; onSelect: () => void }) {
  const now = useNow(1000);
  const prev = useRef(mid);
  const [dir, setDir] = useState(0);
  useEffect(() => {
    if (mid && prev.current && mid !== prev.current) setDir(mid > prev.current ? 1 : -1);
    prev.current = mid;
  }, [mid]);

  if (!m)
    return (
      <div className="flex h-[60px] items-center gap-3 px-4">
        <span className="skeleton h-8 w-8 rounded-full" />
        <span className="skeleton h-4 w-44 rounded" />
        <span className="skeleton ml-6 hidden h-4 w-72 rounded md:block" />
      </div>
    );

  const left = 3600 - (Math.floor(now / 1000) % 3600);
  const cd = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const d = m.szDecimals;
  const abs = m.mark - m.prev;
  const stats: [string, ReactNode][] = [
    ["Mark", fmtPx(m.mark, d)],
    ["Oracle", fmtPx(m.oracle, d)],
    [
      "Perubahan 24j",
      <span className={m.change >= 0 ? "text-mint" : "text-blood"}>
        {abs >= 0 ? "+" : "−"}
        {fmtPx(Math.abs(abs), d)} / {fmt.pct(m.change)}
      </span>,
    ],
    ["Volume 24j", fmt.usd(m.vol, 0)],
    ["Open interest", fmt.usd(m.oi, 0)],
    [
      "Funding · hitung mundur",
      <span>
        <span className={m.funding >= 0 ? "text-mint" : "text-blood"}>{(m.funding * 100).toFixed(4).replace(".", ",")}%</span>
        <span className="text-dim"> {cd}</span>
      </span>,
    ],
  ];

  return (
    <div className="flex items-center gap-5 overflow-x-auto px-2 py-2 [scrollbar-width:none]">
      <button
        onClick={onSelect}
        className={`flex shrink-0 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
          open ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
        }`}
      >
        <Glyph name={m.key} size={30} />
        <span className="text-left">
          <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
            {m.base}-USD <Chevron open={open} />
          </span>
          <span className="block text-[11px] text-dim">
            {m.dex ? `${m.dexName} · HIP-3` : "HyperCore perp"} · maks {m.maxLev}×
          </span>
        </span>
      </button>
      <div
        className={`num shrink-0 text-[22px] font-semibold tracking-[-0.02em] transition-colors duration-300 ${
          dir > 0 ? "text-mint" : dir < 0 ? "text-blood" : "text-bone"
        }`}
      >
        {fmtPx(mid || m.mark, d)}
      </div>
      <span className="h-8 w-px shrink-0 bg-white/[0.07]" />
      {stats.map(([k, v]) => (
        <div key={k} className="shrink-0">
          <div className="text-[11px] text-dim">{k}</div>
          <div className="num mt-0.5 text-[12.5px] text-bone">{v}</div>
        </div>
      ))}
    </div>
  );
}

/* ── market selector ───────────────────────────────────────── */
export function MarketSelector({ onClose, onPick }: { onClose: () => void; onPick: (m: Mkt) => void }) {
  const { net } = useApp();
  const { main, hip3, dexes } = useMarkets(net);
  const [tab, setTab] = useState<"all" | "core" | "hip3">("all");
  const [dex, setDex] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rows = useMemo(() => {
    let list = tab === "core" ? main : tab === "hip3" ? hip3 : [...main, ...hip3];
    if (tab === "hip3" && dex) list = list.filter((m) => m.dex === dex);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((m) => m.key.toLowerCase().includes(s) || m.dexName.toLowerCase().includes(s));
    return [...list].sort((a, b) => b.vol - a.vol).slice(0, 150);
  }, [tab, dex, q, main, hip3]);

  const grid = "grid grid-cols-[1.7fr_1fr_0.8fr] gap-2 sm:grid-cols-[1.7fr_1fr_0.8fr_1fr_0.8fr]";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="absolute left-1.5 top-[calc(100%+6px)] z-50 w-[min(720px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0c1014]/95 shadow-[0_40px_90px_-30px_rgba(0,0,0,.95)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-dim" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5 14 14" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari pasar — BTC, TSLA, GOLD, xyz…"
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-dim/70"
          />
          <span className="num shrink-0 text-[11px] text-dim">{rows.length} pasar</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
          {(
            [
              ["all", `Semua`],
              ["core", `HyperCore · ${main.length}`],
              ["hip3", `HIP-3 · ${hip3.length}`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setDex("");
              }}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                tab === k ? "bg-white/[0.08] text-bone" : "text-dim hover:text-bone"
              }`}
            >
              {l}
            </button>
          ))}
          {tab === "hip3" && <span className="mx-1 h-4 w-px bg-white/10" />}
          {tab === "hip3" &&
            dexes.filter((x) => hip3.some((m) => m.dex === x.name)).map((x) => (
              <button
                key={x.name}
                onClick={() => setDex(dex === x.name ? "" : x.name)}
                className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                  dex === x.name ? "border-amber/40 bg-amber/10 text-amber" : "border-white/10 text-dim hover:text-bone"
                }`}
              >
                {x.fullName}
              </button>
            ))}
        </div>
        <div className={`${grid} mt-2 border-y border-white/[0.06] px-4 py-2 text-[11px] text-dim`}>
          <span>Pasar</span>
          <span className="text-right">Harga</span>
          <span className="text-right">24j</span>
          <span className="hidden text-right sm:block">Volume</span>
          <span className="hidden text-right sm:block">Funding</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-[12.5px] text-dim">
              {main.length ? "Tidak ada pasar yang cocok." : "Memuat pasar HyperCore…"}
            </div>
          ) : (
            rows.map((m) => (
              <button
                key={m.key}
                onClick={() => onPick(m)}
                className={`${grid} w-full items-center px-4 py-2 text-left transition-colors hover:bg-white/[0.045]`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Glyph name={m.key} size={22} />
                  <span className="truncate text-[13px] font-medium">{m.base}</span>
                  {m.dex && <span className="rounded border border-white/10 px-1 text-[10px] text-dim">{m.dex}</span>}
                  <span className="num rounded bg-white/[0.05] px-1 text-[10px] text-dim">{m.maxLev}×</span>
                </span>
                <span className="num text-right text-[12px]">{fmtPx(m.mark, m.szDecimals)}</span>
                <span className={`num text-right text-[12px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>
                  {fmt.pct(m.change)}
                </span>
                <span className="num hidden text-right text-[12px] text-dim sm:block">{fmt.usd(m.vol, 0)}</span>
                <span className={`num hidden text-right text-[12px] sm:block ${m.funding >= 0 ? "text-mint" : "text-blood"}`}>
                  {(m.funding * 100).toFixed(4).replace(".", ",")}%
                </span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ── order book + trades ───────────────────────────────────── */
function cumulate(arr: Level[]) {
  const out: number[] = [];
  let s = 0;
  for (const l of arr) {
    s += l.sz;
    out.push(s);
  }
  return out;
}

function BookRow({
  l,
  c,
  max,
  side,
  d,
  onPick,
}: {
  l: Level;
  c: number;
  max: number;
  side: "bid" | "ask";
  d: number;
  onPick: (px: number) => void;
}) {
  return (
    <button
      onClick={() => onPick(l.px)}
      className="group relative grid h-[20px] w-full shrink-0 grid-cols-3 items-center px-2 text-[11.5px]"
    >
      <span
        aria-hidden
        className={`absolute inset-y-[1px] right-0 rounded-[3px] transition-[width] duration-300 ${
          side === "bid" ? "bg-mint/[0.12]" : "bg-blood/[0.12]"
        }`}
        style={{ width: `${Math.min(100, (c / max) * 100)}%` }}
      />
      <span aria-hidden className="absolute inset-0 rounded-[3px] bg-white/[0.05] opacity-0 group-hover:opacity-100" />
      <span className={`num relative text-left ${side === "bid" ? "text-mint" : "text-blood"}`}>{fmtPx(l.px, d)}</span>
      <span className="num relative text-right text-bone/90">{fmtSz(l.sz, d)}</span>
      <span className="num relative text-right text-dim">{fmtSz(c, d)}</span>
    </button>
  );
}

export function BookPanel({
  m,
  bids,
  asks,
  trades,
  onPick,
}: {
  m?: Mkt;
  bids: Level[];
  asks: Level[];
  trades: Trade[];
  onPick: (px: number) => void;
}) {
  const [tab, setTab] = useState<"book" | "trades">("book");
  const N = 10;
  const a = asks.slice(0, N);
  const b = bids.slice(0, N);
  const ca = cumulate(a);
  const cb = cumulate(b);
  const max = Math.max(ca[ca.length - 1] ?? 0, cb[cb.length - 1] ?? 0) || 1;
  const spread = a[0] && b[0] ? a[0].px - b[0].px : 0;
  const midp = a[0] && b[0] ? (a[0].px + b[0].px) / 2 : 0;
  const d = m?.szDecimals ?? 2;
  const empty = !a.length && !b.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-white/[0.06] px-2">
        {(
          [
            ["book", "Buku pesanan"],
            ["trades", "Transaksi"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative px-2.5 py-2.5 text-[12.5px] font-medium transition-colors ${
              tab === k ? "text-bone" : "text-dim hover:text-bone"
            }`}
          >
            {l}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-amber" />}
          </button>
        ))}
      </div>

      {tab === "book" ? (
        <div className="flex min-h-0 flex-1 flex-col px-1.5 pb-1.5">
          <div className="grid grid-cols-3 px-2 py-2 text-[11px] text-dim">
            <span>Harga</span>
            <span className="text-right">Ukuran ({m?.base ?? "—"})</span>
            <span className="text-right">Total</span>
          </div>
          {empty ? (
            <div className="flex flex-1 flex-col gap-[6px] px-2 pt-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="skeleton h-[14px] rounded" style={{ width: `${55 + ((i * 37) % 45)}%`, marginLeft: "auto" }} />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col justify-end overflow-hidden">
                {a
                  .map((l, i) => ({ l, c: ca[i] }))
                  .reverse()
                  .map(({ l, c }) => (
                    <BookRow key={`a${l.px}`} l={l} c={c} max={max} side="ask" d={d} onPick={onPick} />
                  ))}
              </div>
              <div className="my-1 flex items-center justify-between rounded-lg bg-white/[0.035] px-2 py-1.5 text-[11.5px]">
                <span className="text-dim">Spread</span>
                <span className="num text-bone">{fmtPx(spread, d)}</span>
                <span className="num text-dim">{midp ? ((spread / midp) * 100).toFixed(3).replace(".", ",") : "0"}%</span>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                {b.map((l, i) => (
                  <BookRow key={`b${l.px}`} l={l} c={cb[i]} max={max} side="bid" d={d} onPick={onPick} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-1.5 pb-1.5">
          <div className="grid grid-cols-3 px-2 py-2 text-[11px] text-dim">
            <span>Harga</span>
            <span className="text-right">Ukuran</span>
            <span className="text-right">Waktu</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {trades.length === 0 ? (
              <div className="px-2 py-10 text-center text-[12px] text-dim">Menunggu transaksi…</div>
            ) : (
              trades.map((t) => (
                <div key={t.tid} className="grid h-[20px] grid-cols-3 items-center px-2 text-[11.5px]">
                  <span className={`num ${t.side === "B" ? "text-mint" : "text-blood"}`}>{fmtPx(t.px, d)}</span>
                  <span className="num text-right text-bone/90">{fmtSz(t.sz, d)}</span>
                  <span className="num text-right text-dim">
                    {new Date(t.time).toLocaleTimeString("id-ID", { hour12: false })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── order form (eksekusi nyata) ───────────────────────────── */
function Field({ label, suffix, action, children }: { label: string; suffix?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 transition-colors focus-within:border-amber/50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-dim">{label}</span>
        {action}
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        {children}
        <span className="shrink-0 text-[12px] text-dim">{suffix}</span>
      </div>
    </div>
  );
}

function Check({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => set(!on)} className="flex items-center gap-2 text-[12px] text-dim hover:text-bone">
      <span
        className={`grid h-4 w-4 place-items-center rounded-[5px] border transition-colors ${
          on ? "border-amber bg-amber text-ink" : "border-white/20"
        }`}
      >
        {on && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

export function OrderForm({ m, mid, pick }: { m?: Mkt; mid: number; pick: { px: number; n: number } | null }) {
  const { net, wallet, agent, connect, enableTrading, toast } = useApp();
  const user = wallet?.address ?? null;
  const { account, refresh } = useAccount(net, user, m?.dex ?? "");
  const [kind, setKind] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [px, setPx] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState<"usd" | "coin">("usd");
  const [lev, setLev] = useState(10);
  const [levDirty, setLevDirty] = useState(false);
  const [levOpen, setLevOpen] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [post, setPost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const key = m?.key;
  const maxLev = m?.maxLev ?? 20;
  const pos = account?.positions.find((p) => p.coin === key);
  const posLev = pos?.lev;

  useEffect(() => {
    setLev(posLev ?? Math.min(10, maxLev));
    setLevDirty(false);
  }, [key, posLev, maxLev]);
  useEffect(() => {
    setSize("");
    setPx("");
  }, [key]);
  useEffect(() => {
    if (pick) {
      setKind("limit");
      setPx(String(pick.px));
    }
  }, [pick]);

  const d = m?.szDecimals ?? 2;
  const refPx = kind === "market" ? mid : Number(px.replace(",", ".")) || 0;
  const raw = Number(size.replace(",", ".")) || 0;
  const coinSz = unit === "usd" ? (refPx > 0 ? raw / refPx : 0) : raw;
  const notional = coinSz * refPx;
  const margin = notional / Math.max(1, lev);
  const avail = account?.withdrawable ?? 0;
  const maxNotional = avail * lev;
  const pct = maxNotional > 0 ? Math.min(100, (notional / maxNotional) * 100) : 0;
  const mmr = 1 / (2 * maxLev);
  const liq =
    refPx > 0 && notional > 0 ? (side === "buy" ? refPx * (1 - 1 / lev + mmr) : refPx * (1 + 1 / lev - mmr)) : 0;
  const feeRate = kind === "limit" && post ? 0.00015 : 0.00045;
  const ready = !!wallet && !!agent;
  const tooSmall = notional > 0 && notional < 10 && !reduce;
  const noMargin = ready && notional > 0 && margin > avail + 0.01 && !reduce;

  const setPct = (p: number) => {
    if (!(maxNotional > 0) || !(refPx > 0)) return;
    const n = ((maxNotional * p) / 100) * 0.995;
    setSize(unit === "usd" ? n.toFixed(2) : (n / refPx).toFixed(d));
  };
  const toggleUnit = () => {
    if (raw > 0 && refPx > 0) setSize(unit === "usd" ? (raw / refPx).toFixed(d) : (raw * refPx).toFixed(2));
    setUnit((u) => (u === "usd" ? "coin" : "usd"));
  };

  async function submit() {
    if (!m) return;
    if (!wallet) {
      await connect();
      return;
    }
    if (!agent) {
      await enableTrading();
      return;
    }
    if (!(coinSz > 0) || !(refPx > 0)) {
      toast("Isi ukuran order terlebih dahulu.", "amber");
      return;
    }
    if (net === "mainnet" && !confirm) {
      setConfirm(true);
      return;
    }
    setConfirm(false);
    setBusy(true);
    try {
      if (levDirty) {
        const r = await updateLeverage(net, agent, m, lev);
        if (!r.ok) {
          toast(r.msg, "blood");
          return;
        }
        setLevDirty(false);
      }
      const r = await placeOrder({
        net,
        agent,
        m,
        isBuy: side === "buy",
        size: coinSz,
        px: refPx,
        market: kind === "market",
        reduceOnly: reduce,
        postOnly: post,
      });
      toast(r.msg, r.ok ? "mint" : "blood");
      if (r.ok) {
        setSize("");
        refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const cta = !wallet
    ? "Hubungkan dompet"
    : !agent
      ? "Aktifkan trading"
      : busy
        ? "Mengirim ke HyperCore…"
        : `${side === "buy" ? "Beli / Long" : "Jual / Short"} ${m?.base ?? ""}`;
  const ctaCls = !ready ? "bg-amber text-ink" : side === "buy" ? "bg-mint text-ink" : "bg-blood text-ink";
  const disabled = busy || !m || (ready && (!(notional > 0) || tooSmall || noMargin));
  const levChips = Array.from(new Set([1, 2, 3, 5, 10, 20, 25, 40, 50].filter((x) => x <= maxLev).concat(maxLev)));

  return (
    <div className="tpanel flex flex-col p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg bg-white/[0.04] p-0.5">
          {(["market", "limit"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors ${
                kind === k ? "bg-white/[0.09] text-bone" : "text-dim hover:text-bone"
              }`}
            >
              {k === "market" ? "Market" : "Limit"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setLevOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-dim transition-colors hover:text-bone"
        >
          {m?.isolatedOnly ? "Isolated" : "Cross"} <span className="num font-semibold text-amber">{lev}×</span>
          {levDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {levOpen && (
          <motion.div
            key="lev"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-dim">Leverage {m?.isolatedOnly ? "isolated" : "cross"}</span>
                <span className="num font-semibold text-amber">{lev}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={maxLev}
                value={lev}
                onChange={(e) => {
                  setLev(Number(e.target.value));
                  setLevDirty(true);
                }}
                className="mt-2 w-full"
                style={{ "--fill": `${((lev - 1) / Math.max(1, maxLev - 1)) * 100}%` } as CSSProperties}
                aria-label="Leverage"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {levChips.map((x) => (
                  <button
                    key={x}
                    onClick={() => {
                      setLev(x);
                      setLevDirty(true);
                    }}
                    className={`num rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                      lev === x ? "border-amber/50 bg-amber/10 text-amber" : "border-white/10 text-dim hover:text-bone"
                    }`}
                  >
                    {x}×
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-dim">
                {levDirty
                  ? "Leverage baru dikirim ke HyperCore bersama order berikutnya."
                  : "Leverage mengikuti pengaturan akun Anda di HyperCore."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
        <button
          onClick={() => setSide("buy")}
          className={`rounded-lg py-2 text-[13px] font-semibold transition-colors ${
            side === "buy" ? "bg-mint text-ink" : "text-dim hover:text-bone"
          }`}
        >
          Beli / Long
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`rounded-lg py-2 text-[13px] font-semibold transition-colors ${
            side === "sell" ? "bg-blood text-ink" : "text-dim hover:text-bone"
          }`}
        >
          Jual / Short
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        <SumRow k="Tersedia" v={wallet ? `${fmt.n(avail, 2)} USDC` : "—"} />
        <SumRow
          k="Posisi saat ini"
          v={pos ? `${pos.szi > 0 ? "+" : ""}${fmtSz(pos.szi, d)} ${m?.base ?? ""}` : "—"}
          tone={pos ? (pos.szi > 0 ? "text-mint" : "text-blood") : undefined}
        />
      </div>

      {kind === "limit" && (
        <Field
          label="Harga limit"
          suffix="USD"
          action={
            <button
              type="button"
              onClick={() => mid && setPx(String(roundPrice(mid, d)))}
              className="text-[11px] font-medium text-amber hover:brightness-110"
            >
              Mid
            </button>
          }
        >
          <input
            inputMode="decimal"
            value={px}
            onChange={(e) => setPx(e.target.value)}
            placeholder={mid ? fmtPx(mid, d) : "0"}
            className="num w-full min-w-0 bg-transparent text-[16px] font-medium outline-none placeholder:text-dim/50"
          />
        </Field>
      )}

      <Field
        label="Ukuran"
        suffix={
          <button
            type="button"
            onClick={toggleUnit}
            className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11.5px] font-medium text-bone transition-colors hover:bg-white/[0.1]"
          >
            {unit === "usd" ? "USD" : (m?.base ?? "—")} ⇄
          </button>
        }
      >
        <input
          inputMode="decimal"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0"
          className="num w-full min-w-0 bg-transparent text-[16px] font-medium outline-none placeholder:text-dim/50"
        />
      </Field>
      <div className="mt-1.5 flex justify-between text-[11px] text-dim">
        <span className="num">
          {unit === "usd" ? `≈ ${coinSz > 0 ? fmtSz(coinSz, d) : "0"} ${m?.base ?? ""}` : `≈ ${fmt.usd(notional, 2)}`}
        </span>
        <span className="num">Maks {maxNotional > 0 ? fmt.usd(maxNotional, 0) : "—"}</span>
      </div>

      <div className={`mt-3 ${maxNotional > 0 ? "" : "opacity-40"}`}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(pct)}
          disabled={!(maxNotional > 0)}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full"
          style={{ "--fill": `${pct}%` } as CSSProperties}
          aria-label="Persentase dari ukuran maksimum"
        />
        <div className="mt-0.5 flex justify-between">
          {[0, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              disabled={!(maxNotional > 0)}
              onClick={() => setPct(p)}
              className="num text-[10.5px] text-dim transition-colors hover:text-bone"
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Check on={reduce} set={setReduce} label="Reduce-only" />
        {kind === "limit" && <Check on={post} set={setPost} label="Post-only" />}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
        <SumRow k="Nilai order" v={notional > 0 ? fmt.usd(notional, 2) : "—"} />
        <SumRow k="Margin dibutuhkan" v={notional > 0 ? fmt.usd(margin, 2) : "—"} />
        <SumRow k="Est. harga likuidasi" v={liq > 0 ? fmtPx(liq, d) : "—"} tone={liq > 0 ? "text-blood" : undefined} />
        <SumRow
          k="Biaya"
          v={notional > 0 ? `${fmt.usd(notional * feeRate, 2)} · ${(feeRate * 100).toFixed(3).replace(".", ",")}%` : "—"}
        />
        {kind === "market" && <SumRow k="Slippage maks" v={`${SLIPPAGE * 100}%`} />}
      </div>

      {(tooSmall || noMargin) && (
        <p className="mt-3 rounded-lg border border-amber/25 bg-amber/[0.06] px-2.5 py-2 text-[11.5px] leading-relaxed text-amber">
          {tooSmall ? "Nilai order minimum di HyperCore adalah $10." : "Margin tersedia tidak cukup untuk ukuran ini."}
        </p>
      )}
      {m?.dex && (
        <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-[11.5px] leading-relaxed text-dim">
          Pasar HIP-3 milik <span className="text-bone">{m.dexName}</span>: kolateral dan orakel dikelola per DEX deployer.
        </p>
      )}
      {net === "testnet" && wallet && avail === 0 && (
        <a
          href={`${APP_URL.testnet}/drip`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-lg border border-lilac/30 bg-lilac/[0.07] px-2.5 py-2 text-[11.5px] leading-relaxed text-lilac"
        >
          Saldo testnet kosong — klaim USDC uji di faucet Hyperliquid ↗
        </a>
      )}

      <button
        onClick={submit}
        disabled={disabled}
        className={`mt-4 rounded-xl py-3 text-[13.5px] font-semibold transition-all hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${ctaCls}`}
      >
        {cta}
      </button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-dim">
        {ready && agent
          ? `Ditandatangani agen lokal ${shortAddr(agent.address)} · tanpa pop-up · tanpa hak tarik dana`
          : "Satu tanda tangan untuk menyetujui agen trading. Agen hanya bisa trading — tidak bisa menarik dana."}
      </p>

      <AnimatePresence>
        {confirm && m && (
          <motion.div
            className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirm(false)}
          >
            <motion.div
              className="glass w-full max-w-[380px] rounded-2xl p-5"
              initial={{ y: 14, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <Glyph name={m.key} size={34} />
                <div>
                  <div className="text-[15px] font-semibold">Konfirmasi order mainnet</div>
                  <div className="text-[12px] text-dim">Order ini memakai dana nyata di HyperCore.</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <SumRow k="Pasar" v={`${m.base}-USD${m.dex ? ` · ${m.dex}` : ""}`} />
                <SumRow
                  k="Arah"
                  v={side === "buy" ? "Beli / Long" : "Jual / Short"}
                  tone={side === "buy" ? "text-mint" : "text-blood"}
                />
                <SumRow k="Tipe" v={kind === "market" ? `Market · slippage ${SLIPPAGE * 100}%` : post ? "Limit · post-only" : "Limit · GTC"} />
                <SumRow k="Ukuran" v={`${fmtSz(coinSz, d)} ${m.base}`} />
                <SumRow k="Harga" v={kind === "market" ? `≈ ${fmtPx(refPx, d)}` : fmtPx(refPx, d)} />
                <SumRow k="Nilai" v={fmt.usd(notional, 2)} />
                <SumRow k="Leverage" v={`${lev}× ${m.isolatedOnly ? "isolated" : "cross"}`} />
                {!reduce && <SumRow k="Est. likuidasi" v={liq > 0 ? fmtPx(liq, d) : "—"} tone="text-blood" />}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirm(false)}
                  className="rounded-xl border border-white/10 py-2.5 text-[13px] font-medium text-dim transition-colors hover:text-bone"
                >
                  Batal
                </button>
                <button
                  onClick={submit}
                  className={`rounded-xl py-2.5 text-[13px] font-semibold text-ink ${side === "buy" ? "bg-mint" : "bg-blood"}`}
                >
                  Kirim order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── ringkasan akun ────────────────────────────────────────── */
export function AccountSummary() {
  const { net, wallet, agent } = useApp();
  const { account } = useAccount(net, wallet?.address ?? null, "");
  const upnl = account?.positions.reduce((s, p) => s + p.upnl, 0) ?? 0;
  const lev = account && account.equity > 0 ? account.ntl / account.equity : 0;
  return (
    <div className="tpanel p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold">Akun</span>
        <span className={`flex items-center gap-1.5 text-[11px] ${net === "mainnet" ? "text-mint" : "text-lilac"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${net === "mainnet" ? "bg-mint" : "bg-lilac"}`} />
          {net === "mainnet" ? "Mainnet" : "Testnet"}
        </span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        <SumRow k="Ekuitas" v={wallet ? fmt.usd(account?.equity ?? 0, 2) : "—"} />
        <SumRow
          k="PnL belum direalisasi"
          v={wallet ? `${upnl >= 0 ? "+" : "−"}${fmt.usd(Math.abs(upnl), 2)}` : "—"}
          tone={wallet ? (upnl >= 0 ? "text-mint" : "text-blood") : undefined}
        />
        <SumRow k="Margin terpakai" v={wallet ? fmt.usd(account?.marginUsed ?? 0, 2) : "—"} />
        <SumRow k="Bisa ditarik" v={wallet ? fmt.usd(account?.withdrawable ?? 0, 2) : "—"} />
        <SumRow k="Leverage akun" v={wallet ? `${lev.toFixed(2).replace(".", ",")}×` : "—"} />
        <SumRow
          k="Status trading"
          v={agent ? "Agen aktif" : wallet ? "Belum aktif" : "—"}
          tone={agent ? "text-mint" : "text-dim"}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`${APP_URL[net]}/portfolio`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 py-2 text-center text-[12px] font-medium text-bone transition-colors hover:border-white/25"
        >
          Deposit ↗
        </a>
        <a
          href={net === "testnet" ? `${APP_URL.testnet}/drip` : `${APP_URL.mainnet}/portfolio`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 py-2 text-center text-[12px] font-medium text-bone transition-colors hover:border-white/25"
        >
          {net === "testnet" ? "Faucet ↗" : "Tarik dana ↗"}
        </a>
      </div>
    </div>
  );
}

/* ── panel akun: posisi, order, riwayat ────────────────────── */
const TH = "whitespace-nowrap px-3 py-2 text-[11px] font-medium text-dim";
const TD = "whitespace-nowrap px-3 py-2.5 text-[12px]";
const DIR: Record<string, string> = {
  "Open Long": "Buka long",
  "Close Long": "Tutup long",
  "Open Short": "Buka short",
  "Close Short": "Tutup short",
  Buy: "Beli",
  Sell: "Jual",
};
const when = (t: number) =>
  new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export function AccountPanel({ m }: { m?: Mkt }) {
  const { net, wallet, agent, connect, enableTrading, toast } = useApp();
  const user = wallet?.address ?? null;
  const { main, hip3 } = useMarkets(net);
  const core = useAccount(net, user, "");
  const side = useAccount(net, user && m?.dex ? user : null, m?.dex ?? "");
  const fillsQ = useFills(net, user);
  const [tab, setTab] = useState<"pos" | "ord" | "fill">("pos");
  const [busy, setBusy] = useState<string | null>(null);

  const positions = [...(core.account?.positions ?? []), ...(side.account?.positions ?? [])];
  const orders = [...core.orders, ...side.orders];
  const fills = fillsQ.data ?? [];
  const find = (coin: string) => main.find((x) => x.key === coin) ?? hip3.find((x) => x.key === coin);

  async function close(p: Position) {
    const mk = find(p.coin);
    if (!mk) return toast("Pasar tidak ditemukan.", "blood");
    if (!agent) {
      await enableTrading();
      return;
    }
    setBusy(`p${p.coin}`);
    const r = await placeOrder({
      net,
      agent,
      m: mk,
      isBuy: p.szi < 0,
      size: Math.abs(p.szi),
      px: mk.mid || mk.mark,
      market: true,
      reduceOnly: true,
    });
    toast(r.ok ? `Posisi ${mk.base} ditutup · ${r.msg}` : r.msg, r.ok ? "mint" : "blood");
    setBusy(null);
    core.refresh();
    side.refresh();
  }

  async function cancel(o: OpenOrder) {
    const mk = find(o.coin);
    if (!mk) return toast("Pasar tidak ditemukan.", "blood");
    if (!agent) {
      await enableTrading();
      return;
    }
    setBusy(`o${o.oid}`);
    const r = await cancelOrder(net, agent, mk.asset, o.oid);
    toast(r.msg, r.ok ? "mint" : "blood");
    setBusy(null);
    core.refresh();
    side.refresh();
  }

  const tabs = [
    ["pos", `Posisi${wallet ? ` (${positions.length})` : ""}`],
    ["ord", `Order terbuka${wallet ? ` (${orders.length})` : ""}`],
    ["fill", "Riwayat trade"],
  ] as const;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-2">
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative whitespace-nowrap px-2.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                tab === k ? "text-bone" : "text-dim hover:text-bone"
              }`}
            >
              {l}
              {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-amber" />}
            </button>
          ))}
        </div>
        {wallet && !agent && (
          <button onClick={enableTrading} className="shrink-0 rounded-lg bg-amber/15 px-2.5 py-1 text-[11.5px] font-medium text-amber">
            Aktifkan trading
          </button>
        )}
      </div>

      {!wallet ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-dim" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path d="M2 4.5h10a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H2zM11 9.25h1" strokeLinecap="round" />
            </svg>
          </span>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-dim">
            Hubungkan dompet untuk melihat posisi, order terbuka, dan riwayat trade langsung dari HyperCore.
          </p>
          <button onClick={connect} className="rounded-xl bg-amber px-4 py-2 text-[12.5px] font-semibold text-ink">
            Hubungkan dompet
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {tab === "pos" && (
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-left">
                  {["Koin", "Ukuran", "Nilai posisi", "Harga masuk", "Mark", "PnL (ROE)", "Likuidasi", "Margin", ""].map((h, i) => (
                    <th key={i} className={`${TH} ${i > 0 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-[12.5px] text-dim">
                      Belum ada posisi terbuka.
                    </td>
                  </tr>
                )}
                {positions.map((p) => {
                  const mk = find(p.coin);
                  const dd = mk?.szDecimals ?? 2;
                  return (
                    <tr key={p.coin} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className={TD}>
                        <span className="flex items-center gap-2">
                          <Glyph name={p.coin} size={20} />
                          <span className="font-medium">{mk?.base ?? p.coin}</span>
                          <span
                            className={`rounded px-1 text-[10px] ${p.szi > 0 ? "bg-mint/12 text-mint" : "bg-blood/12 text-blood"}`}
                          >
                            {p.szi > 0 ? "Long" : "Short"} {p.lev}×
                          </span>
                        </span>
                      </td>
                      <td className={`${TD} num text-right ${p.szi > 0 ? "text-mint" : "text-blood"}`}>{fmtSz(p.szi, dd)}</td>
                      <td className={`${TD} num text-right`}>{fmt.usd(p.value, 2)}</td>
                      <td className={`${TD} num text-right`}>{fmtPx(p.entry, dd)}</td>
                      <td className={`${TD} num text-right`}>{mk ? fmtPx(mk.mark, dd) : "—"}</td>
                      <td className={`${TD} num text-right ${p.upnl >= 0 ? "text-mint" : "text-blood"}`}>
                        {p.upnl >= 0 ? "+" : "−"}
                        {fmt.usd(Math.abs(p.upnl), 2)} <span className="opacity-70">({fmt.pct(p.roe)})</span>
                      </td>
                      <td className={`${TD} num text-right text-blood/90`}>{p.liq ? fmtPx(p.liq, dd) : "—"}</td>
                      <td className={`${TD} num text-right`}>{fmt.usd(p.margin, 2)}</td>
                      <td className={`${TD} text-right`}>
                        <button
                          disabled={busy === `p${p.coin}`}
                          onClick={() => close(p)}
                          className="rounded-md border border-white/10 px-2.5 py-1 text-[11.5px] transition-colors hover:border-white/25 disabled:opacity-50"
                        >
                          {busy === `p${p.coin}` ? "Menutup…" : "Tutup market"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "ord" && (
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-left">
                  {["Waktu", "Koin", "Tipe", "Arah", "Harga", "Ukuran", "Terisi", ""].map((h, i) => (
                    <th key={i} className={`${TH} ${i > 3 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-[12.5px] text-dim">
                      Tidak ada order terbuka.
                    </td>
                  </tr>
                )}
                {orders.map((o) => {
                  const mk = find(o.coin);
                  const dd = mk?.szDecimals ?? 2;
                  return (
                    <tr key={o.oid} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className={`${TD} text-dim`}>{when(o.time)}</td>
                      <td className={TD}>
                        <span className="flex items-center gap-2">
                          <Glyph name={o.coin} size={18} />
                          {mk?.base ?? o.coin}
                        </span>
                      </td>
                      <td className={TD}>
                        {o.type}
                        {o.reduceOnly ? " · RO" : ""}
                      </td>
                      <td className={`${TD} ${o.side === "B" ? "text-mint" : "text-blood"}`}>{o.side === "B" ? "Long" : "Short"}</td>
                      <td className={`${TD} num text-right`}>{fmtPx(o.px, dd)}</td>
                      <td className={`${TD} num text-right`}>{fmtSz(o.sz, dd)}</td>
                      <td className={`${TD} num text-right text-dim`}>{fmtSz(o.origSz - o.sz, dd)}</td>
                      <td className={`${TD} text-right`}>
                        <button
                          disabled={busy === `o${o.oid}`}
                          onClick={() => cancel(o)}
                          className="rounded-md border border-white/10 px-2.5 py-1 text-[11.5px] transition-colors hover:border-blood/40 hover:text-blood disabled:opacity-50"
                        >
                          {busy === `o${o.oid}` ? "…" : "Batalkan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "fill" && (
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-left">
                  {["Waktu", "Koin", "Arah", "Harga", "Ukuran", "Nilai", "Biaya", "PnL"].map((h, i) => (
                    <th key={i} className={`${TH} ${i > 2 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fills.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-[12.5px] text-dim">
                      Belum ada riwayat trade.
                    </td>
                  </tr>
                )}
                {fills.map((f) => {
                  const mk = find(f.coin);
                  const dd = mk?.szDecimals ?? 2;
                  return (
                    <tr key={f.tid} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className={`${TD} text-dim`}>{when(f.time)}</td>
                      <td className={TD}>{mk?.base ?? f.coin}</td>
                      <td className={`${TD} ${f.side === "B" ? "text-mint" : "text-blood"}`}>{DIR[f.dir] ?? f.dir}</td>
                      <td className={`${TD} num text-right`}>{fmtPx(f.px, dd)}</td>
                      <td className={`${TD} num text-right`}>{fmtSz(f.sz, dd)}</td>
                      <td className={`${TD} num text-right`}>{fmt.usd(f.px * f.sz, 2)}</td>
                      <td className={`${TD} num text-right text-dim`}>{fmt.usd(f.fee, 4)}</td>
                      <td className={`${TD} num text-right ${f.pnl > 0 ? "text-mint" : f.pnl < 0 ? "text-blood" : "text-dim"}`}>
                        {f.pnl ? `${f.pnl > 0 ? "+" : "−"}${fmt.usd(Math.abs(f.pnl), 2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ── direktori DEX HIP-3 (data nyata perpDexs) ─────────────── */
export function DexDirectory({ limit, compact = false }: { limit?: number; compact?: boolean }) {
  const { net, setMarketKey } = useApp();
  const { hip3, dexes } = useMarkets(net);
  const rows = useMemo(
    () =>
      dexes
        .map((d) => {
          const ms = hip3.filter((x) => x.dex === d.name);
          const top = [...ms].sort((a, b) => b.vol - a.vol)[0];
          return {
            d,
            n: ms.length,
            vol: ms.reduce((s, x) => s + x.vol, 0),
            oi: ms.reduce((s, x) => s + x.oi, 0),
            top,
          };
        })
        .filter((r) => !compact || r.n > 0)
        .sort((a, b) => (b.n > 0 ? 1 : 0) - (a.n > 0 ? 1 : 0) || b.vol - a.vol)
        .slice(0, limit ?? 99),
    [dexes, hip3, limit, compact],
  );

  if (!dexes.length)
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: limit ?? 5 }).map((_, i) => (
          <span key={i} className="skeleton block h-10 rounded-lg" />
        ))}
      </div>
    );

  return (
    <div>
      {rows.map((r) => (
        <button
          key={r.d.name}
          disabled={!r.top}
          onClick={() => {
            if (!r.top) return;
            setMarketKey(r.top.key);
            window.location.hash = "#/trade";
          }}
          className={`${r.n ? "" : "cursor-default opacity-50 "}${compact ? "flex w-full items-center justify-between gap-3 border-b border-white/[0.05] px-6 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03]" : "grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03] sm:grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr_auto]"}`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Glyph name={r.d.name} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{r.d.fullName}</span>
              <span className="num block truncate text-[11px] text-dim">
                {compact
                  ? `${r.n ? `${r.n} pasar` : "—"} · vol ${r.vol ? fmt.usd(r.vol, 0) : "—"}`
                  : `${r.d.name}: · indeks DEX ${r.d.index}`}
              </span>
            </span>
          </span>
          {!compact && (
            <>
              <span className="num hidden text-right text-[12px] text-dim sm:block">{r.n ? `${r.n} pasar` : "—"}</span>
              <span className="num hidden text-right text-[12px] sm:block">{r.vol ? fmt.usd(r.vol, 0) : "—"}</span>
              <span className="num hidden text-right text-[12px] text-dim sm:block">{r.oi ? fmt.usd(r.oi, 0) : "—"}</span>
            </>
          )}
          <span className="shrink-0 text-right text-[12px] font-medium text-amber">{r.top ? `${r.top.base} →` : hip3.length ? <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-dim">Delisted</span> : "…"}</span>
        </button>
      ))}
    </div>
  );
}
