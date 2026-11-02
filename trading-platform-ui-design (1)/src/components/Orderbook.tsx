import { useEffect, useMemo, useRef, useState } from "react";
import { Micro, Panel, Lamp, fmt } from "./ui";

type Level = { p: number; s: number };
type Trade = { t: string; s: "BUY" | "SELL"; p: number; q: number };

const TICK = 0.000003;
const MID0 = 0.002841;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function build(mid: number) {
  const bids: Level[] = [];
  const asks: Level[] = [];
  for (let i = 0; i < 8; i++) {
    bids.push({ p: mid - TICK * (i + 1), s: rnd(1800, 62000) });
    asks.push({ p: mid + TICK * (i + 1), s: rnd(1800, 62000) });
  }
  return { bids, asks };
}

export default function Orderbook({ ticker }: { ticker: string }) {
  const [mid, setMid] = useState(MID0);
  const [book, setBook] = useState(() => build(MID0));
  const [tape, setTape] = useState<Trade[]>([]);
  const [qty, setQty] = useState(250);
  const [flash, setFlash] = useState<"B" | "S" | null>(null);
  const [vol, setVol] = useState(1_392_400);
  const [reduce, setReduce] = useState(false);
  const midRef = useRef(MID0);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    if (m.matches) return;

    const id = setInterval(() => {
      const drift = Math.random() < 0.28 ? TICK * (Math.random() < 0.5 ? -1 : 1) : 0;
      const next = midRef.current + drift;
      midRef.current = next;
      setMid(next);

      const b = build(next);
      setBook({
        bids: b.bids.map((l, i) => ({ ...l, s: rnd(1500, 64000 - i * 3000) })),
        asks: b.asks.map((l, i) => ({ ...l, s: rnd(1500, 64000 - i * 3000) })),
      });

      if (Math.random() < 0.55) {
        setTape((t) =>
          [
            {
              t: new Date().toLocaleTimeString("id-ID", { hour12: false }),
              s: (Math.random() < 0.5 ? "BUY" : "SELL") as Trade["s"],
              p: next,
              q: Math.round(rnd(15, 3400)),
            },
            ...t,
          ].slice(0, 12),
        );
        setVol((v) => v + rnd(400, 6400));
      }
    }, 460);
    return () => clearInterval(id);
  }, []);

  const spread = TICK * 2;
  const spreadBps = (spread / mid) * 10000;

  const rows = useMemo(() => {
    const asks = [...book.asks].reverse();
    const bidRows: (Level & { cum: number })[] = [];
    const askRows: (Level & { cum: number })[] = [];
    let c = 0;
    book.bids.forEach((l) => {
      c += l.s;
      bidRows.push({ ...l, cum: c });
    });
    c = 0;
    asks.forEach((l) => {
      c += l.s;
      askRows.push({ ...l, cum: c });
    });
    const max = Math.max(bidRows.at(-1)?.cum ?? 1, askRows.at(-1)?.cum ?? 1);
    return { bidRows, askRows, max };
  }, [book]);

  function place(side: "BUY" | "SELL") {
    const px = side === "BUY" ? mid + TICK : mid - TICK;
    setTape((t) =>
      [
        { t: new Date().toLocaleTimeString("id-ID", { hour12: false }), s: side, p: px, q: qty },
        ...t,
      ].slice(0, 12),
    );
    setVol((v) => v + qty * px);
    setBook((b) => ({
      bids:
        side === "BUY"
          ? b.bids.map((l, i) => (i === 0 ? { ...l, s: l.s + qty * 40 } : l))
          : b.bids,
      asks:
        side === "SELL"
          ? b.asks.map((l, i) => (i === 0 ? { ...l, s: l.s + qty * 40 } : l))
          : b.asks,
    }));
    setFlash(side === "BUY" ? "B" : "S");
    setTimeout(() => setFlash(null), 600);
  }

  return (
    <section className="relative">
      <div className="mx-auto w-full">

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* ── the book ─────────────────────────── */}
          <Panel className="p-4 pt-9 md:p-6 md:pt-11">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-edge pb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="lamp-on absolute inline-flex h-2 w-2 rounded-full bg-amber" />
                </span>
                <span className="font-mono text-lg font-bold tracking-tight">
                  grvd:<span className="text-amber">{ticker}</span>
                </span>
                <Micro className="text-dim">HYPERCORE · CLOB ON-CHAIN</Micro>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <Micro className="text-dim">VOL 24J</Micro>
                  <div className="tnum font-mono text-[13px]">{fmt.usd(vol, 0)}</div>
                </div>
                <div className="text-right">
                  <Micro className="text-dim">SPREAD</Micro>
                  <div className="tnum font-mono text-[13px] text-mint">
                    {fmt.n(spreadBps, 1)} bps
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between px-1">
              <Micro className="text-dim">HARGA ({ticker}/USD)</Micro>
              <Micro className="text-dim">UKURAN (TKN)</Micro>
              <Micro className="text-dim hidden sm:block">AKUMULASI</Micro>
            </div>

            <div className="mt-2 space-y-px">
              {rows.askRows.map((l, i) => (
                <BookRow key={`a${i}`} l={l} max={rows.max} side="ask" />
              ))}

              <div className="my-2 flex items-center justify-between border-y border-edge bg-[#080b0e] px-3 py-3">
                <div>
                  <span className="tnum font-mono text-2xl font-bold text-bone">
                    {fmt.price(mid)}
                  </span>
                  <Micro className="ml-3 text-dim">
                    ≈ {fmt.usd(mid * 1000000000, 0)} MCAP
                  </Micro>
                </div>
                <Lamp on color="mint" className={reduce ? "" : "animate-blink"} />
              </div>

              {rows.bidRows.map((l, i) => (
                <BookRow key={`b${i}`} l={l} max={rows.max} side="bid" />
              ))}
            </div>
          </Panel>

          {/* ── ticket + tape ─────────────────────── */}
          <div className="space-y-6">
            <Panel className="p-6 pt-10">
              <div className="flex items-center justify-between">
                <Micro className="text-dim">TIKET ORDER · SPOT</Micro>
                <Micro className="text-mint">SALDO 12.480 USDC</Micro>
              </div>

              <label className="mt-5 block border-b border-edge pb-2 focus-within:border-amber">
                <Micro className="text-dim">JUMLAH (USDC)</Micro>
                <input
                  type="number"
                  value={qty}
                  min={10}
                  onChange={(e) => setQty(Math.max(10, Number(e.target.value) || 0))}
                  className="tnum mt-2 w-full bg-transparent font-mono text-3xl font-bold text-bone outline-none"
                />
              </label>

              <div className="mt-3 flex gap-2">
                {[100, 250, 1000, "MAKS"].map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setQty(v === "MAKS" ? 12480 : (v as number))}
                    className="flex-1 border border-edge bg-[#1a2026] py-2 font-mono text-[10px] tracking-[0.16em] text-dim transition-colors hover:border-bone hover:text-bone"
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => place("BUY")}
                  className={`py-4 font-mono text-[12px] font-bold tracking-[0.18em] transition-all ${
                    flash === "B"
                      ? "bg-mint text-ink"
                      : "border border-mint bg-mint/10 text-mint hover:bg-mint hover:text-ink"
                  }`}
                >
                  BELI
                </button>
                <button
                  onClick={() => place("SELL")}
                  className={`py-4 font-mono text-[12px] font-bold tracking-[0.18em] transition-all ${
                    flash === "S"
                      ? "bg-blood text-ink"
                      : "border border-blood bg-blood/10 text-blood hover:bg-blood hover:text-ink"
                  }`}
                >
                  JUAL
                </button>
              </div>

              <div className="tnum mt-5 grid grid-cols-2 gap-y-3 border-t border-edge pt-4">
                <Micro className="text-dim">EST. TOKEN</Micro>
                <span className="text-right font-mono text-[12px]">
                  {fmt.n(qty / mid, 0)}
                </span>
                <Micro className="text-dim">MAKER / TAKER</Micro>
                <span className="text-right font-mono text-[12px]">0,02% / 0,045%</span>
              </div>
            </Panel>

            <Panel className="p-6 pt-10">
              <div className="flex items-center justify-between">
                <Micro className="text-dim">TAPE TRANSAKSI</Micro>
                <Lamp on={tape.length > 0} />
              </div>
              {tape.length === 0 ? (
                <div className="mt-4 border border-dashed border-edge px-4 py-8 text-center">
                  <Micro className="text-dim">BELUM ADA TRANSAKSI</Micro>
                  <p className="mt-2 text-[12px] leading-relaxed text-dim">
                    Buku terisi otomatis. Tekan BELI untuk menyisipkan order kamu ke antrean.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-1">
                  {tape.slice(0, 9).map((t, i) => (
                    <li
                      key={`${t.t}-${i}`}
                      className="tnum flex items-center justify-between gap-2 font-mono text-[11px]"
                      style={{ opacity: 1 - i * 0.075 }}
                    >
                      <span className="text-dim">{t.t}</span>
                      <span className={t.s === "BUY" ? "text-mint" : "text-blood"}>
                        {t.s === "BUY" ? "▲" : "▼"} {fmt.n(t.q, 0)}
                      </span>
                      <span className="text-bone/80">{fmt.price(t.p)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

function BookRow({
  l,
  max,
  side,
}: {
  l: Level & { cum: number };
  max: number;
  side: "bid" | "ask";
}) {
  const w = (l.cum / max) * 100;
  return (
    <div className="relative flex items-center justify-between px-3 py-[5px] font-mono text-[12px]">
      <div
        aria-hidden
        className={`absolute inset-y-0 right-0 transition-[width] duration-500 ${
          side === "bid" ? "bg-mint/12" : "bg-blood/12"
        }`}
        style={{ width: `${w}%` }}
      />
      <span
        className={`tnum relative z-10 ${side === "bid" ? "text-mint" : "text-blood"}`}
      >
        {fmt.price(l.p)}
      </span>
      <span className="tnum relative z-10 text-bone">{fmt.n(l.s, 0)}</span>
      <span className="tnum relative z-10 hidden w-24 text-right text-dim sm:block">
        {fmt.n(l.cum, 0)}
      </span>
    </div>
  );
}
