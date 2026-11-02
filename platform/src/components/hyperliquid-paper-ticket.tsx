"use client";

import { useEffect, useState } from "react";
import { Badge, Btn, Field, Input } from "@/components/ui";
import { closePaper, emptyPaperAccount, openPaper, paperPnl, validPaperAccount, type PaperAccount } from "@/lib/paper-trading";
import { fmtUsd } from "@/lib/util";

const KEY = "forge.hyperliquid.paper.v1";
export function HyperliquidPaperTicket({ coin, kind, mark, fresh, maxLeverage }: { coin: string | null; kind: "spot" | "perp"; mark: number; fresh: boolean; maxLeverage: number }) {
  const [account, setAccount] = useState<PaperAccount>(emptyPaperAccount);
  const [ready, setReady] = useState(false);
  const [margin, setMargin] = useState("100");
  const [leverage, setLeverage] = useState("1");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
        if (validPaperAccount(stored)) setAccount(stored);
      } catch { /* Storage is optional; trading still works in memory. */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const commit = (next: PaperAccount) => {
    setAccount(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* In-memory mode. */ }
  };
  const execute = () => {
    setError("");
    if (!coin || !fresh || !ready) { setError("Fresh live price required."); return; }
    try {
      const lev = kind === "spot" ? 1 : Number(leverage);
      if (lev > maxLeverage) throw new Error("Leverage exceeds this market's limit.");
      commit(openPaper(account, { id: crypto.randomUUID(), coin, kind, side: kind === "spot" ? "buy" : side, entry: mark, margin: Number(margin), leverage: lev }));
    } catch (e) { setError(e instanceof Error ? e.message : "Paper order failed."); }
  };
  return <>
    <div className="ex-ticket-head"><h2>Paper order</h2><Badge tone="gold">SIMULATED FUNDS</Badge></div>
    <div className="p-4 text-sm leading-7 text-[#4f644a]">
      <p>Harga asli Hyperliquid. Saldo latihan lokal, bukan USDC nyata; tidak dikirim ke bursa.</p>
      <div className="ex-summary mt-3">
        <div className="ex-summary-row"><span>Available paper USD</span><strong data-testid="paper-cash">{fmtUsd(account.cash)}</strong></div>
        <div className="ex-summary-row"><span>Instrument</span><strong>{coin ?? "—"}</strong></div>
        <div className="ex-summary-row"><span>Live mark</span><strong>{fmtUsd(mark)}</strong></div>
      </div>
      {kind === "perp" ? <div className="ex-mode-switch mt-3" role="group" aria-label="Paper direction">
        <button type="button" data-active={side === "buy"} onClick={() => setSide("buy")}>Long</button>
        <button type="button" data-active={side === "sell"} onClick={() => setSide("sell")}>Short</button>
      </div> : null}
      <div className="mt-3"><Field label={kind === "spot" ? "Paper spend (USD)" : "Paper margin (USD)"}><Input type="number" value={margin} onChange={setMargin} /></Field></div>
      {kind === "perp" ? <div className="mt-3"><Field label={`Leverage (1–${Math.min(20, maxLeverage)}x)`}><Input type="number" value={leverage} onChange={setLeverage} step="1" /></Field></div> : null}
      <Btn full className="mt-3" disabled={!ready || !fresh || !coin} onClick={execute}>Place paper {kind === "spot" ? "buy" : side === "buy" ? "long" : "short"}</Btn>
      {!fresh ? <p role="status">Order paused: waiting for fresh live data.</p> : null}
      {error ? <p role="alert" className="text-down">{error}</p> : null}
      <p className="mt-3 text-xs">Instant mark-price fills only. No fees, slippage, funding, automatic liquidation or stop orders. Loss capped at margin on close. Stored in this browser; separate from Launchpad demo balances.</p>
      <h3 className="mt-4 font-semibold">Paper positions · {coin ?? "—"}</h3>
      {account.positions.filter(p => p.coin === coin && p.kind === kind).map(p => <div key={p.id} className="ex-summary mt-2">
        <div>{p.side === "buy" ? "Long / Buy" : "Short"} · {p.leverage}x · margin {fmtUsd(p.margin)}</div>
        <div>PnL {fresh ? fmtUsd(paperPnl(p, mark)) : "— (stale price)"}</div>
        <Btn size="sm" variant="outline" disabled={!fresh} onClick={() => { try { commit(closePaper(account, p.id, mark)); } catch (e) { setError(String(e)); } }}>Close paper position</Btn>
      </div>)}
      {account.positions.some(p => p.coin !== coin || p.kind !== kind) ? <p className="text-xs mt-2">Other positions: {account.positions.filter(p => p.coin !== coin || p.kind !== kind).map(p => p.coin).join(", ")}. Select that market to close at its live price.</p> : null}
    </div>
  </>;
}
