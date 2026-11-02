"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, AtSign, BadgeCheck, BrainCircuit, Check, Coins, ExternalLink, Fingerprint, Flame,
  Gamepad2, Landmark, Layers, Lock, Rocket, Server, Sparkles, TrendingUp, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { api, useForge, useLive } from "@/components/providers";
import { Badge, Btn, Copyable, Field, Input, TextArea, TokenGlyph, TOKEN_ICONS } from "@/components/ui";
import { BondingCurveChart } from "@/components/bonding-curve-chart";
import { CURVE, marginalPrice } from "@/lib/curve";
import { ELYSIUM, cn, fmtCompact, fmtHype, fmtNum, fmtPrice, fmtUsd, normalizeSymbol, shortAddr, symbolIssue } from "@/lib/util";
import type { LaunchSummary } from "@/lib/dto";

const STEPS: Array<{ title: string; sub: string; icon: LucideIcon }> = [
  { title: "Token identity", sub: "Name, ticker, sector & brand", icon: Fingerprint },
  { title: "Bonding curve", sub: "Target, price path & founder buy", icon: TrendingUp },
  { title: "Settlement", sub: "Pay the deployment fee", icon: Wallet },
  { title: "Review & deploy", sub: "Final checks and launch", icon: Rocket },
];

const ACCENTS = ["#6a9744", "#4f837f", "#7e77ab", "#b89447", "#ad6e68", "#5b82a6"];
const MONOGRAMS = ["diamond", "sparkles", "triangle", "orbit", "hexagon", "atom"];
const SECTORS: Array<{ id: "infra" | "ai" | "rwa" | "meme" | "gaming" | "dao"; label: string; hint: string; icon: LucideIcon }> = [
  { id: "infra", label: "Infrastructure", hint: "L2, tooling, infra", icon: Server },
  { id: "ai", label: "AI", hint: "Agents, inference", icon: BrainCircuit },
  { id: "rwa", label: "RWA", hint: "Real-world assets", icon: Landmark },
  { id: "meme", label: "Meme", hint: "Community token", icon: Flame },
  { id: "gaming", label: "Gaming", hint: "Game economies", icon: Gamepad2 },
  { id: "dao", label: "DAO", hint: "Governance", icon: Users },
];
const PRESETS = [
  { v: 25, tag: "Lean", hint: "Fast graduation" },
  { v: 45, tag: "Standard", hint: "Balanced depth" },
  { v: 100, tag: "Deep LP", hint: "Thicker pool" },
  { v: 250, tag: "Institutional", hint: "Maximum depth" },
];

type Intent = { reference: string; amountUsd: number; amountHype: number; handle: string; memo: string; code?: string; deeplink: string; live: boolean; status: string };
type Phase = "idle" | "prepare" | "broadcast" | "confirm";

export default function CreatePage() {
  const { user, setAuthModal, refresh, push } = useForge();
  const net = useLive<{ prices: { hypeUsd: number }; network: { headBlock: number } }>("/api/network", 6000);
  const launches = useLive<{ launches: LaunchSummary[] }>("/api/launches", 15000);
  const cardRef = useRef<HTMLElement | null>(null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("Volta Labs");
  const [symbol, setSymbol] = useState("VOLTA");
  const [description, setDescription] = useState("An inference marketplace for Elysium. Launch on a curve, graduate to HyperCore, and reach a perpetual market.");
  const [category, setCategory] = useState<"meme" | "infra" | "rwa" | "gaming" | "ai" | "dao">("infra");
  const [glyph, setGlyph] = useState("diamond");
  const [accent, setAccent] = useState("#6a9744");
  const [xHandle, setXHandle] = useState("");
  const [target, setTarget] = useState(45);
  const [initialBuy, setInitialBuy] = useState(0);
  const [payWith, setPayWith] = useState<"hype" | "x_money">("hype");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [deployed, setDeployed] = useState<{ slug: string; symbol: string } | null>(null);

  const price = net.data?.prices.hypeUsd ?? 28.4;
  const fee = 0.05;
  const symbolErr = symbolIssue(symbol);
  const takenSet = useMemo(() => new Set((launches.data?.launches ?? []).map((l) => l.symbol)), [launches.data]);
  const taken = takenSet.has(symbol);
  const symbolOk = !symbolErr && !taken && symbol.length >= 2;
  const nameOk = name.trim().length >= 2 && name.trim().length <= 28;

  const suggestions = useMemo(() => {
    if (symbolOk || symbol.length < 2) return [];
    const base = symbol.replace(/[^A-Z0-9]/g, "").slice(0, 4) || "TKN";
    const candidates = [`${base}X`, `${base}DAO`, `${base}AI`, `GET${base}`, `${base}2`, `${base}LAB`];
    return Array.from(new Set(candidates.map(normalizeSymbol))).filter((s) => s !== symbol && !symbolIssue(s) && !takenSet.has(s)).slice(0, 3);
  }, [symbol, symbolOk, takenSet]);

  const preview = useMemo(() => {
    const h = (target * 273) / 800;
    const t = 1_073_000_000;
    const first = h / t;
    const end = (h + target * 0.99) / (t - 800_000_000);
    const line = Array.from({ length: 64 }, (_, i) => {
      const sold = (CURVE.sellable * i) / 63;
      return marginalPrice({ sold, raised: h * (t / (t - sold) - 1), graduationHype: target });
    });
    return { first, end, line, multiple: end / first, initialMcap: first * CURVE.totalSupply, endMcap: end * CURVE.totalSupply };
  }, [target]);

  const founderTokens = initialBuy > 0 ? initialBuy / preview.first : 0;
  const founderPct = (founderTokens / CURVE.totalSupply) * 100;
  const totalRequired = fee + initialBuy;
  const insufficient = Boolean(user && user.hype < totalRequired);
  const xPaid = payWith === "x_money" && intent?.status === "succeeded";
  const paymentReady = payWith === "hype" ? Boolean(user) && !insufficient : xPaid;

  const checks = [
    { ok: nameOk, label: "Token name", detail: nameOk ? `${name.trim()} · valid length` : "2–28 characters required", fix: 0 },
    { ok: symbolOk, label: "Ticker availability", detail: symbolOk ? `$${symbol} is available on Elysium` : taken ? `$${symbol} is already launched` : symbolErr ?? "Enter a valid ticker", fix: 0 },
    { ok: target >= 6 && target <= 400, label: "Graduation target", detail: `${fmtNum(target, 0)} HYPE · ≈ ${fmtUsd(target * price)} pool seed`, fix: 1 },
    { ok: founderPct <= 2, label: "Founder allocation", detail: initialBuy > 0 ? `${fmtCompact(founderTokens, 1)} ${symbol || "tokens"} · ${founderPct.toFixed(2)}% of supply` : "No founder buy", fix: 1 },
    { ok: Boolean(user), label: "Deployer account", detail: user ? shortAddr(user.wallet, 6) : "Sign in required", fix: 2 },
    { ok: paymentReady, label: "Settlement", detail: payWith === "hype" ? (insufficient ? `Need ${fmtHype(totalRequired - (user?.hype ?? 0))} more` : `${fmtHype(totalRequired)} from HYPE balance`) : xPaid ? `X Money receipt ${intent?.reference}` : "X Money payment pending", fix: 2 },
  ];
  const readyCount = checks.filter((c) => c.ok).length;
  const allReady = readyCount === checks.length;
  const canContinue = step === 0 ? nameOk && symbolOk : step === 1 ? target >= 6 && target <= 400 : step === 2 ? Boolean(user) && paymentReady : allReady;

  useEffect(() => {
    const el = cardRef.current;
    if (el && el.getBoundingClientRect().top < 64) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const next = () => {
    if (!canContinue) {
      push({ kind: "error", title: "Complete this step", body: step === 0 ? "Fix the token name or ticker before continuing." : step === 2 ? "Sign in and settle the deployment fee." : "Resolve the remaining checklist items." });
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const checkout = async () => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      const res = await api<Intent>("/api/launches", { json: { action: "checkout", handle: xHandle || user.xHandle || "forge_xyz", hype: fee } });
      setIntent(res);
    } catch (e) { push({ kind: "error", title: "Payment request failed", body: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const settle = async () => {
    if (!intent) return;
    setBusy(true);
    try {
      await api("/api/launches", { json: { action: "settle", reference: intent.reference, code } });
      setIntent({ ...intent, status: "succeeded" });
      push({ kind: "success", title: "Payment confirmed", body: `Reference ${intent.reference}` });
      await refresh();
    } catch (e) { push({ kind: "error", title: "Could not confirm payment", body: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const deploy = async () => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      setPhase("prepare");
      await new Promise((r) => setTimeout(r, 320));
      setPhase("broadcast");
      const res = await api<{ detail: { slug: string; symbol: string } }>("/api/launches", {
        json: { action: "create", name, symbol, description, category, glyph, accent, xHandle: xHandle || undefined, graduationHype: target, initialBuyHype: initialBuy, paymentRef: xPaid ? intent?.reference : undefined },
      });
      setPhase("confirm");
      await new Promise((r) => setTimeout(r, 420));
      setDeployed(res.detail);
      await refresh();
      await launches.reload();
      push({ kind: "success", title: `${res.detail.symbol} is live`, body: "Your fixed-supply token is now trading on the curve." });
    } catch (e) { push({ kind: "error", title: "Deployment declined", body: (e as Error).message }); }
    finally { setBusy(false); setPhase("idle"); }
  };

  const recent = (launches.data?.launches ?? []).slice(0, 4);
  const stepState = (i: number) => (i < step ? "done" : i === step ? "active" : "todo");
  const deployLabel = phase === "prepare" ? "Preparing transaction…" : phase === "broadcast" ? "Broadcasting to Elysium…" : phase === "confirm" ? "Confirming block…" : `Deploy $${symbol || "token"}`;

  if (deployed) {
    return (
      <div className="forge-page ls-ambient">
        <div className="ls-success ls-reveal">
          <div className="ls-success-top">
            <div className="ls-success-check"><Check size={28} strokeWidth={3} /></div>
            <div>
              <div className="ls-kicker">Deployment confirmed</div>
              <h1>${deployed.symbol} is live on Elysium.</h1>
              <p>1,000,000,000 tokens minted into the launch pool. The bonding curve is open and the lifecycle is armed.</p>
            </div>
          </div>
          <div className="ls-success-body">
            <div className="ls-receipt">
              <div className="ls-receipt-row"><span>Token</span><strong>{name} · ${deployed.symbol}</strong></div>
              <div className="ls-receipt-row"><span>Graduation target</span><strong>{fmtHype(target)} · ≈ {fmtUsd(target * price)}</strong></div>
              <div className="ls-receipt-row"><span>Founder buy</span><strong>{initialBuy ? `${fmtHype(initialBuy)} · ${founderPct.toFixed(2)}%` : "None"}</strong></div>
              <div className="ls-receipt-row"><span>Network</span><strong>Elysium {ELYSIUM.chainId} · block #{fmtNum(net.data?.network.headBlock ?? 0, 0)}</strong></div>
            </div>
            <div className="ls-next">
              {[{ b: "Now", s: "Curve trading open", i: TrendingUp }, { b: "At 800M sold", s: "Graduate → locked pool", i: Layers }, { b: "Then", s: "HyperCore spot book", i: Landmark }, { b: "Finally", s: "HIP-3 perpetual venue", i: Rocket }].map((n, i) => (
                <div key={n.b} className="ls-reveal" style={{ animationDelay: `${120 + i * 70}ms` }}><b className="inline-flex items-center gap-1.5"><n.i size={11} />{n.b}</b><span>{n.s}</span></div>
              ))}
            </div>
            <div className="ls-success-actions">
              <Btn href={`/token/${deployed.slug}`} size="lg">Open token page <ArrowRight size={15} /></Btn>
              <Btn href={`/trade?mode=swap&from=HYPE&to=${deployed.symbol}`} size="lg" variant="outline">Buy on trade desk</Btn>
              <Btn href="/launch" size="lg" variant="ghost">View launchpad <ExternalLink size={14} /></Btn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forge-page ls-ambient">
      <div className="ls-head ls-reveal">
        <div>
          <nav className="ls-crumb"><Link href="/launch">Launchpad</Link><span>/</span><b>Launch Studio</b></nav>
          <h1>Launch Studio</h1>
          <p>Configure a fixed-supply token, preview its bonding curve and liquidity, settle the fee, and deploy to Elysium with an immutable lifecycle.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="ls-live-chip"><span className="live-dot h-1.5 w-1.5 rounded-full bg-up" />HYPE {fmtUsd(price)}</span>
            <Badge tone="ice">Elysium testnet · {ELYSIUM.chainId}</Badge>
            <Badge tone="slate">Fee {fee} HYPE</Badge>
          </div>
          <div className="ls-progress">
            <div className="ls-progress-track"><div className="ls-progress-fill" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
            <span>Step {step + 1} / 4</span>
          </div>
        </div>
      </div>

      {recent.length ? (
        <div className="ls-recent ls-reveal" style={{ animationDelay: "60ms" }}>
          <span className="ls-recent-label"><Sparkles size={12} /> Recently launched</span>
          {recent.map((l) => (
            <Link key={l.id} href={`/token/${l.slug}`} className="ls-recent-chip">
              <TokenGlyph glyph={l.glyph} accent={l.accent} size={20} />
              <b>${l.symbol}</b>
              <span className={cn("font-mono text-[10px]", l.change24h >= 0 ? "text-up" : "text-down")}>{l.change24h >= 0 ? "+" : ""}{l.change24h.toFixed(1)}%</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="ls-mobile-steps" role="tablist" aria-label="Launch steps">
        {STEPS.map((s, i) => (
          <button key={s.title} type="button" className="ls-mobile-step" data-state={stepState(i)} onClick={() => i <= step && setStep(i)} disabled={i > step}>
            <s.icon size={12} />{s.title}
          </button>
        ))}
      </div>

      <div className="ls">
        <aside className="ls-rail">
          <ol className="ls-steps ls-reveal" style={{ animationDelay: "80ms" }} aria-label="Launch creation steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button type="button" className="ls-step" data-state={stepState(i)} aria-current={i === step ? "step" : undefined} disabled={i > step} onClick={() => i <= step && setStep(i)}>
                  <span className="ls-step-num">{i < step ? <Check size={14} strokeWidth={3} /> : <s.icon size={14} />}</span>
                  <span className="min-w-0"><span className="ls-step-title block">{s.title}</span><span className="ls-step-sub block">{s.sub}</span></span>
                  <span className="ls-step-check">{i < step ? "Done" : ""}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="ls-facts ls-reveal" style={{ animationDelay: "140ms" }}>
            <h3><Lock size={11} className="inline -mt-0.5 mr-1" />Immutable parameters</h3>
            <div className="ls-fact"><span>Total supply</span><strong>1,000,000,000</strong></div>
            <div className="ls-fact"><span>Curve / pool</span><strong>800M / 200M</strong></div>
            <div className="ls-fact"><span>Trading fee</span><strong>1.00%</strong></div>
            <div className="ls-fact"><span>Creator share</span><strong>25% of fees</strong></div>
            <div className="ls-fact"><span>LP lock</span><strong>4 years</strong></div>
            <Link href="/docs#lifecycle">Read lifecycle specification ↗</Link>
          </div>
        </aside>

        <section ref={cardRef} className="ls-card ls-reveal" style={{ animationDelay: "100ms" }} aria-live="polite">
          <div className="ls-card-head">
            <div>
              <div className="ls-kicker">Step {step + 1} of 4</div>
              <h2>{STEPS[step]?.title}</h2>
              <p>
                {step === 0 && "Define how your token appears on the launchpad, trade desk, and cashtag surfaces."}
                {step === 1 && "Set the HYPE the curve must raise before it freezes and liquidity migrates."}
                {step === 2 && "Cover the one-time deployment fee and any optional founder buy."}
                {step === 3 && "Verify every parameter. Supply, ticker, and reserves cannot change after deployment."}
              </p>
            </div>
            <span className="ls-pill">1B FIXED SUPPLY</span>
          </div>

          <div className="ls-body" key={step}>
            {step === 0 ? (
              <>
                <div className="ls-section ls-reveal">
                  <div className="ls-section-label"><span><Fingerprint size={12} /> Identity</span><small>Shown across Forge</small></div>
                  <div className="ls-grid-2">
                    <Field label="Token name" hint="2–28 characters.">
                      <Input value={name} onChange={setName} maxLength={28} placeholder="Your token name" />
                      <div className={cn("ls-inline-status", nameOk ? "ok" : "bad")}>{nameOk ? <><Check size={12} /> Valid name</> : <><AlertTriangle size={12} /> Name must be 2–28 characters</>}</div>
                    </Field>
                    <Field label="Ticker" hint="Becomes the HyperCore spot ticker.">
                      <Input value={symbol} onChange={(v) => setSymbol(normalizeSymbol(v))} maxLength={6} placeholder="TICKER" />
                      <div className={cn("ls-inline-status", symbolOk ? "ok" : "bad")}>
                        {symbolOk ? <><BadgeCheck size={12} /> ${symbol} is available</> : <><AlertTriangle size={12} /> {taken ? `$${symbol} is already launched` : symbolErr ?? "Enter 2–6 characters"}</>}
                      </div>
                      {suggestions.length ? (
                        <div className="ls-suggest">
                          <span>Try instead:</span>
                          {suggestions.map((s) => <button key={s} type="button" onClick={() => setSymbol(s)}>${s}</button>)}
                        </div>
                      ) : null}
                    </Field>
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "60ms" }}>
                  <div className="ls-section-label"><span>Description</span><span className="ls-counter">{description.length} / 280</span></div>
                  <TextArea value={description} onChange={setDescription} maxLength={280} rows={3} placeholder="What does your token do, and why does it exist?" />
                  <div className="ls-count-bar"><i style={{ width: `${(description.length / 280) * 100}%` }} /></div>
                  <p className="ls-help">Appears on the token page and in the trade desk instrument header. Keep it specific.</p>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "120ms" }}>
                  <div className="ls-section-label"><span>Sector</span><small>Used for discovery filters</small></div>
                  <div className="ls-sectors">
                    {SECTORS.map((s) => (
                      <button key={s.id} type="button" className="ls-preset ls-sector" data-active={category === s.id} onClick={() => setCategory(s.id)}>
                        <s.icon size={15} />
                        <b style={{ fontFamily: "inherit" }}>{s.label}</b><span>{s.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "180ms" }}>
                  <div className="ls-section-label"><span>Brand</span><small>Monogram & accent</small></div>
                  <div className="ls-grid-2">
                    <div className="flex flex-wrap gap-2">
                      {MONOGRAMS.map((g) => { const Icon = TOKEN_ICONS[g]; return (
                        <button key={g} type="button" className="ls-glyph" data-active={glyph === g} onClick={() => setGlyph(g)} aria-label={`Monogram ${g}`} title={g}><Icon size={16} /></button>
                      ); })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {ACCENTS.map((a) => <button key={a} type="button" className="ls-swatch" data-active={accent === a} style={{ background: a }} onClick={() => setAccent(a)} aria-label={`Accent ${a}`} />)}
                    </div>
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "240ms" }}>
                  <div className="ls-section-label"><span><AtSign size={12} /> Social & receipts</span><small>Optional</small></div>
                  <Field label="X handle" hint="Used for X Money receipts and cashtag verification.">
                    <Input value={xHandle} onChange={setXHandle} maxLength={20} placeholder="@yourhandle" />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="ls-section ls-reveal">
                  <div className="ls-section-label"><span><TrendingUp size={12} /> Graduation target</span><small>HYPE raised before the curve freezes</small></div>
                  <div className="ls-target">
                    <strong key={target} className="ls-pop">{fmtNum(target, 0)}<small>HYPE</small></strong>
                    <span>≈ {fmtUsd(target * price)} pool seed · range 6–400</span>
                  </div>
                  <input type="range" aria-label="Graduation target in HYPE" min={6} max={400} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="mt-3 w-full" />
                  <div className="ls-presets">
                    {PRESETS.map((p) => (
                      <button key={p.v} type="button" className="ls-preset" data-active={target === p.v} onClick={() => setTarget(p.v)}>
                        <b>{p.v} HYPE</b><span>{p.tag} · {p.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "70ms" }}>
                  <div className="ls-section-label"><span>Price path</span><small>Constant-product, virtual reserves</small></div>
                  <div className="ls-metrics">
                    <div className="ls-metric"><span>Start price</span><strong>{fmtPrice(preview.first)}</strong><small>HYPE · mcap {fmtUsd(preview.initialMcap * price)}</small></div>
                    <div className="ls-metric"><span>Graduation price</span><strong>{fmtPrice(preview.end)}</strong><small>HYPE · mcap {fmtUsd(preview.endMcap * price)}</small></div>
                    <div className="ls-metric"><span>Curve multiple</span><strong key={target} className="ls-pop">{preview.multiple.toFixed(1)}×</strong><small>start → graduation</small></div>
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "140ms" }}>
                  <div className="ls-section-label"><span>Founder buy</span><small>Optional · capped at 3 HYPE on testnet</small></div>
                  <div className="flex flex-wrap gap-2">
                    <div className="min-w-[160px] flex-1"><Input value={initialBuy} onChange={(v) => setInitialBuy(Math.min(3, Math.max(0, Number(v) || 0)))} type="number" suffix="HYPE" /></div>
                    {[0, 0.25, 0.5, 1].map((amt) => <Btn key={amt} variant={initialBuy === amt ? "primary" : "outline"} onClick={() => setInitialBuy(amt)}>{amt === 0 ? "None" : `${amt}`}</Btn>)}
                  </div>
                  <div className="ls-receipt mt-3">
                    <div className="ls-receipt-row"><span>Estimated tokens received</span><strong>{initialBuy > 0 ? `${fmtCompact(founderTokens, 1)} ${symbol || "tokens"}` : "—"}</strong></div>
                    <div className="ls-receipt-row"><span>Share of total supply</span><strong>{initialBuy > 0 ? `${founderPct.toFixed(2)}%` : "0.00%"}</strong></div>
                  </div>
                  <p className="ls-help">Founder buys execute at the opening price. Zero founder allocation is the cleanest launch.</p>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "200ms" }}>
                  <div className="ls-note">800,000,000 tokens are sold on the curve. The remaining 200,000,000 seed the liquidity pool at graduation and are locked for 4 years. A 1% fee applies to the HYPE leg; 25% of that fee goes to you as creator.</div>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="ls-section ls-reveal">
                  <div className="ls-section-label"><span><Wallet size={12} /> Payment method</span><small>One-time deployment fee</small></div>
                  <div className="ls-methods">
                    <button type="button" className="ls-method" data-active={payWith === "hype"} onClick={() => setPayWith("hype")}>
                      <div className="ls-method-top"><b className="inline-flex items-center gap-1.5"><Coins size={14} /> HYPE balance</b><Badge tone="up">Instant</Badge></div>
                      <p>Settle {fmtHype(fee)} directly from your testnet HYPE. Founder buy, if any, is debited together.</p>
                    </button>
                    <button type="button" className="ls-method" data-active={payWith === "x_money"} onClick={() => setPayWith("x_money")}>
                      <div className="ls-method-top"><b className="inline-flex items-center gap-1.5"><AtSign size={14} /> X Money rail</b><Badge tone="ice">Sandbox</Badge></div>
                      <p>Settle the USD equivalent via an X handle transfer with a single-use receipt reference.</p>
                    </button>
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "70ms" }}>
                  <div className="ls-section-label"><span>Cost breakdown</span><small>HYPE @ {fmtUsd(price)}</small></div>
                  {payWith === "hype" ? (
                    <div className="ls-receipt">
                      <div className="ls-receipt-row"><span>Deployment fee</span><strong>{fmtHype(fee)}</strong></div>
                      <div className="ls-receipt-row"><span>Founder buy</span><strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong></div>
                      <div className="ls-receipt-row"><span>Available HYPE</span><strong>{user ? fmtHype(user.hype) : "Sign in to view"}</strong></div>
                      <div className="ls-receipt-row total"><span>Total required</span><strong>{fmtHype(totalRequired)}</strong></div>
                    </div>
                  ) : (
                    <div className="ls-receipt">
                      <div className="ls-receipt-row"><span>USD equivalent</span><strong>{fmtUsd(fee * price)}</strong></div>
                      <div className="ls-receipt-row"><span>Recipient handle</span><strong>@{xHandle || user?.xHandle || "forge_xyz"}</strong></div>
                      <div className="ls-receipt-row"><span>Founder buy (HYPE)</span><strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong></div>
                      <div className="ls-receipt-row"><span>Settlement mode</span><strong>{intent?.live ? "Live payment" : "Sandbox verification"}</strong></div>
                    </div>
                  )}
                  {payWith === "hype" && insufficient ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-[#e7c4ca] bg-[#f9e7e9] px-3 py-2 text-xs font-medium text-down"><AlertTriangle size={13} /> Insufficient HYPE. Use the Faucet in the top navigation, or switch to X Money.</div>
                  ) : null}
                </div>

                {payWith === "x_money" ? (
                  <div className="ls-section ls-reveal" style={{ animationDelay: "140ms" }}>
                    <div className="ls-section-label"><span>X Money receipt</span><small>{intent ? intent.reference : "Not created"}</small></div>
                    {!intent ? (
                      <Btn variant="outline" loading={busy} onClick={checkout}>{user ? "Create payment request" : "Sign in to pay"}</Btn>
                    ) : intent.status === "succeeded" ? (
                      <div className="flex items-center gap-2 rounded-md border border-[#c9ddc1] bg-[#e5f1de] px-3 py-2 text-xs font-semibold text-[#1d472f]"><BadgeCheck size={14} /> Payment confirmed · Reference {intent.reference}</div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs leading-relaxed text-[#5c7055]">Send <strong>{fmtUsd(intent.amountUsd)}</strong> to <strong>@{intent.handle}</strong> with memo <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[#1d472f]">{intent.memo}</span>.</p>
                        <a className="small-link" href={intent.deeplink} target="_blank" rel="noreferrer">Open X transfer ↗</a>
                        <Field label="Confirmation code" hint={intent.live ? "Provided by X Money." : `Sandbox code: ${intent.code}`}>
                          <Input value={code} onChange={setCode} placeholder="6 digits" maxLength={6} />
                        </Field>
                        <Btn loading={busy} onClick={settle}>Confirm payment</Btn>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="ls-section ls-reveal" style={{ animationDelay: "200ms" }}>
                  <div className="ls-note">Testnet sandbox: no real funds are debited. Live X Money settlement is disabled; a verified merchant integration is required.</div>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="ls-section ls-reveal">
                  <div className="ls-section-label"><span>Deployment summary</span><small>Immutable after launch</small></div>
                  <div className="ls-receipt">
                    <div className="ls-receipt-row"><span>Token & ticker</span><strong>{name} · ${symbol}</strong></div>
                    <div className="ls-receipt-row"><span>Sector</span><strong className="capitalize">{category}</strong></div>
                    <div className="ls-receipt-row"><span>Fixed supply</span><strong>1,000,000,000 · 800M curve / 200M pool</strong></div>
                    <div className="ls-receipt-row"><span>Graduation target</span><strong>{fmtHype(target)} · ≈ {fmtUsd(target * price)}</strong></div>
                    <div className="ls-receipt-row"><span>Founder buy</span><strong>{initialBuy ? `${fmtHype(initialBuy)} · ${founderPct.toFixed(2)}%` : "None"}</strong></div>
                    <div className="ls-receipt-row"><span>Settlement</span><strong>{payWith === "hype" ? "HYPE balance" : `X Money · ${intent?.reference ?? "—"}`}</strong></div>
                    <div className="ls-receipt-row"><span>Deployer</span><strong>{user ? <Copyable text={user.wallet} label={shortAddr(user.wallet, 6)} /> : "Not signed in"}</strong></div>
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "80ms" }}>
                  <div className="ls-section-label"><span>Readiness checklist</span><small>{readyCount} / {checks.length} passed</small></div>
                  <div>
                    {checks.map((c, i) => (
                      <div key={c.label} className="ls-check ls-reveal" style={{ animationDelay: `${120 + i * 50}ms` }}>
                        <span className={cn("ls-check-mark", c.ok ? "ok" : "no")}>{c.ok ? <Check size={12} strokeWidth={3} /> : <AlertTriangle size={12} />}</span>
                        <span><b>{c.label}</b><small>{c.detail}</small></span>
                        {!c.ok ? <button type="button" onClick={() => (c.label === "Deployer account" ? setAuthModal("login") : setStep(c.fix))}>Fix →</button> : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#21824a]"><Check size={11} /> Ready</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ls-section ls-reveal" style={{ animationDelay: "200ms" }}>
                  <div className="ls-note">Deploying on Elysium Testnet ({ELYSIUM.chainId}). Token supply, ticker symbol, and curve reserves are immutable once deployed. Graduation and the 4-year LP lock are enforced by the lifecycle, not by you.</div>
                </div>
              </>
            ) : null}
          </div>

          <div className="ls-foot">
            {step > 0 ? (
              <Btn variant="outline" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</Btn>
            ) : (
              <span className="ls-foot-note">Parameters remain editable until final deployment.</span>
            )}
            <div className="flex items-center gap-3">
              <span className="ls-foot-note hidden sm:inline">{step < 3 ? <>Next: <b>{STEPS[step + 1]?.title}</b></> : <><b>{readyCount}/{checks.length}</b> checks passed</>}</span>
              {step < 2 ? (
                <Btn size="lg" onClick={next} disabled={!canContinue}>Continue <ArrowRight size={15} /></Btn>
              ) : step === 2 ? (
                !user ? <Btn size="lg" onClick={() => setAuthModal("login")}>Sign in to continue</Btn> : <Btn size="lg" onClick={next} disabled={!canContinue}>Review launch <ArrowRight size={15} /></Btn>
              ) : (
                <Btn size="lg" loading={busy} onClick={deploy} disabled={!allReady}>{deployLabel}</Btn>
              )}
            </div>
          </div>
        </section>

        <aside className="ls-preview">
          <div className="ls-sheet ls-reveal" style={{ animationDelay: "120ms" }}>
            <div className="ls-sheet-head"><span>Live token sheet</span><Badge tone="slate" className="capitalize">{category}</Badge></div>
            <div className="ls-sheet-body">
              <div className="ls-identity">
                <TokenGlyph glyph={glyph} accent={accent} size={48} />
                <div className="min-w-0"><h3>{name || "Untitled token"}</h3><small>${symbol || "TICKER"} · Elysium</small></div>
              </div>
              <p className="ls-desc">{description || "Provide a clear summary of your project, asset mechanics, or community."}</p>

              <div className="ls-price-row">
                <div className="ls-price-cell"><span>Start price</span><strong>{fmtPrice(preview.first)}</strong><small>HYPE · {fmtUsd(preview.first * price)}</small></div>
                <div className="ls-price-cell"><span>Graduation price</span><strong>{fmtPrice(preview.end)}</strong><small>HYPE · {preview.multiple.toFixed(1)}× start</small></div>
              </div>

              <div className="ls-chart">
                <div className="ls-chart-head"><span>Bonding curve preview</span><b key={target} className="ls-pop">{preview.multiple.toFixed(1)}× to graduation</b></div>
                <BondingCurveChart line={preview.line} first={preview.first} end={preview.end} accent={accent} priceUsd={price} />
              </div>

              <div className="ls-supply">
                <div className="ls-supply-head"><span>Supply allocation</span><span className="font-mono">1,000,000,000</span></div>
                <div className="ls-supply-bar">
                  <i style={{ width: `${Math.max(0, 80 - founderPct)}%`, background: accent }} />
                  <i style={{ width: "20%", background: "#1d472f" }} />
                  <i style={{ width: `${Math.min(founderPct, 80)}%`, background: "#b89447" }} />
                </div>
                <div className="ls-supply-legend">
                  <div><i style={{ background: accent }} />Curve<b>{(80 - founderPct).toFixed(1)}%</b></div>
                  <div><i style={{ background: "#1d472f" }} />Locked pool<b>20%</b></div>
                  <div><i style={{ background: "#b89447" }} />Founder<b>{founderPct.toFixed(2)}%</b></div>
                  <div><i style={{ background: "#e6eddf" }} />Unminted<b>0%</b></div>
                </div>
              </div>

              <div className="ls-rows">
                <div className="ls-row"><span>Graduation target</span><strong>{fmtNum(target, 0)} HYPE</strong></div>
                <div className="ls-row"><span>Pool seed at graduation</span><strong>{fmtUsd(target * price)}</strong></div>
                <div className="ls-row"><span>Graduation market cap</span><strong>{fmtUsd(preview.endMcap * price)}</strong></div>
                <div className="ls-row"><span>Fee / creator share</span><strong>1.00% / 25%</strong></div>
                <div className="ls-row"><span>Post-curve path</span><strong>Pool → HyperCore → HIP-3</strong></div>
              </div>
            </div>
          </div>

          <div className="ls-cost ls-reveal" style={{ animationDelay: "180ms" }}>
            <h3><Coins size={11} className="inline -mt-0.5 mr-1" />Deployment cost</h3>
            <div className="ls-cost-row"><span>Deployment fee</span><strong>{fmtHype(fee)}</strong></div>
            <div className="ls-cost-row"><span>Founder buy</span><strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong></div>
            <div className="ls-cost-row"><span>Settlement</span><strong>{payWith === "hype" ? "HYPE" : xPaid ? "X Money ✓" : "X Money"}</strong></div>
            <div className="ls-cost-total"><span>Total</span><strong key={totalRequired} className="ls-pop">{fmtNum(totalRequired, 2)} <small>HYPE</small></strong></div>
            <div className="mt-1 text-right text-[11px] text-[#b7cda9]">≈ {fmtUsd(totalRequired * price)}</div>
            {insufficient && payWith === "hype" ? <div className="ls-warn">Balance short by {fmtHype(totalRequired - (user?.hype ?? 0))}. Use the faucet.</div> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
