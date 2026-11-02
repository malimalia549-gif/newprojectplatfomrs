import { useMemo, useState } from "react";
import { Btn, fmt } from "../components/ui";
import { PriceChart } from "../components/PriceChart";
import { StageTracker, TokenAvatar } from "../components/token";
import { LAUNCHES, makeCandles } from "../lib/data";
import type { OHLC } from "../lib/hl";
import { useApp } from "../store";
import { ageLabel } from "./Launchpad";

const CURVE_W = 320;
const CURVE_H = 130;
const curveY = (x: number) => CURVE_H - Math.pow(x, 2.6) * (CURVE_H - 8);
const CURVE_PATH =
  "M" +
  Array.from({ length: 61 }, (_, i) => {
    const x = i / 60;
    return `${(x * CURVE_W).toFixed(1)},${curveY(x).toFixed(1)}`;
  }).join(" L");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function TokenPage({ ticker }: { ticker: string }) {
  const base = LAUNCHES.find((l) => l.ticker === ticker.toUpperCase());
  const { toast, spend } = useApp();
  const [raised, setRaised] = useState(base?.raised ?? 0);
  const [holders, setHolders] = useState(base?.holders ?? 0);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amt, setAmt] = useState("1");

  const seed = useMemo(() => Array.from(ticker).reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7), [ticker]);

  const candles: OHLC[] = useMemo(() => {
    if (!base) return [];
    const raw = makeCandles(seed % 997, 96, 1, 0.06);
    const k = base.price / raw[raw.length - 1].c;
    const end = Math.floor(Date.now() / 900_000) * 900_000;
    return raw.map((c, i) => ({
      t: end - (raw.length - 1 - i) * 900_000,
      o: c.o * k,
      h: c.h * k,
      l: c.l * k,
      c: c.c * k,
      v: c.v,
    }));
  }, [base, seed]);

  const activity = useMemo(() => {
    const r = lcg(seed);
    const now = Date.now();
    return Array.from({ length: 9 }, (_, i) => {
      const buy = r() > 0.32;
      const sol = 0.2 + r() * 14;
      return {
        t: now - (i * 47 + Math.floor(r() * 40)) * 1000,
        buy,
        sol,
        wallet: `0x${Math.floor(r() * 0xffff).toString(16).padStart(4, "0")}…${Math.floor(r() * 0xffff).toString(16).padStart(4, "0")}`,
      };
    });
  }, [seed]);

  const holdersList = useMemo(() => {
    const r = lcg(seed + 11);
    let left = 100;
    const rows: [string, number][] = [];
    const curveShare = base && base.status === "GRADUATED" ? 0 : 38 + r() * 20;
    if (curveShare) {
      rows.push(["Bonding curve", curveShare]);
      left -= curveShare;
    }
    for (let i = 0; i < 6; i++) {
      const v = left * (0.08 + r() * 0.1);
      rows.push([`0x${Math.floor(r() * 0xffff).toString(16).padStart(4, "0")}…${Math.floor(r() * 0xffff).toString(16).padStart(4, "0")}`, v]);
      left -= v;
    }
    return rows;
  }, [seed, base]);

  if (!base)
    return (
      <div className="wrap py-24 text-center">
        <div className="text-[13px] text-dim">Token tidak ditemukan</div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">${ticker.toUpperCase()} belum diluncurkan</h1>
        <Btn href="#/launchpad" variant="primary" className="mt-6">
          Kembali ke launchpad
        </Btn>
      </div>
    );

  const p = Math.min(1, raised / base.target);
  const graduated = base.status === "GRADUATED" || p >= 1;
  const price = base.price * (1 + ((raised - base.raised) / base.target) * 2.4);
  const mcap = price * 1_000_000_000;
  const amount = Number(amt.replace(",", ".")) || 0;
  const receive = (amount * 186) / price;

  function trade() {
    if (!base) return;
    if (graduated) {
      window.location.hash = "#/pasar";
      return;
    }
    if (!(amount > 0)) return toast("Masukkan jumlah SOL.", "amber");
    if (side === "buy") {
      const add = Math.min(amount, base.target - raised);
      setRaised((x) => x + add);
      setHolders((h) => h + 1);
      spend(-add * 4.6);
      toast(
        raised + add >= base.target
          ? `${base.ticker} mencapai target — token lulus ke Uniswap.`
          : `Beli ${fmt.n(add, 2)} SOL ${base.ticker} · kurva ${(((raised + add) / base.target) * 100).toFixed(1).replace(".", ",")}%`,
        "mint",
      );
    } else {
      setRaised((x) => Math.max(0, x - amount));
      toast(`Jual setara ${fmt.n(amount, 2)} SOL ${base.ticker}.`, "amber");
    }
  }

  const fx = p;
  const markerX = fx * CURVE_W;
  const markerY = curveY(fx);

  return (
    <div className="wrap py-6 md:py-8">
      <a href="#/launchpad" className="text-[12.5px] text-dim transition-colors hover:text-bone">
        ← Launchpad
      </a>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <TokenAvatar t={base.ticker} size={64} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-semibold tracking-[-0.035em]">{base.name}</h1>
              <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[12px] text-dim">${base.ticker}</span>
              {graduated ? (
                <span className="rounded-full bg-mint/[0.12] px-2 py-0.5 text-[11px] font-semibold text-mint">Lulus ke Uniswap</span>
              ) : (
                <span className="rounded-full bg-amber/[0.12] px-2 py-0.5 text-[11px] font-semibold text-amber">Di bonding curve</span>
              )}
            </div>
            <div className="mt-1 text-[12.5px] text-dim">
              Dibuat oleh {base.creator} · {ageLabel(base.ageMin)} lalu · kontrak 0x{seed.toString(16).slice(0, 4)}…
              {(seed * 7).toString(16).slice(-4)}
            </div>
          </div>
        </div>
        <div className="flex gap-8">
          {[
            ["Harga", `$${price.toFixed(7).replace(".", ",")}`],
            ["Market cap", fmt.usd(mcap, 0)],
            ["Holder", fmt.n(holders)],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[11.5px] text-dim">{k}</div>
              <div className="num mt-0.5 text-[18px] font-semibold tracking-[-0.02em]">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6 p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13.5px] font-semibold">Perjalanan token</span>
          <span className="text-[12px] text-dim">
            {graduated ? "Selesai — siap masuk buku pesanan HyperCore" : `${(p * 100).toFixed(1).replace(".", ",")}% menuju graduate`}
          </span>
        </div>
        <StageTracker stage={graduated ? 5 : 1} progress={p} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="text-[13px] font-semibold">Harga {base.ticker}</span>
              <span className="text-[11.5px] text-dim">15m · simulasi kurva</span>
            </div>
            <div className="p-1">
              <PriceChart data={candles} height={340} interval="15m" fmtPrice={(x) => x.toFixed(7).replace(".", ",")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">Bonding curve</span>
                <span className="num text-[12px] text-amber">{(p * 100).toFixed(1).replace(".", ",")}%</span>
              </div>
              <svg viewBox={`0 0 ${CURVE_W} ${CURVE_H}`} className="mt-4 w-full" aria-hidden>
                <defs>
                  <linearGradient id="cv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#d9ff4d" stopOpacity=".35" />
                    <stop offset="1" stopColor="#d9ff4d" stopOpacity="0" />
                  </linearGradient>
                  <clipPath id="cvclip">
                    <rect x="0" y="0" width={markerX} height={CURVE_H} />
                  </clipPath>
                </defs>
                <path d={`${CURVE_PATH} L${CURVE_W},${CURVE_H} L0,${CURVE_H} Z`} fill="url(#cv)" clipPath="url(#cvclip)" />
                <path d={CURVE_PATH} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" />
                <path d={CURVE_PATH} fill="none" stroke="#d9ff4d" strokeWidth="2" clipPath="url(#cvclip)" />
                <line x1={markerX} x2={markerX} y1={0} y2={CURVE_H} stroke="rgba(233,236,239,.25)" strokeDasharray="3 4" />
                <circle cx={markerX} cy={markerY} r="5" fill="#d9ff4d" stroke="#07090b" strokeWidth="2" />
              </svg>
              <div className="num mt-3 flex justify-between text-[11.5px] text-dim">
                <span>{fmt.n(raised, 0)} SOL terkumpul</span>
                <span>target {fmt.n(base.target)} SOL</span>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-white/[0.06] px-4 py-3 text-[13px] font-semibold">Aktivitas terbaru</div>
              <div>
                {activity.map((a, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 text-[12px]">
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${a.buy ? "bg-mint/[0.12] text-mint" : "bg-blood/[0.12] text-blood"}`}>
                      {a.buy ? "Beli" : "Jual"}
                    </span>
                    <span className="truncate font-mono text-dim">{a.wallet}</span>
                    <span className="num text-bone">{fmt.n(a.sol, 2)} SOL</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-lg py-2 text-[13px] font-semibold transition-colors ${
                    side === s ? (s === "buy" ? "bg-mint text-ink" : "bg-blood text-ink") : "text-dim hover:text-bone"
                  }`}
                >
                  {s === "buy" ? "Beli" : "Jual"}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 focus-within:border-amber/50">
              <div className="text-[11px] text-dim">Jumlah</div>
              <div className="flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  className="num w-full bg-transparent text-[18px] font-medium outline-none"
                />
                <span className="text-[12px] text-dim">SOL</span>
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              {["0,5", "1", "5", "10"].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmt(v)}
                  className="num flex-1 rounded-lg border border-white/10 py-1.5 text-[11.5px] text-dim transition-colors hover:text-bone"
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3 text-[12px]">
              <div className="flex justify-between">
                <span className="text-dim">Anda menerima ≈</span>
                <span className="num">
                  {fmt.n(receive, 0)} {base.ticker}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dim">Dampak harga</span>
                <span className="num">{((amount / base.target) * 240).toFixed(2).replace(".", ",")}%</span>
              </div>
            </div>
            <button
              onClick={trade}
              className={`mt-4 w-full rounded-xl py-3 text-[13.5px] font-semibold text-ink transition-all hover:brightness-105 ${
                graduated ? "bg-amber" : side === "buy" ? "bg-mint" : "bg-blood"
              }`}
            >
              {graduated ? "Token sudah lulus — buka market" : `${side === "buy" ? "Beli" : "Jual"} ${base.ticker} (simulasi)`}
            </button>
            <p className="mt-2 text-center text-[11px] text-dim">Kurva disimulasikan — kontrak launchpad belum terhubung.</p>
          </div>

          <div className="card p-4">
            <div className="text-[13px] font-semibold">{graduated ? "Langkah berikutnya" : "Setelah lulus"}</div>
            <div className="mt-3 space-y-2">
              {[
                ["Uniswap pool", "LP terkunci 365 hari", graduated, "#/pipeline"],
                ["Beli ticker → HyperCore orderbook", "Buku pesanan on-chain", false, "#/pasar"],
                ["HIP-3 perp", "Kontrak perpetual oleh deployer", false, "#/hip-3"],
              ].map(([t, s, done, href]) => (
                <a
                  key={String(t)}
                  href={String(href)}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/15"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                      done ? "bg-mint text-ink" : "border border-white/15 text-dim"
                    }`}
                  >
                    {done ? "✓" : "→"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium">{t}</span>
                    <span className="block text-[11px] text-dim">{s}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Distribusi holder</span>
              <span className="num text-[11.5px] text-dim">{fmt.n(holders)} total</span>
            </div>
            <div className="mt-3 space-y-2">
              {holdersList.map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-[12px]">
                    <span className={k === "Bonding curve" ? "text-amber" : "font-mono text-dim"}>{k}</span>
                    <span className="num">{v.toFixed(2).replace(".", ",")}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${k === "Bonding curve" ? "bg-amber" : "bg-white/30"}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
