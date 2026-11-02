"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Btn, Delta, Input, Skeleton } from "@/components/ui";
import { HyperliquidTokenIcon, type OfficialIconStatus } from "@/components/hyperliquid-token-icon";
import { PriceChart } from "@/components/heritage-price-chart";
import { MarketChart } from "@/components/market-chart";
import { useHyperliquidInstrument, useHyperliquidMarkets, type FeedStatus } from "@/components/use-hyperliquid";
import { hyperliquidCoinIconUrl, hyperliquidSpotIconCandidates } from "@/lib/hyperliquid";
import { cn, fmtCompact, fmtNum, fmtPrice, fmtUsd } from "@/lib/util";
import type { BookSnapshot } from "@/lib/dto";

import { MarketSourceTabs } from "@/components/market-source-tabs";
import { HyperliquidPaperTicket } from "@/components/hyperliquid-paper-ticket";

type Mode = "perp" | "spot";
type RailItem = { id: string; kind: Mode; coin: string; symbol: string; name: string; venue: string; iconAsset: string; iconCandidates?: string[]; accent: string; priceUsd: number; change: number };

function fmtPx(v: number) {
  if (!Number.isFinite(v) || v === 0) return "$0.00";
  if (v >= 100) return `$${fmtNum(v, 2)}`;
  if (v >= 1) return `$${fmtNum(v, 4)}`;
  if (v >= 0.001) return `$${v.toFixed(5)}`;
  return `$${fmtPrice(v)}`;
}
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const utc = (at: number | null) => (at ? `${new Date(at).toISOString().slice(11, 19)} UTC` : "—");

function StatusBadge({ status }: { status: FeedStatus }) {
  const label = status === "live" ? "LIVE" : status === "stale" ? "STALE" : status === "loading" ? "LOADING" : "OFFLINE";
  const tone: "up" | "gold" | "ice" | "down" = status === "live" ? "up" : status === "stale" ? "gold" : status === "loading" ? "ice" : "down";
  return <Badge tone={tone}>{label}</Badge>;
}

export function HyperliquidWorkstation({ onSwitchToSandbox }: { onSwitchToSandbox: () => void }) {
  const [iconAttempt, setIconAttempt] = useState(0);
  const [mode, setMode] = useState<Mode>("perp");
  const [selectedPerp, setSelectedPerp] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [railFilter, setRailFilter] = useState<"all" | "perps" | "spot" | "watchlist">("all");
  const [railSearch, setRailSearch] = useState("");
  const [starred, setStarred] = useState<string[]>([]);
  const [chartView, setChartView] = useState<"candles" | "line" | "depth" | "info">("candles");
  const [interval, setInterval] = useState("15m");
  const [bookTab, setBookTab] = useState<"book" | "trades">("book");
  const [iconStatus, setIconStatus] = useState<{ asset: string | null; status: OfficialIconStatus; url: string | null }>({ asset: null, status: "loading", url: null });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem("forge.hl.watchlist") ?? "[]");
        if (Array.isArray(stored)) setStarred(stored.filter((v): v is string => typeof v === "string"));
      } catch { /* A blocked storage area must not prevent market data. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const markets = useHyperliquidMarkets(true);
  const activePerp = markets.perps.find((m) => m.coin === selectedPerp) ?? markets.perps[0] ?? null;
  const activeSpot = markets.spots.find((m) => m.coin === selectedSpot) ?? markets.spots.find((m) => m.base === "HYPE") ?? markets.spots[0] ?? null;
  const coin = mode === "perp" ? activePerp?.coin ?? null : activeSpot?.coin ?? null;
  const instrument = useHyperliquidInstrument(coin, interval, true);

  const railItems = useMemo<RailItem[]>(() => {
    const perps: RailItem[] = markets.perps.map((m) => ({ id: m.id, kind: "perp", coin: m.coin, symbol: `${m.symbol}-PERP`, name: m.coin, venue: m.isHip3 ? `HIP-3 · ${m.dex} · ${m.maxLeverage}x` : `HyperCore · ${m.maxLeverage}x`, iconAsset: m.coin, accent: "#1d472f", priceUsd: m.markPrice, change: m.change24h }));
    const spots: RailItem[] = markets.spots.map((m) => ({ id: m.id, kind: "spot", coin: m.coin, symbol: m.symbol, name: m.base, venue: "HyperCore spot", iconAsset: m.base, iconCandidates: hyperliquidSpotIconCandidates(m, markets.perps.filter(p => !p.isHip3).map(p => p.coin)), accent: "#6a9744", priceUsd: m.markPrice, change: m.change24h }));
    return [...perps, ...spots];
  }, [markets.perps, markets.spots]);

  const visibleRail = railItems.filter((i) => {
    if (railFilter === "perps" && i.kind !== "perp") return false;
    if (railFilter === "spot" && i.kind !== "spot") return false;
    if (railFilter === "watchlist" && !starred.includes(i.id)) return false;
    const q = railSearch.trim().toLowerCase();
    return !q || i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.coin.toLowerCase().includes(q);
  }).sort((a, b) => Number(starred.includes(b.id)) - Number(starred.includes(a.id)));

  const toggleStar = (id: string) => setStarred((prev) => {
    const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
    try { localStorage.setItem("forge.hl.watchlist", JSON.stringify(next)); } catch { /* Keep the in-memory watchlist. */ }
    return next;
  });
  const select = (item: RailItem) => {
    setMode(item.kind);
    if (item.kind === "perp") setSelectedPerp(item.coin);
    else setSelectedSpot(item.coin);
  };

  const mark = mode === "perp" ? activePerp?.markPrice ?? 0 : activeSpot?.markPrice ?? 0;
  const change = mode === "perp" ? activePerp?.change24h ?? 0 : activeSpot?.change24h ?? 0;
  const symbol = mode === "perp" ? (activePerp ? `${activePerp.symbol}-PERP` : "—") : activeSpot?.symbol ?? "—";
  const lineData = useMemo(() => instrument.candles.map((c) => c.c), [instrument.candles]);
  const lineTimes = useMemo(() => instrument.candles.map((c) => c.t), [instrument.candles]);
  const feedError = markets.error ?? instrument.error;
  const iconAsset = mode === "perp" ? activePerp?.coin ?? null : activeSpot?.base ?? null;
  const iconCandidates = mode === "spot" && activeSpot ? hyperliquidSpotIconCandidates(activeSpot, markets.perps.filter(p => !p.isHip3).map(p => p.coin)) : undefined;
  const iconIdentity = `${mode}:${coin}:${iconCandidates?.join("|") ?? iconAsset}`;
  const iconUrl = iconStatus.asset === iconIdentity && iconStatus.url ? iconStatus.url : iconCandidates?.[0] ?? hyperliquidCoinIconUrl(iconAsset);
  const currentIconStatus: OfficialIconStatus = !iconUrl ? "unavailable" : iconStatus.asset === iconIdentity ? iconStatus.status : "loading";

  const stats = mode === "perp" && activePerp
    ? [
        ["Mark", fmtPx(activePerp.markPrice)], ["Oracle", fmtPx(activePerp.oraclePrice)], ["24h change", pct(activePerp.change24h)],
        ["Funding / 1h", `${(activePerp.fundingHour * 100).toFixed(4)}%`], ["Open interest", fmtUsd(activePerp.openInterestUsd)], ["24h volume", fmtUsd(activePerp.volume24hUsd)],
      ]
    : activeSpot
      ? [["Mark", fmtPx(activeSpot.markPrice)], ["Mid", fmtPx(activeSpot.midPrice)], ["24h change", pct(activeSpot.change24h)], ["24h volume", fmtUsd(activeSpot.volume24hUsd)], ["Base", activeSpot.base], ["Quote", activeSpot.quote]]
      : [];

  return (
    <div className="exchange-page min-w-0">
      <div className="ex-top">
        <div className="ex-title-wrap">
          <div>
            <div className="ex-title">Trade &amp; Markets</div>
            <div className="ex-subtitle">Hyperliquid mainnet · live prices · paper execution</div>
          </div>
          <div className="ex-status-chip"><StatusBadge status={markets.status} /> Hyperliquid</div>
          <div className="ex-status-chip">Updated {utc(markets.at)}</div>
        </div>
        <div className="ex-top-actions">
          <div className="ex-mode-switch" role="tablist" aria-label="Trading venue">
            <button type="button" role="tab" aria-selected={mode === "spot"} data-active={mode === "spot"} onClick={() => setMode("spot")}>Spot</button>
            <button type="button" role="tab" aria-selected={mode === "perp"} data-active={mode === "perp"} onClick={() => setMode("perp")}>⚡ Perpetuals</button>
          </div>

        </div>
      </div>

      <div className="hl-source-note" role="status">
        <strong>Data pasar asli:</strong> harga, candle, orderbook, trades, funding, dan open interest dibaca dari API publik Hyperliquid mainnet.
        Logo aset dimuat langsung dari CDN resmi Hyperliquid, bukan agregator pihak ketiga.
        Order memakai saldo latihan lokal dan harga mark asli. Dana dan order nyata <strong>tidak</strong> terhubung.
        {currentIconStatus === "unavailable" && iconUrl ? <span className="hl-feed-error"> Ikon resmi gagal dimuat: <a className="underline" href={iconUrl} target="_blank" rel="noreferrer noopener">{iconAsset}</a>. <button type="button" className="underline" onClick={() => { setIconStatus({ asset: iconIdentity, status: "loading", url: null }); setIconAttempt(n => n + 1); }}>Muat ulang ikon</button></span> : null}
        {feedError ? <span className="hl-feed-error"> {feedError} <button type="button" className="underline" onClick={() => { void markets.reload(); void instrument.reload(); }}>Coba lagi</button></span> : null}
      </div>

      <div className="ex-shell">
        <aside className="surface ex-panel ex-rail" aria-label="Market list">
          <MarketSourceTabs active="hyperliquid" onChange={onSwitchToSandbox} />
          <div className="ex-rail-head">
            <h2>Markets</h2><span className="text-xs text-[#65775c]">{markets.perps.length} perpetual · {markets.spots.length} spot</span>
            <Input className="ex-search" value={railSearch} onChange={setRailSearch} placeholder="Search symbol…" />
          </div>
          <div className="ex-rail-tabs">
            {([["all", "All"], ["perps", "Perps"], ["spot", "Spot"], ["watchlist", "★ Watchlist"]] as const).map(([id, label]) => (
              <button key={id} type="button" className="ex-rail-tab" data-active={railFilter === id} onClick={() => setRailFilter(id)}>{label}</button>
            ))}
          </div>
          <div className="ex-rail-body">
            {markets.loading && !railItems.length ? <div className="space-y-2 p-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div> : null}
            {!markets.loading && !railItems.length ? <p className="p-3 text-xs leading-6 text-[#637569]">Tidak dapat memuat pasar Hyperliquid. Periksa koneksi atau coba lagi.</p> : null}
            {visibleRail.map((item) => (
              <div key={item.id} className="ex-market-row" data-active={item.coin === coin && item.kind === mode}>
                <button type="button" className="ex-market-main" onClick={() => select(item)}>
                  <div className="flex min-w-0 items-center gap-2">
                    <HyperliquidTokenIcon candidates={item.iconCandidates} asset={item.iconAsset} accent={item.accent} size={26} />
                    <div className="min-w-0">
                      <div className="ex-market-sym">{item.symbol}</div>
                      <div className="ex-market-venue">{item.venue}</div>
                    </div>
                  </div>
                  <div className="ex-market-num">
                    <div className="ex-market-px">{fmtPx(item.priceUsd)}</div>
                    <div className={cn("text-[10px] font-semibold", item.change >= 0 ? "text-up" : "text-down")}>{pct(item.change)}</div>
                  </div>
                </button>
                <button type="button" className="ex-star" data-on={starred.includes(item.id)} aria-label={starred.includes(item.id) ? `Unstar ${item.symbol}` : `Star ${item.symbol}`} onClick={() => toggleStar(item.id)}>
                  {starred.includes(item.id) ? "★" : "☆"}
                </button>
              </div>
            ))}
            {railItems.length > 0 && visibleRail.length === 0 ? <p className="p-3 text-xs leading-6 text-[#637569]">Tidak ada pasar yang cocok.</p> : null}
          </div>
          <div className="ex-rail-foot">
            <div><span>Source</span><strong>Hyperliquid mainnet</strong></div>
            <div><span>Perps</span><strong>{markets.perps.length}</strong></div>
            <div><span>Spot pairs</span><strong>{markets.spots.length}</strong></div>
          </div>
        </aside>

        <section className="surface ex-panel ex-chart-panel" aria-label="Market chart">
          <div className="ex-instrument">
            <div className="ex-instrument-id">
              <HyperliquidTokenIcon
                key={`${iconAsset}:${iconAttempt}`}
                candidates={iconCandidates}
                asset={iconAsset}
                accent="#1d472f"
                size={40}
                priority
                onStatusChange={(status, url) => setIconStatus({ asset: iconIdentity, status, url })}
              />
              <div className="min-w-0">
                <div className="ex-pair">{symbol}</div>
                <div className="ex-instrument-meta">
                  <Badge tone="ice">{mode === "perp" ? (activePerp?.isHip3 ? `HyperCore · HIP-3 · ${activePerp.dex}` : "HyperCore perpetual") : "HyperCore spot"}</Badge>
                  <StatusBadge status={instrument.status} />
                </div>
              </div>
            </div>
            <div className="ex-price-block">
              <div className="ex-price">{fmtPx(mark)}</div>
              <div className="ex-price-sub"><Delta pct={change} className="font-semibold" /><span>24h</span><span>·</span><span>{coin ?? "—"}</span></div>
            </div>
            <div className="ex-stat-grid">
              {stats.map(([label, value]) => <div className="ex-stat" key={label}><div className="ex-stat-label">{label}</div><div className="ex-stat-value">{value}</div></div>)}
            </div>
            <select
              className="ex-mobile-select"
              aria-label="Select market"
              value={railItems.find((i) => i.coin === coin && i.kind === mode)?.id ?? ""}
              onChange={(e) => { const item = railItems.find((i) => i.id === e.target.value); if (item) select(item); }}
            >
              <optgroup label="Hyperliquid perpetuals">
                {markets.perps.map((m) => <option key={`hl:perp:${m.coin}`} value={`hl:perp:${m.coin}`}>{m.isHip3 ? `${m.dex}:${m.symbol}` : m.symbol}-PERP · {m.maxLeverage}x</option>)}
              </optgroup>
              <optgroup label="Hyperliquid spot">
                {markets.spots.map((m) => <option key={`hl:spot:${m.coin}`} value={`hl:spot:${m.coin}`}>{m.symbol}</option>)}
              </optgroup>
            </select>
          </div>

          <div className="ex-chart-toolbar">
            <div className="ex-view-tabs">
              {([["candles", "Candlestick"], ["line", "Line"], ["depth", "Depth"], ["info", "Market info"]] as const).map(([id, label]) => (
                <button key={id} type="button" className="ex-view-tab" data-active={chartView === id} onClick={() => setChartView(id)}>{label}</button>
              ))}
            </div>
            <div className="ex-view-tabs" aria-label="Candle interval">
              {["1m", "5m", "15m", "1h", "4h", "1d"].map((iv) => <button key={iv} type="button" className="ex-view-tab" data-active={interval === iv} onClick={() => setInterval(iv)}>{iv}</button>)}
            </div>
          </div>

          <div className="ex-chart-body">
            {instrument.loading && !instrument.candles.length ? <div className="grid h-[330px] place-items-center text-sm text-[#637569]">Memuat data Hyperliquid…</div> : null}
            {!instrument.loading && !instrument.candles.length && (chartView === "candles" || chartView === "line") ? <div className="grid h-[330px] place-items-center text-sm text-[#637569]">{instrument.error ?? `API Hyperliquid belum mengembalikan candle untuk ${coin ?? "aset ini"} (${interval}).`} <button type="button" className="underline" onClick={() => void instrument.reload()}>Coba lagi</button></div> : null}
            {chartView === "candles" && instrument.candles.length ? <PriceChart data={instrument.candles} height={430} interval={interval} fmtPrice={fmtPx} label="Grafik candlestick Hyperliquid mainnet" loadingLabel="Memuat candle Hyperliquid…" /> : null}
            {chartView === "line" && lineData.length ? <MarketChart data={lineData} times={lineTimes} symbol={symbol} height={430} showRange={false} sourceLabel={`Hyperliquid mainnet · ${interval} candles`} /> : null}
            {chartView === "depth" ? <LiveDepth book={instrument.book} /> : null}
            {chartView === "info" ? (
              <div className="ex-info-grid">
                <div className="ex-info-cell"><span>Data source</span><strong>api.hyperliquid.xyz/info</strong></div>
                <div className="ex-info-cell"><span>Logo source</span><strong>app.hyperliquid.xyz/coins</strong></div>
                <div className="ex-info-cell">
                  <span>Official icon</span>
                  <strong data-testid="official-icon-status">
                    {currentIconStatus === "loaded" ? "Loaded from Hyperliquid" : currentIconStatus === "unavailable" ? "Unavailable · monogram shown" : "Loading…"}
                  </strong>
                  {iconUrl ? <a href={iconUrl} target="_blank" rel="noreferrer noopener" className="hl-icon-link">{iconUrl}</a> : null}
                  {iconCandidates ? <details className="mt-2 text-xs"><summary>Official candidates ({iconCandidates.length})</summary>{iconCandidates.map(url => <a key={url} className="hl-icon-link" href={url} target="_blank" rel="noreferrer noopener">{url}</a>)}</details> : null}
                </div>
                {mode === "spot" && activeSpot ? <div className="ex-info-cell"><span>Spot token identity</span><strong>{activeSpot.baseFullName ?? activeSpot.base}</strong><span className="hl-icon-link">{activeSpot.baseTokenId ?? "Token ID not supplied"}</span></div> : null}
                {mode === "perp" && activePerp?.isHip3 ? <div className="ex-info-cell"><span>Market type</span><strong>HIP-3 builder-deployed · {activePerp.dex}</strong></div> : null}
                <div className="ex-info-cell"><span>Network</span><strong>Hyperliquid mainnet</strong></div>
                <div className="ex-info-cell"><span>Instrument</span><strong>{coin ?? "—"}</strong></div>
                <div className="ex-info-cell"><span>Execution</span><strong>Read-only · disabled</strong></div>
                {mode === "perp" && activePerp ? <><div className="ex-info-cell"><span>Max leverage</span><strong>{activePerp.maxLeverage}x</strong></div><div className="ex-info-cell"><span>Margin mode</span><strong>{activePerp.onlyIsolated ? "Isolated only" : "Cross / isolated"}</strong></div></> : null}
              </div>
            ) : null}
          </div>

          <div className="ex-chart-foot">
            <div><span>Source</span><strong>Hyperliquid public API</strong></div>
            <div><span>Instrument</span><strong>{coin ?? "—"}</strong></div>
            <div><span>Candles</span><strong>{instrument.candles.length} bars · {interval}</strong></div>
            <div><span>Updated</span><strong>{utc(instrument.at)}</strong></div>
          </div>
        </section>

        <section className="surface ex-panel ex-book" aria-label="Order book">
          <div className="ex-book-head"><h2>Order book</h2><StatusBadge status={instrument.status} /></div>
          <div className="ex-book-tabs">
            <button type="button" className="ex-book-tab" data-active={bookTab === "book"} onClick={() => setBookTab("book")}>Book</button>
            <button type="button" className="ex-book-tab" data-active={bookTab === "trades"} onClick={() => setBookTab("trades")}>Trades</button>
          </div>
          {bookTab === "book" ? (
            <>
              <div className="ex-book-columns"><span>Price</span><span>Size</span><span>Total</span></div>
              {[...(instrument.book?.asks ?? [])].reverse().slice(0, 12).map((l, i) => <div key={`a${i}`} className="ex-book-row ask"><span className="text-down">{fmtPx(l.price)}</span><span>{fmtCompact(l.size, 2)}</span><span>{fmtCompact(l.total, 2)}</span></div>)}
              <div className="ex-book-mid">{instrument.book ? fmtPx(instrument.book.mid) : "—"} <small>spread {instrument.book ? `${instrument.book.spreadBps.toFixed(2)} bps` : "—"}</small></div>
              {(instrument.book?.bids ?? []).slice(0, 12).map((l, i) => <div key={`b${i}`} className="ex-book-row bid"><span className="text-up">{fmtPx(l.price)}</span><span>{fmtCompact(l.size, 2)}</span><span>{fmtCompact(l.total, 2)}</span></div>)}
              {!instrument.book ? <div className="ex-empty">Orderbook belum tersedia.</div> : null}
            </>
          ) : (
            <>
              <div className="ex-book-columns"><span>Price</span><span>Size</span><span>Time</span></div>
              {instrument.trades.slice(0, 24).map((t) => <div key={t.id} className="ex-book-row"><span className={t.side === "buy" ? "text-up" : "text-down"}>{fmtPx(t.price)}</span><span>{fmtCompact(t.size, 2)}</span><span>{new Date(t.time).toISOString().slice(11, 19)}</span></div>)}
              {!instrument.trades.length ? <div className="ex-empty">Trades belum tersedia.</div> : null}
            </>
          )}
        </section>

        <section className="surface ex-panel ex-ticket" aria-label="Order ticket">
          <HyperliquidPaperTicket coin={coin} kind={mode} mark={mark} fresh={markets.status === "live" && instrument.status === "live"} maxLeverage={mode === "perp" ? activePerp?.maxLeverage ?? 1 : 1} />
        </section>

        <section className="surface ex-panel ex-blotter" aria-label="Market blotter">
          <div className="ex-blotter-head"><div className="ex-blotter-tabs"><button type="button" className="ex-blotter-tab" data-active={true}>Recent trades</button></div></div>
          <div className="ex-scroll">
            <table className="ex-table">
              <thead><tr><th>Time (UTC)</th><th>Instrument</th><th>Side</th><th className="text-right">Price</th><th className="text-right">Size</th></tr></thead>
              <tbody>
                {instrument.trades.slice(0, 12).map((t) => <tr key={t.id}><td>{new Date(t.time).toISOString().slice(11, 19)}</td><td><strong>{t.coin}</strong></td><td className={t.side === "buy" ? "text-up" : "text-down"}>{t.side.toUpperCase()}</td><td className="mono text-right">{fmtPx(t.price)}</td><td className="mono text-right">{fmtCompact(t.size, 4)}</td></tr>)}
                {!instrument.trades.length ? <tr><td colSpan={5} className="ex-empty">Belum ada trades untuk instrument ini.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function LiveDepth({ book }: { book: BookSnapshot | null }) {
  if (!book) return <div className="ex-empty">Depth data is loading…</div>;
  const asks = [...book.asks].reverse().slice(0, 10);
  const bids = book.bids.slice(0, 10);
  const max = Math.max(...asks.map((a) => a.total), ...bids.map((b) => b.total), 1);
  return (
    <div className="ex-depth-view">
      <div><h4>Bid depth</h4>{bids.map((b, i) => <div key={i} className="ex-depth-bar bid" style={{ backgroundSize: `${Math.min(100, (b.total / max) * 100)}% 100%` }}><span>{fmtPx(b.price)}</span><span>{fmtCompact(b.total, 1)}</span></div>)}</div>
      <div><h4>Ask depth</h4>{asks.map((a, i) => <div key={i} className="ex-depth-bar ask" style={{ backgroundSize: `${Math.min(100, (a.total / max) * 100)}% 100%` }}><span>{fmtPx(a.price)}</span><span>{fmtCompact(a.total, 1)}</span></div>)}</div>
    </div>
  );
}
