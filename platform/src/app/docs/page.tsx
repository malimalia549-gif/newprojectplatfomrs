"use client";

import { useEffect, useState } from "react";
import { Badge, Btn, Progress, SectionHead, Stat } from "@/components/ui";
import { Pipeline } from "@/components/pipeline";
import { ELYSIUM, cn, fmtNum } from "@/lib/util";
import { useLive } from "@/components/providers";

const SECTIONS = [
  { id: "network", label: "Network" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "trading", label: "Trading" },
  { id: "payments", label: "Payments" },
  { id: "stoke", label: "STOKE" },
  { id: "mainnet", label: "Mainnet checklist" },
];

const CHECKLIST: Array<{ id: string; label: string; detail: string; weight: number; group: string }> = [
  { id: "curve", label: "Bonding curve and factory", detail: "Constant-product curve over virtual reserves, fixed supply, unique tickers.", weight: 3, group: "Contracts" },
  { id: "graduation", label: "Graduation and settlement", detail: "Open, dispatched and confirmed tickets, with an abort path that reopens the curve.", weight: 3, group: "Contracts" },
  { id: "bridge", label: "Bridge adapter", detail: "Elysium to HyperEVM transfers for tokens and HYPE, with both outbox claims.", weight: 3, group: "Contracts" },
  { id: "spot", label: "HyperCore spot listing", detail: "Ticker auction within budget, deposit wallet, and a symmetric liquidity ladder.", weight: 2, group: "Contracts" },
  { id: "hip3", label: "HIP-3 venue", detail: "Deployer stake, isolated margin, fee split, optional allowlist controls.", weight: 2, group: "Trading" },
  { id: "margin", label: "Margin and liquidations", detail: "Maintenance margin, hourly funding, keeper sweep on every block.", weight: 3, group: "Trading" },
  { id: "stoke", label: "STOKE accounting", detail: "Burn mechanics, staker emissions and on-chain vesting.", weight: 3, group: "Token" },
  { id: "tge", label: "Token generation script", detail: "Mint in the first block, locked allocations, verified source on the explorer.", weight: 2, group: "Token" },
  { id: "xmoney", label: "Payment integration", detail: "Sandbox only. A verified merchant integration must be built before live payments.", weight: 2, group: "Payments" },
  { id: "audit", label: "Independent audit", detail: "Curve, settlement and bridge invariants reviewed by a third party.", weight: 3, group: "Safety" },
  { id: "invariants", label: "Invariant tests", detail: "Balances reconcile, the curve never loses value, and fees match the spec.", weight: 2, group: "Safety" },
  { id: "runbook", label: "Keeper runbook", detail: "Monitoring, stale ticket alerts, and a sequencer outage plan.", weight: 2, group: "Safety" },
];

export default function DocsPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const net = useLive<{ network: { headBlock: number; blockMs: number }; prices: { hypeUsd: number; stokeUsd: number } }>("/api/network", 8000);

  useEffect(() => { const timer = window.setTimeout(() => {
    try {
      const raw = window.localStorage.getItem("forge.readiness");
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* first visit */
    }
    setLoaded(true);
    }, 0); return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem("forge.readiness", JSON.stringify(done));
  }, [done, loaded]);

  const groups = Array.from(new Set(CHECKLIST.map((c) => c.group)));
  const totalWeight = CHECKLIST.reduce((a, c) => a + c.weight, 0);
  const readyWeight = CHECKLIST.filter((c) => done[c.id]).reduce((a, c) => a + c.weight, 0);
  const pct = (readyWeight / totalWeight) * 100;

  return (
    <div className="pt-14 sm:pt-20">
      <SectionHead
        eyebrow="Documentation"
        title="How Forge works"
        sub="The mechanics the platform mirrors on Elysium, plus a checklist for mainnet readiness."
        right={<Badge tone="ice">Testnet · chain {ELYSIUM.chainId}</Badge>}
      />

      <div className="grid gap-16 lg:grid-cols-[180px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-20 space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-24">
          <section id="network" className="scroll-mt-24">
            <h2 className="font-serif-display text-4xl text-white">Network</h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
              Elysium is an Arbitrum Orbit chain built by {ELYSIUM.builtBy}. It settles to HyperEVM rather than Ethereum, uses {ELYSIUM.gasToken} for gas, and targets {ELYSIUM.targetBlockMs} blocks.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-y border-white/[0.07] py-8 sm:grid-cols-4">
              <Stat label="Head block" value={net.data ? fmtNum(net.data.network.headBlock, 0) : "—"} sub={`~${net.data?.network.blockMs ?? 130} ms`} tone="ice" />
              <Stat label="HYPE" value={net.data ? `$${fmtNum(net.data.prices.hypeUsd, 2)}` : "—"} sub="Gas token" />
              <Stat label="STOKE" value={net.data ? `$${fmtNum(net.data.prices.stokeUsd, 4)}` : "—"} sub="Platform token" tone="gold" />
              <Stat label="Mainnet" value={ELYSIUM.mainnet} sub="Scheduled" />
            </div>
            <dl className="mt-8 divide-y divide-white/[0.06] text-sm">
              {[
                ["Chain ID", `${ELYSIUM.chainId} (${ELYSIUM.chainIdHex})`],
                ["Settlement", ELYSIUM.parentChain],
                ["Data availability", ELYSIUM.da],
                ["Sequencer", ELYSIUM.sequencer],
                ["RPC", ELYSIUM.rpc],
                ["Explorer", ELYSIUM.explorer],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-6 py-3.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="tabular truncate text-right text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="lifecycle" className="scroll-mt-24">
            <h2 className="font-serif-display text-4xl text-white">Lifecycle</h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
              A token is created with a fixed supply of one billion and begins on a bonding curve. The price rises as buyers absorb the 800 million tokens offered for sale. Once the curve is full, anyone can call graduate, which locks the raised HYPE and the 200 million remaining tokens for listing.
            </p>
            <div className="mt-10">
              <Pipeline current="perp_listed" />
            </div>
            <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-slate-400">
              <div>
                <h3 className="mb-2 text-base font-medium text-white">Pricing</h3>
                <p>
                  The curve is constant product over virtual reserves: virtual HYPE equals graduation target × 273 ÷ 800, and virtual tokens equal 1.073 billion. A 1% fee applies to the HYPE leg of every trade. A quarter of the fee goes to the creator.
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-base font-medium text-white">Graduation and abort</h3>
                <p>
                  Graduation creates a settlement ticket. Dispatch moves assets across the bridge. Confirmation seeds the pool and lists the token on the HyperCore spot book. If a listing stalls, anyone can abort after the rescue window, and the curve reopens where it stopped.
                </p>
              </div>
            </div>
          </section>

          <section id="trading" className="scroll-mt-24">
            <h2 className="font-serif-display text-4xl text-white">Trading perpetuals</h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
              The Trade page has two data sources in one workstation. <strong>Live</strong> reads Hyperliquid mainnet public market data (perpetuals, spot, candles, orderbook, trades, funding, open interest) directly from the browser, read-only. <strong>Sandbox</strong> keeps the local HIP-3-flavoured simulation with isolated margin, capped leverage, TP/SL and paper balances. Asset logos are loaded directly from Hyperliquid&apos;s official app CDN using the live coin id, including HIP-3 prefixes such as xyz:TSLA, without a hardcoded per-token logo map or third-party aggregator. The live perp catalog uses metaAndAssetCtxs for native HyperCore and discovers HIP-3 DEXs through perpDexs, then loads their contexts separately. allPerpMetas is metadata only, not a price feed. No wallet, signing, or real order execution is enabled.
            </p>
            <dl className="mt-8 divide-y divide-white/[0.06] text-sm">
              {[
                ["Maximum leverage", "Up to 20x (market dependent)"],
                ["Maintenance margin", "0.5% of notional"],
                ["Long liquidation", "Entry × (1 − 1/L + 0.005)"],
                ["Short liquidation", "Entry × (1 + 1/L − 0.005)"],
                ["Funding", "Hourly, proportional to book imbalance"],
                ["Taker / maker fee", "4.5 bps / 1 bps"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-6 py-3.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="tabular text-right text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="payments" className="scroll-mt-24">
            <h2 className="font-serif-display text-4xl text-white">Payments with X Money</h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
              Launch fees, cashtag listings and top-ups can be paid by sending USD to an X handle. Each payment creates a unique reference, and confirming the same reference twice has no further effect, so it cannot be credited twice.
            </p>
            <LiveFlag />
          </section>

          <section id="stoke" className="scroll-mt-24">
            <h2 className="font-serif-display text-4xl text-white">STOKE</h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400">
              STOKE is the ticker of Forge&rsquo;s platform token and is separate from Elysium itself, which charges gas in HYPE. It has a fixed supply of one billion with no minting function. Ten percent of net platform revenue is used to buy it back and burn it, and staking yield ranges from 6% to 46% depending on how much is staked.
            </p>
            <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-3">
              <Stat label="Supply" value="1,000,000,000" sub="Fixed" tone="gold" />
              <Stat label="Burn" value="10%" sub="Of net revenue" tone="up" />
              <Stat label="Yield" value="6–46%" sub="Utilization based" />
            </div>
          </section>

          <section id="mainnet" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <h2 className="font-serif-display text-4xl text-white">Mainnet checklist</h2>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">Mark items as they are completed. Progress is saved in this browser.</p>
              </div>
              <div className="w-56">
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>Readiness</span>
                  <span className="tabular text-white">{Math.round(pct)}%</span>
                </div>
                <Progress pct={pct} accent="#a7f3d6" height={4} />
              </div>
            </div>

            {groups.map((g) => (
              <div key={g} className="mt-12">
                <div className="mb-4 text-xs font-medium text-slate-500">{g}</div>
                <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                  {CHECKLIST.filter((c) => c.group === g).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setDone((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                      className="grid w-full grid-cols-[24px_1fr] gap-4 py-5 text-left transition hover:bg-white/[0.015]"
                    >
                      <span className={cn("mt-0.5 grid h-5 w-5 place-items-center rounded-full ring-1 ring-inset transition", done[c.id] ? "bg-up text-ink-950 ring-up" : "text-transparent ring-white/20")}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      <span>
                        <span className={cn("block text-[15px] font-medium", done[c.id] ? "text-slate-400 line-through decoration-slate-600" : "text-white")}>{c.label}</span>
                        <span className="mt-1 block text-sm text-slate-500">{c.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-8 flex gap-3">
              <Btn size="sm" variant="ghost" onClick={() => setDone({})}>
                Reset
              </Btn>
              <Btn size="sm" variant="outline" onClick={() => setDone(Object.fromEntries(CHECKLIST.map((c) => [c.id, true])))}>
                Mark all complete
              </Btn>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LiveFlag() {
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/x", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLive(Boolean(d?.live)))
      .catch(() => setLive(false));
  }, []);
  return (
    <div className="mt-8 rounded-xl bg-white/[0.02] p-5 text-sm leading-relaxed text-slate-400 ring-1 ring-inset ring-white/[0.06]">
      Current mode:{" "}
      <span className={live ? "text-up" : "text-gold"}>{live === null ? "Checking" : live ? "Live" : "Sandbox"}</span>
      {live === false ? ". Confirmation codes are shown in the app and no funds leave the server." : live ? ". Live transfers are disabled in this build." : ""}
    </div>
  );
}
