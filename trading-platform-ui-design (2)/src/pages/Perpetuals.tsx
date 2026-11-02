import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Info, Search } from "lucide-react";
import { OrderBook, PriceChart } from "@/components/Charts";
import { AssetMark, Change, DemoLabel, InlineNotice, Toast } from "@/components/UI";
import { useDemo, type Position } from "@/context/DemoContext";
import { BASE_PERPS, compact, money, priceFormat } from "@/lib/market";
import { cn } from "@/utils/cn";

const timeframes = ["1H", "4H", "1D", "1W"];

function PositionRow({ position, price, onClose }: { position: Position; price: number; onClose: (id: string) => void }) {
  const pnl = (price - position.entry) * position.quantity * (position.side === "long" ? 1 : -1);
  const roi = pnl / position.margin * 100;
  return (
    <div className="grid min-w-[720px] grid-cols-[1.2fr_.7fr_.8fr_.8fr_.8fr_auto] items-center gap-4 border-b border-line-soft px-5 py-4 font-mono text-[11px] last:border-0">
      <div className="font-semibold text-text">{position.symbol}-PERP <span className={cn("ml-2 text-[10px]", position.side === "long" ? "text-up" : "text-down")}>{position.side.toUpperCase()} {position.leverage}x</span></div>
      <span className="nums text-muted">{money(position.margin)}</span>
      <span className="nums text-muted">{priceFormat(position.entry)}</span>
      <span className="nums text-text">{priceFormat(price)}</span>
      <span className={cn("nums", pnl >= 0 ? "text-up" : "text-down")}>{pnl >= 0 ? "+" : ""}{money(pnl)} <span className="text-faint">({roi.toFixed(2)}%)</span></span>
      <button onClick={() => onClose(position.id)} className="rounded border border-line px-3 py-1.5 text-faint transition-colors hover:border-down/50 hover:text-down">Tutup</button>
    </div>
  );
}

export default function Perpetuals() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("market")?.toUpperCase();
  const market = BASE_PERPS.find((item) => item.symbol === requested) ?? BASE_PERPS[0];
  const { balance, quotes, positions, placeOrder, closePosition } = useDemo();
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState("1H");
  const [side, setSide] = useState<"long" | "short">("long");
  const [margin, setMargin] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [notice, setNotice] = useState({ message: "", tone: "success" as "success" | "error" });

  useEffect(() => { setLeverage(Math.min(5, market.leverage)); setMargin(""); setPicker(false); }, [market.symbol, market.leverage]);

  const price = quotes[market.symbol] ?? market.price;
  const numericMargin = Number(margin) || 0;
  const notional = numericMargin * leverage;
  const quantity = price > 0 ? notional / price : 0;
  const liquidation = price * (side === "long" ? (1 - .9 / leverage) : (1 + .9 / leverage));
  const filtered = BASE_PERPS.filter((item) => `${item.symbol} ${item.name}`.toLowerCase().includes(query.toLowerCase()));

  const submit = () => {
    const result = placeOrder(market.symbol, side, numericMargin, leverage);
    setNotice({ message: result.message, tone: result.ok ? "success" : "error" });
    if (result.ok) setMargin("");
  };

  const close = (id: string) => {
    const result = closePosition(id);
    setNotice({ message: result.message, tone: result.ok ? "success" : "error" });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-7 pb-24 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div><div className="eyebrow">Perpetuals / Trading terminal</div><h1 className="display mt-2 text-[clamp(1.7rem,3vw,2.7rem)] font-semibold">Pasar dalam satu tampilan.</h1></div>
        <div className="flex items-center gap-3"><DemoLabel /><span className="h-5 w-px bg-line" /><span className="nums font-mono text-[11px] text-muted">Saldo {money(balance)} USDC</span></div>
      </div>

      <div className="border border-line bg-base-2">
        <div className="flex flex-col border-b border-line lg:flex-row lg:items-center">
          <div className="relative min-w-[245px] border-b border-line lg:border-r lg:border-b-0">
            <button onClick={() => setPicker((value) => !value)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-surface">
              <AssetMark symbol={market.symbol} color={market.color} size="sm" />
              <span className="flex-1"><span className="block text-[13px] font-extrabold text-text">{market.symbol}-PERP</span><span className="mt-0.5 block font-mono text-[10px] text-faint">{market.category} · {market.name}</span></span>
              <ChevronDown size={15} className={cn("text-muted transition-transform", picker && "rotate-180")} />
            </button>
            {picker && (
              <div className="absolute top-full left-0 z-40 w-[min(360px,calc(100vw-32px))] rounded-b-xl border border-line bg-surface-2 shadow-[0_25px_60px_#000a]">
                <label className="relative block border-b border-line p-3"><Search size={14} className="absolute top-1/2 left-6 -translate-y-1/2 text-faint" /><input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Cari market" className="field h-9 pl-9 text-[12px]" /></label>
                <div className="max-h-[340px] overflow-y-auto">
                  {filtered.map((item) => <button key={item.symbol} onClick={() => { setParams({ market: item.symbol }); setPicker(false); setQuery(""); }} className={cn("flex w-full items-center gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2", item.symbol === market.symbol && "bg-surface-2")}><AssetMark symbol={item.symbol} color={item.color} size="sm" /><span className="flex-1 text-[12px] font-bold text-text">{item.symbol}-PERP <span className="ml-1 font-mono text-[10px] font-normal text-faint">{item.category}</span></span><span className="nums font-mono text-[11px] text-muted">{priceFormat(quotes[item.symbol] ?? item.price)}</span></button>)}
                  {filtered.length === 0 && <div className="p-5 text-center text-[12px] text-muted">Market tidak ditemukan.</div>}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center gap-8 overflow-x-auto px-5 py-4 whitespace-nowrap">
            <div><div className="nums font-mono text-[22px] font-semibold tracking-[-.04em] text-text">{priceFormat(price)}</div><Change value={market.change} className="text-[10px]" /></div>
            <div className="h-8 w-px shrink-0 bg-line" />
            <div><div className="micro text-faint">24h volume</div><div className="nums mt-1 font-mono text-[12px] text-text">{compact(market.volume)}</div></div>
            <div><div className="micro text-faint">Open interest</div><div className="nums mt-1 font-mono text-[12px] text-text">{compact(market.openInterest)}</div></div>
            <div><div className="micro text-faint">Funding / 8h</div><div className={cn("nums mt-1 font-mono text-[12px]", market.funding >= 0 ? "text-up" : "text-down")}>{market.funding.toFixed(4)}%</div></div>
            <div><div className="micro text-faint">Max leverage</div><div className="nums mt-1 font-mono text-[12px] text-text">{market.leverage}x</div></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_252px_300px]">
          <div className="order-1 min-w-0 border-b border-line lg:border-r lg:border-b-0">
            <div className="flex h-[47px] items-center justify-between border-b border-line-soft px-4 sm:px-5"><span className="text-[12px] font-bold">Price chart <span className="ml-2 font-mono text-[10px] font-normal text-faint">{market.symbol} / USD</span></span><div className="flex gap-0.5">{timeframes.map((item) => <button key={item} onClick={() => setTimeframe(item)} className={cn("rounded px-2.5 py-1 font-mono text-[10px]", timeframe === item ? "bg-surface-2 text-accent" : "text-faint hover:text-muted")}>{item}</button>)}</div></div>
            <PriceChart price={price} seed={market.seed} timeframe={timeframe} className="h-[410px] xl:h-[560px]" />
          </div>

          <div className="order-3 border-b border-line lg:hidden xl:order-2 xl:block xl:border-r xl:border-b-0"><OrderBook price={price} seed={market.seed} /></div>

          <div className="order-2 bg-surface xl:order-3 xl:min-h-[560px]">
            <div className="flex border-b border-line"><button onClick={() => setSide("long")} className={cn("relative flex-1 py-[15px] text-[12px] font-bold", side === "long" ? "text-up" : "text-faint hover:text-text")}>Long{side === "long" && <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-up" />}</button><button onClick={() => setSide("short")} className={cn("relative flex-1 py-[15px] text-[12px] font-bold", side === "short" ? "text-down" : "text-faint hover:text-text")}>Short{side === "short" && <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-down" />}</button></div>
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between"><span className="text-[12px] font-bold text-text">Market order</span><span className="micro text-faint">Isolated · demo</span></div>
              <div><div className="mb-2 flex items-center justify-between text-[11px]"><label htmlFor="perp-margin" className="font-semibold text-muted">Margin</label><span className="nums font-mono text-faint">Tersedia {money(balance)}</span></div><div className="relative"><input id="perp-margin" type="number" min="0" step="any" value={margin} onChange={(event) => setMargin(event.target.value)} placeholder="0.00" className="field h-[50px] pr-[65px] font-mono text-[16px]" /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] font-bold text-muted">USDC</span></div><div className="mt-2.5 flex justify-end gap-2">{[25, 50, 100].map((pct) => <button key={pct} onClick={() => setMargin(((balance * pct / 100) || 0).toFixed(2))} className="rounded border border-line px-2 py-1 font-mono text-[10px] text-muted hover:border-accent/50 hover:text-accent">{pct === 100 ? "MAX" : `${pct}%`}</button>)}</div></div>
              <div><div className="mb-3 flex items-center justify-between text-[11px]"><label htmlFor="leverage" className="font-semibold text-muted">Leverage</label><span className="nums font-mono font-semibold text-accent">{leverage}x</span></div><input id="leverage" type="range" min="1" max={market.leverage} value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} className="range" style={{ ["--fill" as string]: `${(leverage - 1) / (market.leverage - 1) * 100}%` }} /><div className="mt-2 flex justify-between font-mono text-[10px] text-faint"><span>1x</span><span>{market.leverage}x</span></div></div>
              <div className="space-y-2.5 border-t border-line pt-4 font-mono text-[11px]"><div className="flex justify-between text-faint"><span>Ukuran posisi</span><span className="nums text-text">{notional ? money(notional) : "--"}</span></div><div className="flex justify-between text-faint"><span>Jumlah aset</span><span className="nums text-text">{quantity ? quantity.toFixed(market.price < 1 ? 2 : 5) : "--"}</span></div><div className="flex justify-between text-faint"><span>Est. harga likuidasi*</span><span className="nums text-text">{numericMargin ? priceFormat(liquidation) : "--"}</span></div></div>
              <button onClick={submit} className={cn("w-full rounded-md py-3.5 text-[13px] font-extrabold transition-colors", side === "long" ? "bg-accent text-base hover:brightness-110" : "bg-down text-base hover:brightness-110")}>Buka {side === "long" ? "Long" : "Short"} {market.symbol}</button>
              <p className="flex items-start gap-2 text-[10px] leading-[1.6] text-faint"><Info size={13} className="mt-0.5 shrink-0" />*Estimasi sederhana untuk demonstrasi. Tidak memperhitungkan fee, funding, atau pemeliharaan margin yang sebenarnya.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div className="text-[12px] font-bold text-text">Posisi terbuka <span className="ml-2 font-mono text-[10px] font-normal text-faint">{positions.length}</span></div><span className="micro text-faint">Akun simulasi</span></div>
          {positions.length === 0 ? <div className="flex min-h-[135px] flex-col items-center justify-center gap-2 px-5 text-center"><span className="text-[12px] font-semibold text-muted">Belum ada posisi.</span><span className="text-[11px] text-faint">Buka Long atau Short untuk melihat PnL demo bergerak di sini.</span></div> : (
            <div className="overflow-x-auto"><div className="grid min-w-[720px] grid-cols-[1.2fr_.7fr_.8fr_.8fr_.8fr_auto] gap-4 border-b border-line-soft px-5 py-3 font-mono text-[10px] text-faint"><span>Market</span><span>Margin</span><span>Entry</span><span>Mark</span><span>Unrealized PnL</span><span>Aksi</span></div>{positions.map((position) => <PositionRow key={position.id} position={position} price={quotes[position.symbol] ?? position.entry} onClose={close} />)}</div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><InlineNotice>Terminal ini adalah simulasi UI. Tidak ada wallet, API trading, atau eksekusi order di HyperCore yang terhubung.</InlineNotice><Link to="/mechanism" className="button-plain shrink-0">Bagaimana HIP-3 bekerja <ArrowRight size={15} /></Link></div>
      <Toast message={notice.message} tone={notice.tone} onClose={() => setNotice((value) => ({ ...value, message: "" }))} />
    </div>
  );
}