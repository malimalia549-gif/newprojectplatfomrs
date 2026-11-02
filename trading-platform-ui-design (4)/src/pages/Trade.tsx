import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PriceChart } from "../components/PriceChart";
import { AccountPanel, AccountSummary, BookPanel, MarketBar, MarketSelector, OrderForm } from "../components/terminal";
import { fmtPx, useBook, useCandles, useHubOpen, useMarkets, useTrades } from "../lib/hl";
import { useApp } from "../store";

const TFS: [string, string][] = [
  ["1m", "1m"],
  ["5m", "5m"],
  ["15m", "15m"],
  ["1h", "1J"],
  ["4h", "4J"],
  ["1d", "1H"],
];

export default function TradePage() {
  const { net, marketKey, setMarketKey } = useApp();
  const { main, hip3 } = useMarkets(net);
  const m = useMemo(
    () =>
      main.find((x) => x.key === marketKey) ??
      hip3.find((x) => x.key === marketKey) ??
      main.find((x) => x.key === "BTC") ??
      main[0],
    [main, hip3, marketKey],
  );
  const coin = m?.key ?? null;
  const book = useBook(net, coin);
  const trades = useTrades(net, coin);
  const [tf, setTf] = useState("15m");
  const { rows, loading } = useCandles(net, coin, tf);
  const wsOpen = useHubOpen(net);
  const [sel, setSel] = useState(false);
  const [pick, setPick] = useState<{ px: number; n: number } | null>(null);

  const mid = book.bids[0] && book.asks[0] ? (book.bids[0].px + book.asks[0].px) / 2 : (m?.mid ?? 0);
  const d = m?.szDecimals ?? 2;

  return (
    <div className="term">
      <div className="t-bar tpanel relative">
        <MarketBar m={m} mid={mid} open={sel} onSelect={() => setSel((s) => !s)} />
        <AnimatePresence>
          {sel && (
            <MarketSelector
              onClose={() => setSel(false)}
              onPick={(x) => {
                setMarketKey(x.key);
                setSel(false);
                setPick(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="t-chart tpanel flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-2.5 py-1.5">
          <div className="flex items-center gap-0.5">
            {TFS.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTf(k)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  tf === k ? "bg-white/[0.08] text-bone" : "text-dim hover:text-bone"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-dim">
            <span className={`h-1.5 w-1.5 rounded-full ${wsOpen ? "bg-mint" : "bg-amber"} animate-blink`} />
            <span className="hidden sm:inline">{wsOpen ? "Realtime · WebSocket" : "Menyambung…"}</span>
            <span className="sm:hidden">{wsOpen ? "Live" : "…"}</span>
            <span className="hidden text-edge sm:inline">|</span>
            <span className="hidden sm:inline">{net === "mainnet" ? "HyperCore mainnet" : "HyperCore testnet"}</span>
          </div>
        </div>
        <div className="min-h-0 flex-1 pl-1 pt-1">
          <PriceChart data={rows} interval={tf} loading={loading} fmtPrice={(p) => fmtPx(p, d)} />
        </div>
      </div>

      <div className="t-book tpanel overflow-hidden">
        <BookPanel
          m={m}
          bids={book.bids}
          asks={book.asks}
          trades={trades}
          onPick={(px) => setPick((p) => ({ px, n: (p?.n ?? 0) + 1 }))}
        />
      </div>

      <div className="t-form">
        <OrderForm m={m} mid={mid} pick={pick} />
        <AccountSummary />
      </div>

      <div className="t-acct tpanel overflow-hidden">
        <AccountPanel m={m} />
      </div>
    </div>
  );
}
