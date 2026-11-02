import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bookmark, Info, Users } from "lucide-react";
import { PriceChart } from "@/components/Charts";
import { AssetMark, Change, DemoLabel, InlineNotice, ProgressTrack, Status, Toast } from "@/components/UI";
import { useDemo } from "@/context/DemoContext";
import { BASE_PERPS, compact, money, priceFormat } from "@/lib/market";
import { cn } from "@/utils/cn";

const timeframes = ["1H", "4H", "1D", "1W"];

export default function AssetDetail() {
  const { symbol = "" } = useParams();
  const { assets, favorites, toggleFavorite, balance, holdings, spotTrades, tradeSpot, simulateCommunity } = useDemo();
  const asset = assets.find((item) => item.symbol === symbol.toUpperCase());
  const [timeframe, setTimeframe] = useState("1H");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState<"overview" | "activity">("overview");
  const [notice, setNotice] = useState({ message: "", tone: "success" as "success" | "error" });

  if (!asset) {
    return <div className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-10"><div className="eyebrow">Market tidak ditemukan</div><h1 className="display mt-5 text-5xl font-semibold">Ticker ini belum ada.</h1><Link to="/launchpad" className="button-plain mt-8">Kembali ke launchpad <ArrowRight size={16} /></Link></div>;
  }

  const owned = holdings[asset.symbol] ?? 0;
  const value = Number(amount) || 0;
  const estimate = side === "buy" ? value / asset.price : value * asset.price;
  const graduated = asset.status === "graduated";
  const availablePerp = BASE_PERPS.some((item) => item.symbol === asset.symbol);
  const trades = spotTrades.filter((trade) => trade.symbol === asset.symbol);
  const favorite = favorites.includes(asset.symbol);

  const submit = () => {
    const result = tradeSpot(asset.symbol, side, value);
    setNotice({ message: result.message, tone: result.ok ? "success" : "error" });
    if (result.ok) setAmount("");
  };

  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-8 pb-24 sm:px-8 lg:px-10">
      <nav className="flex items-center gap-2 font-mono text-[10px] text-faint" aria-label="Breadcrumb">
        <Link to="/launchpad" className="flex items-center gap-1.5 transition-colors hover:text-accent"><ArrowLeft size={13} /> Launchpad</Link>
        <span className="text-line">/</span><span className="text-muted">{asset.symbol}</span>
      </nav>

      <div className="mt-8 flex flex-col gap-5 border-b border-line-soft pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AssetMark symbol={asset.symbol} color={asset.color} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="display text-[clamp(1.7rem,3vw,2.7rem)] font-semibold">{asset.name}</h1>
              <Status graduated={graduated} />
            </div>
            <div className="mt-1 font-mono text-[11px] text-faint">{asset.symbol} / USDC <span className="mx-2 text-line">/</span> {asset.category}</div>
          </div>
          <button
            onClick={() => toggleFavorite(asset.symbol)}
            aria-label={favorite ? "Hapus dari watchlist" : "Simpan ke watchlist"}
            aria-pressed={favorite}
            className={cn("ml-2 grid h-9 w-9 place-items-center border transition-colors", favorite ? "border-accent/50 text-accent" : "border-line text-faint hover:text-text")}
          >
            <Bookmark size={16} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="sm:text-right">
          <div className="nums font-mono text-[26px] font-semibold tracking-[-.05em] text-text">{priceFormat(asset.price)}</div>
          <div className="mt-1 flex items-center gap-2 sm:justify-end"><Change value={asset.change} /><span className="font-mono text-[10px] text-faint">24 jam</span></div>
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <div className="border border-line bg-base-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-3"><span className="text-[12px] font-bold">{asset.symbol} / USDC</span><DemoLabel compact /></div>
              <div className="flex gap-1">
                {timeframes.map((item) => <button key={item} onClick={() => setTimeframe(item)} className={cn("rounded px-2.5 py-1.5 font-mono text-[10px] transition-colors", timeframe === item ? "bg-surface-2 text-accent" : "text-faint hover:text-text")}>{item}</button>)}
              </div>
            </div>
            <PriceChart price={asset.price} seed={asset.seed} timeframe={timeframe} className="h-[310px] sm:h-[380px]" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
            {[
              ["Market cap", compact(asset.marketCap)],
              ["Volume 24 jam", compact(asset.volume)],
              ["Pemegang", asset.holders.toLocaleString("en-US")],
              ["Fase", graduated ? "Graduated" : "Bonding"],
            ].map(([label, number]) => (
              <div key={label} className="bg-base-2 px-4 py-4">
                <div className="micro text-faint">{label}</div>
                <div className="nums mt-2 font-mono text-[15px] font-semibold text-text">{number}</div>
              </div>
            ))}
          </div>

        </div>

        <aside className="xl:sticky xl:top-[92px] xl:h-fit">
          <div className="border border-line bg-surface">
            <div className="flex border-b border-line">
              {(["buy", "sell"] as const).map((item) => <button key={item} onClick={() => { setSide(item); setAmount(""); }} className={cn("relative flex-1 py-4 text-[12px] font-bold transition-colors", side === item ? item === "buy" ? "text-up" : "text-down" : "text-faint hover:text-text")}>{item === "buy" ? "Beli" : "Jual"}{side === item && <span className={cn("absolute right-0 bottom-0 left-0 h-[2px]", item === "buy" ? "bg-up" : "bg-down")} />}</button>)}
            </div>
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between font-mono text-[10px] text-faint"><span>Market order</span><DemoLabel compact /></div>
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px]"><label htmlFor="spot-amount" className="font-semibold text-muted">{side === "buy" ? "Jumlah pembelian" : "Jumlah penjualan"}</label><span className="nums font-mono text-faint">Tersedia {side === "buy" ? `${money(balance)} USDC` : `${owned.toFixed(2)} ${asset.symbol}`}</span></div>
                <div className="relative"><input id="spot-amount" type="number" min="0" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="field h-[50px] pr-20 font-mono text-[16px]" disabled={graduated} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] font-semibold text-muted">{side === "buy" ? "USDC" : asset.symbol}</span></div>
                <div className="mt-2.5 flex justify-end gap-2">{[25, 50, 100].map((pct) => <button key={pct} onClick={() => setAmount(String(Number(((side === "buy" ? balance : owned) * pct / 100).toFixed(side === "buy" ? 2 : 4))))} disabled={graduated} className="rounded border border-line px-2 py-1 font-mono text-[10px] text-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40">{pct === 100 ? "MAX" : `${pct}%`}</button>)}</div>
              </div>
              <div className="space-y-2.5 border-t border-line pt-4 font-mono text-[11px]"><div className="flex justify-between text-faint"><span>Harga referensi</span><span className="nums text-text">{priceFormat(asset.price)}</span></div><div className="flex justify-between text-faint"><span>Estimasi {side === "buy" ? `diterima (${asset.symbol})` : "diterima (USDC)"}</span><span className="nums text-text">{value > 0 ? side === "buy" ? estimate.toFixed(2) : money(estimate) : "--"}</span></div></div>
              {graduated ? <InlineNotice tone="info">Fase bonding selesai. Trading spot di pool tidak tersedia dalam demo ini.</InlineNotice> : <button onClick={submit} className={cn("w-full rounded-md px-4 py-3.5 text-[13px] font-extrabold transition-colors", side === "buy" ? "bg-accent text-base hover:brightness-110" : "bg-down text-base hover:brightness-110")}>{side === "buy" ? `Beli ${asset.symbol}` : `Jual ${asset.symbol}`}</button>}
              <p className="flex items-start gap-2 text-[10px] leading-[1.65] text-faint"><Info size={13} className="mt-0.5 shrink-0" />Order ini hanya mengubah saldo dan kepemilikan lokal. Tidak ada transaksi onchain.</p>
            </div>
          </div>
          {graduated && availablePerp && <Link to={`/perpetuals?market=${asset.symbol}`} className="button-secondary mt-3 w-full px-4 py-3.5">Lihat {asset.symbol}-PERP <ArrowRight size={15} /></Link>}
          {graduated && !availablePerp && <Link to="/mechanism" className="button-secondary mt-3 w-full px-4 py-3.5">Pelajari persyaratan HIP-3 <ArrowRight size={15} /></Link>}
          <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-4 font-mono text-[10px] text-faint"><span>Saldo demo</span><span className="nums text-text">{money(balance)} USDC</span></div>
        </aside>

        <div className="min-w-0">
          <div className="mt-7 border-b border-line-soft xl:mt-3">
            <div className="flex gap-7">
              {(["overview", "activity"] as const).map((item) => (
                <button key={item} onClick={() => setTab(item)} className={cn("relative pb-4 text-[12px] font-bold", tab === item ? "text-text" : "text-faint hover:text-muted")}>{item === "overview" ? "Overview" : "Aktivitas saya"}{tab === item && <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-accent" />}</button>
              ))}
            </div>
          </div>
          {tab === "overview" ? (
            <div className="grid gap-10 py-8 md:grid-cols-[1fr_.75fr]">
              <div><div className="micro text-faint">Tentang market</div><h2 className="mt-3 text-[19px] font-bold tracking-[-.04em]">{asset.name}</h2><p className="mt-3 max-w-[590px] text-[13px] leading-[1.85] text-muted">{asset.description}</p><div className="mt-6 flex gap-8 font-mono text-[11px] text-faint"><span>Kategori <b className="ml-1 font-medium text-text">{asset.category}</b></span><span>Dibuat <b className="ml-1 font-medium text-text">{asset.created}</b></span></div></div>
              <div><div className="micro text-faint">Progress graduasi</div><div className="mt-3 flex items-end justify-between"><span className="nums font-mono text-[27px] font-semibold text-text">{asset.progress.toFixed(0)}%</span><span className="font-mono text-[11px] text-muted">{graduated ? "Selesai" : "Menuju target"}</span></div><ProgressTrack value={asset.progress} className="mt-4 h-[6px]" /><p className="mt-4 text-[12px] leading-[1.75] text-muted">{graduated ? "Fase bonding selesai dalam demo. Pool spot onchain tidak dibuat." : "Progress bergerak saat pembelian demo terjadi di bonding curve. Kamu juga bisa mensimulasikan aktivitas komunitas."}</p>{!graduated && <button onClick={() => { const result = simulateCommunity(asset.symbol); setNotice({ message: result.message, tone: result.ok ? "success" : "error" }); }} className="mt-4 inline-flex items-center gap-2 border-b border-accent/50 pb-1 text-[11px] font-bold text-accent hover:border-accent"><Users size={14} /> Simulasikan aktivitas komunitas (+22%)</button>}</div>
            </div>
          ) : (
            <div className="py-7">
              {trades.length === 0 ? <div className="py-10 text-center text-[13px] text-faint">Belum ada transaksi di market ini dalam sesi demo kamu.</div> : (
                <div>
                  <div className="grid grid-cols-4 border-b border-line-soft pb-3 font-mono text-[10px] text-faint"><span>Waktu</span><span>Sisi</span><span className="text-right">Jumlah</span><span className="text-right">Total</span></div>
                  {trades.map((trade) => <div key={trade.id} className="grid grid-cols-4 items-center border-b border-line-soft py-3 font-mono text-[11px]"><span className="text-faint">{new Date(trade.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span><span className={trade.side === "buy" ? "text-up" : "text-down"}>{trade.side === "buy" ? "BUY" : "SELL"}</span><span className="nums text-right text-muted">{trade.quantity.toFixed(2)} {asset.symbol}</span><span className="nums text-right text-text">{money(trade.total)}</span></div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Toast message={notice.message} tone={notice.tone} onClose={() => setNotice((value) => ({ ...value, message: "" }))} />
    </div>
  );
}