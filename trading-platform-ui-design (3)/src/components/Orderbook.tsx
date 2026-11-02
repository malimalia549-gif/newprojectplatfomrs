import { useEffect, useMemo, useState } from "react";
import { Btn, Card, Lamp, Micro, Pill, fmt } from "./ui";
import { DepthChart } from "./charts";
import {
  accountUsdc,
  connectWallet,
  hasWallet,
  placeOrder,
  shortAddr,
  useL2,
  useLiveMarkets,
  type LiveMarket,
} from "../lib/hypercore";
import { MARKETS, makeFills, type Fill } from "../lib/data";
import { useApp } from "../store";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/* ── simulated fallback book ───────────────────────────────── */
function simBook(mid: number) {
  const TICK = mid * 0.0006;
  const bids = Array.from({ length: 8 }, (_, i) => ({ px: mid - TICK * (i + 1), sz: rnd(1800, 62000 - i * 3000) }));
  const asks = Array.from({ length: 8 }, (_, i) => ({ px: mid + TICK * (i + 1), sz: rnd(1800, 62000 - i * 3000) }));
  return { bids, asks };
}

export default function Orderbook({ ticker }: { ticker: string }) {
  const { toast } = useApp();
  const { markets: live, live: dataLive } = useLiveMarkets();
  const [mode, setMode] = useState<"LIVE" | "SIM">("LIVE");

  const real: LiveMarket | undefined = useMemo(
    () => live.find((m) => m.coin.toUpperCase() === ticker.toUpperCase()),
    [live, ticker],
  );
  const mock = MARKETS.find((m) => m.pair === `grvd:${ticker}`) ?? MARKETS[0];
  const mid = real?.price ?? mock.price;

  const { bids: liveBids, asks: liveAsks, live: bookLive } = useL2(dataLive && mode === "LIVE" ? (real?.coin ?? null) : null);

  /* simulated layer — always running so the book never looks dead */
  const [sim, setSim] = useState(() => simBook(mid));
  const [tape, setTape] = useState<Fill[]>(() => makeFills(137, 9));
  useEffect(() => {
    setSim(simBook(mid));
  }, [mid]);
  useEffect(() => {
    const id = setInterval(() => {
      setSim(simBook(mid));
      setTape(makeFills(Date.now() % 9973, 9));
    }, 2600);
    return () => clearInterval(id);
  }, [mid]);

  const useLiveBook = mode === "LIVE" && bookLive && liveBids.length > 0;
  const bids = useLiveBook ? liveBids : sim.bids;
  const asks = useLiveBook ? liveAsks : sim.asks;
  const bestBid = bids[0]?.px ?? mid;
  const bestAsk = asks[0]?.px ?? mid;
  const spread = Math.max(0, bestAsk - bestBid);
  const depth = useMemo(() => {
    const cum = (arr: typeof bids) => {
      let s = 0;
      return arr.map((l) => (s += l.sz));
    };
    const b = cum(bids);
    const a = cum(asks);
    return { b, a, max: Math.max(b.at(-1) ?? 1, a.at(-1) ?? 1) };
  }, [bids, asks]);


  return (
    <section className="relative">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* ── the book ─────────────────────────────── */}
        <Card
          title={`Buku · ${real ? real.coin : ticker}/USDC`}
          kicker={useLiveBook ? "HYPERCORE L2 · LANGSUNG" : "SIMULASI"}
          tools={
            <div className="flex items-center gap-2">
              <Pill active={mode === "LIVE"} onClick={() => setMode("LIVE")} tone="mint">
                Live
              </Pill>
              <Pill active={mode === "SIM"} onClick={() => setMode("SIM")}>
                Sim
              </Pill>
              <Lamp on={useLiveBook} color={useLiveBook ? "mint" : "amber"} pulse />
            </div>
          }
          bodyClass="p-4"
        >
          <div className="mb-3 flex justify-between px-1">
            <Micro className="text-dim">HARGA</Micro>
            <Micro className="text-dim">UKURAN</Micro>
            <Micro className="hidden text-dim sm:block">AKUMULASI</Micro>
          </div>

          <div className="space-y-px">
            {[...asks].reverse().map((l, i) => (
              <Row key={`a${i}`} l={l} cum={depth.a[asks.length - 1 - i] ?? 0} max={depth.max} side="ask" />
            ))}

            <div className="my-2 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-baseline gap-3">
                <span className="tnum font-mono text-xl font-semibold text-bone">{fmt.price(mid)}</span>
                <span className="tnum font-mono text-[11px] text-dim">spread {fmt.n(spread / mid * 10000, 1)} bps</span>
              </div>
              <div className="flex items-center gap-2">
                <Micro className="text-dim">{dataLive ? "12 PASAR" : "OFFLINE"}</Micro>
                <Lamp on={dataLive} color={dataLive ? "mint" : "blood"} />
              </div>
            </div>

            {bids.map((l, i) => (
              <Row key={`b${i}`} l={l} cum={depth.b[i] ?? 0} max={depth.max} side="bid" />
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <Micro className="text-dim">KEDALAMAN ±8 LEVEL</Micro>
              <Micro className="text-dim">USDC</Micro>
            </div>
            <DepthChart
              bids={bids.slice(0, 8).map((l) => l.sz)}
              asks={asks.slice(0, 8).map((l) => l.sz)}
              height={120}
            />
          </div>
        </Card>

        {/* ── execution + tape ──────────────────────── */}
        <div className="space-y-4">
          <Execution market={real} ticker={ticker} mid={mid} onResult={(m, ok) => toast(m, ok ? "mint" : "blood")} />

          <Card
            title="Tape eksekusi"
            kicker={useLiveBook ? "ARSIP PUBLIK" : "SIMULASI"}
            tools={<Lamp on pulse />}
            bodyClass="p-0"
          >
            <ul className="max-h-[240px] overflow-hidden">
              {tape.map((f, i) => (
                <li
                  key={`${f.t}-${i}`}
                  className="tnum flex items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-[7px] font-mono text-[11px] last:border-0"
                  style={{ opacity: 1 - i * 0.06 }}
                >
                  <span className="text-dim">{f.t}</span>
                  <span className="truncate text-bone/80">{f.pair}</span>
                  <span className={f.side === "BUY" ? "text-mint" : "text-blood"}>{f.side}</span>
                  <span className="text-bone">{fmt.compact(f.size)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Row({ l, cum, max, side }: { l: { px: number; sz: number }; cum: number; max: number; side: "bid" | "ask" }) {
  const w = (cum / max) * 100;
  return (
    <div className="relative flex items-center justify-between rounded-md px-3 py-[5px] font-mono text-[12px]">
      <div
        aria-hidden
        className={`absolute inset-y-0 right-0 rounded-md transition-[width] duration-500 ${
          side === "bid" ? "bg-mint/12" : "bg-blood/12"
        }`}
        style={{ width: `${w}%` }}
      />
      <span className={`tnum relative z-10 ${side === "bid" ? "text-mint" : "text-blood"}`}>{fmt.price(l.px)}</span>
      <span className="tnum relative z-10 text-bone">{fmt.n(l.sz, 2)}</span>
      <span className="tnum relative z-10 hidden w-24 text-right text-dim sm:block">{fmt.n(cum, 0)}</span>
    </div>
  );
}

/* ── real execution ticket ─────────────────────────────────── */
function Execution({
  market,
  ticker,
  mid,
  onResult,
}: {
  market?: LiveMarket;
  ticker: string;
  mid: number;
  onResult: (msg: string, ok: boolean) => void;
}) {
  const [addr, setAddr] = useState<string | null>(null);
  const [usdc, setUsdc] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [usd, setUsd] = useState(250);
  const [price, setPrice] = useState<number>(mid);
  const [lev, setLev] = useState(5);
  const [testnet, setTestnet] = useState(true);
  const [log, setLog] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => setPrice(mid), [mid]);

  const tradable = !!market;
  const size = usd / (price || mid);

  async function connect() {
    setBusy(true);
    try {
      const a = await connectWallet();
      setAddr(a);
      try {
        setUsdc(await accountUsdc(a));
      } catch {
        setUsdc(null);
      }
      onResult(`Dompet terhubung · ${shortAddr(a)}`, true);
    } catch (e) {
      onResult(e instanceof Error ? e.message : String(e), false);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!addr) return void (await connect());
    if (!market) return;
    setBusy(true);
    const res = await placeOrder({
      address: addr,
      assetIndex: market.index,
      szDecimals: market.szDecimals,
      isBuy: side === "BUY",
      price: type === "MARKET" ? (side === "BUY" ? mid * 1.03 : mid * 0.97) : price,
      size,
      isMarket: type === "MARKET",
      isTestnet: testnet,
      leverage: lev,
    });
    setLog({ ok: res.ok, msg: res.message });
    onResult(res.message, res.ok);
    setBusy(false);
    if (addr) {
      try {
        setUsdc(await accountUsdc(addr));
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <Card
      title="Tiket eksekusi"
      kicker={testnet ? "TESTNET" : "MAINNET · DANA NYATA"}
      tools={
        <div className="flex items-center gap-2">
          <Pill active={testnet} tone="mint" onClick={() => setTestnet(true)}>
            Testnet
          </Pill>
          <Pill active={!testnet} onClick={() => setTestnet(false)}>
            Mainnet
          </Pill>
        </div>
      }
      bodyClass="p-4"
    >
      {/* wallet row */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
        {addr ? (
          <>
            <span className="flex items-center gap-2.5">
              <Lamp on color="mint" />
              <span className="font-mono text-[12px] text-bone">{shortAddr(addr)}</span>
            </span>
            <span className="tnum font-mono text-[11.5px] text-dim">
              {usdc != null ? `${fmt.n(usdc, 2)} USDC` : "USDC —"}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2.5">
              <Lamp on={false} />
              <span className="text-[12.5px] text-dim">Belum terhubung ke dompet</span>
            </span>
            <Micro className="text-dim">{hasWallet() ? "SIAP" : "TAK ADA DOMPET"}</Micro>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["BUY", "SELL"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`rounded-xl border py-2.5 font-mono text-[11px] tracking-[0.16em] transition-all ${
              side === s
                ? s === "BUY"
                  ? "border-mint bg-mint/15 text-mint"
                  : "border-blood bg-blood/15 text-blood"
                : "border-white/8 text-dim hover:text-bone"
            }`}
          >
            {s === "BUY" ? "LONG" : "SHORT"}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        {(["MARKET", "LIMIT"] as const).map((t) => (
          <Pill key={t} active={type === t} onClick={() => setType(t)}>
            {t}
          </Pill>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <Micro className="text-dim">LEV</Micro>
          <span className="tnum font-mono text-[12px] text-amber">{lev}×</span>
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={market?.lev ?? 20}
        value={lev}
        onChange={(e) => setLev(Number(e.target.value))}
        className="mt-2 w-full"
        aria-label="leverage"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block border-b border-white/[0.08] pb-1.5 focus-within:border-amber">
          <Micro className="text-dim">NILAI (USDC)</Micro>
          <input
            type="number"
            value={usd}
            min={5}
            onChange={(e) => setUsd(Math.max(5, Number(e.target.value) || 0))}
            className="tnum mt-1 w-full bg-transparent font-mono text-[19px] font-semibold text-bone outline-none"
          />
        </label>
        <label className="block border-b border-white/[0.08] pb-1.5 focus-within:border-amber">
          <Micro className="text-dim">{type === "LIMIT" ? "HARGA" : "HARGA PASAR"}</Micro>
          <input
            type="number"
            value={Number(price.toFixed(price >= 100 ? 2 : 6))}
            disabled={type === "MARKET"}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="tnum mt-1 w-full bg-transparent font-mono text-[19px] font-semibold text-bone outline-none disabled:text-dim"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Micro className="text-dim">UKURAN DASAR</Micro>
        <span className="tnum font-mono text-[12px] text-bone">
          {size.toFixed(size > 100 ? 1 : 4)} {market?.coin ?? ticker}
        </span>
      </div>

      {!tradable && (
        <p className="mt-3 rounded-xl border border-amber/30 bg-amber/[0.07] px-3 py-2 text-[11.5px] leading-relaxed text-amber">
          {ticker} masih di kurva — belum punya buku HyperCore. Untuk eksekusi nyata pilih pasar
          inti seperti BTC, ETH, SOL, atau HYPE dari halaman Market.
        </p>
      )}

      <Btn variant="primary" className="mt-4 w-full" onClick={submit}>
        {busy ? "MENUNGGU TANDATANGAN…" : !addr ? "HUBUNGKAN DOMPET" : `${side} ${market?.coin ?? ticker} · ${testnet ? "TESTNET" : "MAINNET"}`}
      </Btn>

      <p className="mt-2.5 text-[11px] leading-relaxed text-dim">
        Order ditandatangani <span className="text-bone/80">EIP-712 Agent</span> oleh dompet kamu
        (chainId 1337, sumber <span className="font-mono text-bone/80">{testnet ? "b" : "a"}</span>) lalu
        dikirim ke <span className="font-mono text-bone/80">/exchange</span>. Modal berisiko —
        leverage tinggi bisa menlikuidasi dalam hitungan menit.
      </p>

      {log && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 font-mono text-[11px] leading-relaxed ${
            log.ok ? "border-mint/35 bg-mint/[0.08] text-mint" : "border-blood/35 bg-blood/[0.08] text-blood"
          }`}
        >
          {log.ok ? "✓ " : "✕ "}
          {log.msg}
        </div>
      )}    </Card>
  );
}
