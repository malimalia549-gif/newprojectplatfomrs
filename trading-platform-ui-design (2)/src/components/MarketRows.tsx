import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { type LaunchAsset, type PerpMarket, compact, priceFormat } from "@/lib/market";
import { AssetMark, Change, ProgressTrack, Status } from "./UI";
import { Sparkline } from "./Charts";

export function LaunchTable({ assets, empty = "Tidak ada market yang cocok dengan pencarian ini." }: { assets: LaunchAsset[]; empty?: string }) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-[minmax(0,1fr)_80px_64px_16px] gap-3 border-b border-line px-4 py-3 sm:grid-cols-[minmax(175px,1.6fr)_110px_85px_85px_minmax(112px,.85fr)_18px] lg:px-6">
        <span className="micro text-faint">Asset</span>
        <span className="micro text-right text-faint">Harga</span>
        <span className="micro text-right text-faint">24 jam</span>
        <span className="micro hidden text-right text-faint sm:block">Volume</span>
        <span className="micro hidden text-right text-faint sm:block">Graduasi</span>
        <span />
      </div>
      {assets.length === 0 && <div className="px-6 py-16 text-center text-[13px] text-muted">{empty}</div>}
      {assets.map((asset) => (
        <Link
          key={asset.symbol}
          to={`/launchpad/${asset.symbol}`}
          className="market-row grid min-h-[76px] grid-cols-[minmax(0,1fr)_80px_64px_16px] items-center gap-3 border-b border-line-soft px-4 last:border-b-0 sm:grid-cols-[minmax(175px,1.6fr)_110px_85px_85px_minmax(112px,.85fr)_18px] lg:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <AssetMark symbol={asset.symbol} color={asset.color} />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-bold text-text sm:text-[13px]">{asset.name}</div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-faint">
                <span>{asset.symbol}</span><span className="text-line">/</span>
                <Status graduated={asset.status === "graduated"} />
              </div>
            </div>
          </div>
          <div className="nums text-right font-mono text-[11px] font-semibold text-text sm:text-[12px]">{priceFormat(asset.price)}</div>
          <div className="text-right"><Change value={asset.change} className="text-[10px] sm:text-[11px]" /></div>
          <div className="nums hidden text-right font-mono text-[11px] text-muted sm:block">{compact(asset.volume)}</div>
          <div className="hidden text-right sm:block">
            <div className="mb-1.5 font-mono text-[10px] text-muted">{asset.status === "graduated" ? "Complete" : `${asset.progress.toFixed(0)}%`}</div>
            <ProgressTrack value={asset.progress} className="ml-auto w-[96px]" />
          </div>
          <ArrowUpRight size={15} className="text-faint" />
        </Link>
      ))}
    </div>
  );
}

export function PerpTable({ markets, quotes }: { markets: PerpMarket[]; quotes: Record<string, number> }) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-[minmax(0,1fr)_80px_63px_16px] gap-3 border-b border-line px-4 py-3 sm:grid-cols-[minmax(175px,1.55fr)_110px_86px_100px_86px_18px] lg:px-6">
        <span className="micro text-faint">Market</span>
        <span className="micro text-right text-faint">Mark price</span>
        <span className="micro text-right text-faint">24 jam</span>
        <span className="micro hidden text-right text-faint sm:block">Volume</span>
        <span className="micro hidden text-right text-faint sm:block">Open interest</span>
        <span />
      </div>
      {markets.map((market) => (
        <Link
          key={market.symbol}
          to={`/perpetuals?market=${market.symbol}`}
          className="market-row grid min-h-[70px] grid-cols-[minmax(0,1fr)_80px_63px_16px] items-center gap-3 border-b border-line-soft px-4 last:border-b-0 sm:grid-cols-[minmax(175px,1.55fr)_110px_86px_100px_86px_18px] lg:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <AssetMark symbol={market.symbol} color={market.color} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-[12px] font-bold text-text sm:text-[13px]">{market.symbol}-PERP</div>
              <div className="mt-1 font-mono text-[10px] text-faint">{market.category}</div>
            </div>
          </div>
          <div className="nums text-right font-mono text-[11px] font-semibold text-text sm:text-[12px]">{priceFormat(quotes[market.symbol] ?? market.price)}</div>
          <div className="text-right"><Change value={market.change} className="text-[10px] sm:text-[11px]" /></div>
          <div className="nums hidden text-right font-mono text-[11px] text-muted sm:block">{compact(market.volume)}</div>
          <div className="nums hidden text-right font-mono text-[11px] text-muted sm:block">{compact(market.openInterest)}</div>
          <ArrowUpRight size={15} className="text-faint" />
        </Link>
      ))}
    </div>
  );
}

export function FeaturedSparkRow({ markets }: { markets: PerpMarket[] }) {
  return (
    <div className="divide-y divide-line-soft border-y border-line-soft">
      {markets.map((market) => (
        <Link to={`/perpetuals?market=${market.symbol}`} key={market.symbol} className="market-row flex items-center gap-4 px-1 py-3.5">
          <AssetMark symbol={market.symbol} color={market.color} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-text">{market.symbol}-PERP</div>
            <div className="mt-1 font-mono text-[10px] text-faint">{market.category} market</div>
          </div>
          <Sparkline seed={market.seed} positive={market.change >= 0} className="hidden sm:block" />
          <div className="w-[112px] text-right">
            <div className="nums font-mono text-[11px] text-text">{priceFormat(market.price)}</div>
            <Change value={market.change} className="text-[10px]" />
          </div>
          <ArrowUpRight size={15} className="text-faint" />
        </Link>
      ))}
    </div>
  );
}