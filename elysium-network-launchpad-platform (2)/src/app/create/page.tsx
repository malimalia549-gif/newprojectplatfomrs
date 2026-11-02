"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Badge, Btn, Copyable, Field, Input, Panel, Segmented, Sparkline, TextArea, TokenGlyph } from "@/components/ui";
import { CURVE, marginalPrice } from "@/lib/curve";
import { ELYSIUM, cn, fmtHype, fmtNum, fmtPrice, fmtUsd, normalizeSymbol, shortAddr, symbolIssue } from "@/lib/util";

const STEPS = ["Token details", "Curve", "Payment", "Review"];
const ACCENTS = ["#6a9744", "#7c9f9c", "#a6a1c3", "#ccaf73", "#b98c86", "#88a8c3"];
const GLYPHS = ["◆", "✦", "▲", "◍", "⬢", "⌬"];

type Intent = { reference: string; amountUsd: number; amountHype: number; handle: string; memo: string; code?: string; deeplink: string; live: boolean; status: string };

export default function CreatePage() {
  const { user, setAuthModal, refresh, push } = useForge();
  const router = useRouter();
  const net = useLive<{ prices: { hypeUsd: number } }>("/api/network", 8000);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Volta Labs");
  const [symbol, setSymbol] = useState("VOLTA");
  const [description, setDescription] = useState("An inference marketplace for Elysium. Launch on a curve, graduate to HyperCore, and reach a perpetual market.");
  const [category, setCategory] = useState<"meme" | "infra" | "rwa" | "gaming" | "ai" | "dao">("infra");
  const [glyph, setGlyph] = useState("◆");
  const [accent, setAccent] = useState("#6a9744");
  const [xHandle, setXHandle] = useState("");
  const [target, setTarget] = useState(45);
  const [initialBuy, setInitialBuy] = useState(0);
  const [payWith, setPayWith] = useState<"hype" | "x_money">("hype");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [deployed, setDeployed] = useState<{ slug: string; symbol: string } | null>(null);
  const price = net.data?.prices.hypeUsd ?? 28.4;
  const fee = 0.05;
  const invalid = symbolIssue(symbol);

  const preview = useMemo(() => {
    const h = (target * 273) / 800;
    const t = 1_073_000_000;
    const first = h / t;
    const end = (h + target * 0.99) / (t - 800_000_000);
    const line = Array.from({ length: 48 }, (_, i) => {
      const sold = i === 0 ? 0 : (CURVE.sellable * i) / 47;
      return marginalPrice({ sold, raised: h * (t / (t - sold) - 1), graduationHype: target });
    });
    return { first, end, line, initialMcap: first * CURVE.totalSupply, endMcap: end * CURVE.totalSupply };
  }, [target]);

  const next = () => { if (step === 0 && (invalid || name.trim().length < 2)) return push({ kind: "error", title: "Check your token details", body: invalid ?? "Enter a name of at least two characters." }); setStep((s) => Math.min(3, s + 1)); };

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
      push({ kind: "success", title: "Payment confirmed" });
      await refresh();
    } catch (e) { push({ kind: "error", title: "Could not confirm payment", body: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const deploy = async () => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      const res = await api<{ detail: { slug: string; symbol: string } }>("/api/launches", {
        json: { action: "create", name, symbol, description, category, glyph, accent, xHandle: xHandle || undefined, graduationHype: target, initialBuyHype: initialBuy, paymentRef: payWith === "x_money" && intent?.status === "succeeded" ? intent.reference : undefined },
      });
      setDeployed(res.detail);
      await refresh();
      push({ kind: "success", title: `${res.detail.symbol} is live`, body: "Your fixed-supply token is now trading on the curve." });
    } catch (e) { push({ kind: "error", title: "Deployment declined", body: (e as Error).message }); }
    finally { setBusy(false); }
  };

  if (deployed) return <div className="forge-page"><div className="mx-auto max-w-xl py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e4f0d6] text-2xl text-[#517b36]">✓</span><h1 className="mt-6 text-4xl font-bold text-[#2e5720]">${deployed.symbol} is live.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#657659]">Your one-billion-token supply is in the launch pool. The curve is open, and the lifecycle is ready to progress.</p><div className="mt-8 flex justify-center gap-3"><Btn href={`/token/${deployed.slug}`} size="lg">Open token</Btn><Btn href="/launch" size="lg" variant="outline">View launchpad</Btn></div></div></div>;

  return (
    <div className="forge-page">
      <nav className="mb-6 flex items-center gap-2 text-[11px] text-[#67745b]"><Link href="/launch" className="hover:text-[#517936]">Launchpad</Link><span>/</span><span className="text-[#577840]">Create</span></nav>
      <div className="app-title-row">
        <div><div className="eyebrow">Create a launch</div><h1>Bring your token to Elysium.</h1><p>Fixed supply, a transparent bonding curve, and a clear path to HyperCore. Start with the details; the platform handles the lifecycle.</p></div>
        <Badge tone="ice">Elysium testnet · {ELYSIUM.chainId}</Badge>
      </div>

      <div className="workspace mt-9">
        <div className="min-w-0">
          <ol className="stepper" aria-label="Launch creation steps">{STEPS.map((label, i) => <li key={label}><button className={cn("stepper-button", i === step && "active", i < step && "complete")} onClick={() => i < step && setStep(i)} disabled={i >= step} aria-current={i === step ? "step" : undefined}><span className="stepper-number">{i < step ? "✓" : i + 1}</span>{label}</button></li>)}</ol>
          <div className="tab-content min-w-0">
            {step === 0 ? <div className="space-y-6">
              <div className="form-grid"><Field label="Token name" hint="Choose a name that is 2–28 characters."><Input value={name} onChange={setName} maxLength={28} placeholder="Your token name" /></Field><Field label="Ticker" hint={invalid ?? "This symbol will become your HyperCore ticker."}><Input value={symbol} onChange={(v) => setSymbol(normalizeSymbol(v))} maxLength={6} placeholder="TICKER" /></Field></div>
              {invalid ? <p className="text-xs text-down">{invalid}</p> : null}
              <Field label="Description" hint={`${description.length} / 280 characters`}><TextArea value={description} onChange={setDescription} maxLength={280} rows={4} placeholder="What does your token do?" /></Field>
              <Field label="Category"><Segmented value={category} onChange={(v) => setCategory(v)} options={[{ value: "infra", label: "Infrastructure" }, { value: "ai", label: "AI" }, { value: "meme", label: "Meme" }, { value: "rwa", label: "RWA" }, { value: "gaming", label: "Gaming" }, { value: "dao", label: "DAO" }]} /></Field>
              <div className="form-grid"><Field label="Icon"><div className="flex flex-wrap gap-2">{GLYPHS.map((g) => <button key={g} type="button" onClick={() => setGlyph(g)} className={cn("grid h-10 w-10 place-items-center rounded-lg border text-base", glyph === g ? "border-[#91b776] bg-[#eaf3df] text-[#547b36]" : "border-[#dfe8d2] bg-white text-[#68765a]")} aria-label={`Use ${g} icon`}>{g}</button>)}</div></Field><Field label="Accent"><div className="flex gap-2">{ACCENTS.map((a) => <button type="button" key={a} onClick={() => setAccent(a)} className={cn("h-8 w-8 rounded-full border-4 border-white", accent === a ? "ring-2 ring-[#8fad76]" : "ring-1 ring-[#e0e9d4]")} style={{ background: a }} aria-label={`Accent ${a}`} />)}</div></Field></div>
              <Field label="X handle (optional)" hint="Used for X Money payments and cashtag listings."><Input value={xHandle} onChange={setXHandle} maxLength={20} placeholder="@yourhandle" /></Field>
              <div className="flex gap-3 border-t border-[#e0ead5] pt-5"><Btn size="lg" onClick={next}>Continue</Btn><span className="my-auto text-[11px] text-[#647558]">Your details are saved while you complete this form.</span></div>
            </div> : null}

            {step === 1 ? <div className="space-y-8">
              <Field label="Graduation target" hint="The curve freezes when 800 million tokens have been bought. A higher target seeds a deeper pool."><div className="mt-4 flex items-baseline justify-between"><span className="tabular text-3xl font-semibold tracking-tight text-[#38652b]">{fmtNum(target, 0)} <span className="text-sm font-normal text-[#647657]">HYPE</span></span><span className="tabular text-xs text-[#657858]">≈ {fmtUsd(target * price)}</span></div><input type="range" aria-label="Graduation target in HYPE" min={6} max={400} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="mt-5 w-full" /></Field>
              <div className="metrics-strip grid-cols-2"><div><span className="text-xs text-[#647457]">Starting price</span><div className="tabular mt-2 text-lg font-semibold text-[#4e7c37]">{fmtPrice(preview.first)} HYPE</div></div><div><span className="text-xs text-[#647457]">Graduation price</span><div className="tabular mt-2 text-lg font-semibold text-[#4e7c37]">{fmtPrice(preview.end)} HYPE</div></div></div>
              <Field label="Initial buy (optional)" hint="Capped at 3 HYPE for a testnet founder buy. You can also start without a buy."><div className="flex gap-3"><div className="flex-1"><Input value={initialBuy} onChange={(v) => setInitialBuy(Math.min(3, Math.max(0, Number(v) || 0)))} type="number" suffix="HYPE" /></div><Btn variant="outline" onClick={() => setInitialBuy(0.25)}>0.25</Btn><Btn variant="outline" onClick={() => setInitialBuy(0.5)}>0.5</Btn><Btn variant="outline" onClick={() => setInitialBuy(1)}>1</Btn></div></Field>
              <div className="form-note">Supply: 1 billion. Curve: 800 million. Liquidity reserve: 200 million. The HYPE leg carries a 1% fee, with 25% of the fee allocated to the creator.</div>
              <div className="flex gap-3"><Btn variant="outline" size="lg" onClick={() => setStep(0)}>Back</Btn><Btn size="lg" onClick={next}>Continue</Btn></div>
            </div> : null}

            {step === 2 ? <div className="space-y-7">
              <Field label="Payment method"><Segmented value={payWith} onChange={(v) => setPayWith(v)} options={[{ value: "hype", label: "HYPE balance" }, { value: "x_money", label: "X Money" }]} /></Field>
              {payWith === "hype" ? <div className="surface p-5"><div className="summary-row"><span>Launch fee</span><strong>{fmtHype(fee)}</strong></div><div className="summary-row"><span>Initial buy</span><strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong></div><div className="summary-row"><span>Balance</span><strong>{user ? fmtHype(user.hype) : "Sign in to view"}</strong></div><div className="summary-row"><span>Total</span><strong>{fmtHype(fee + initialBuy)}</strong></div></div> : <div className="surface p-5"><div className="summary-row"><span>Amount</span><strong>{fmtUsd(fee * price)}</strong></div><div className="summary-row"><span>Send to</span><strong>@{xHandle || user?.xHandle || "forge_xyz"}</strong></div><div className="summary-row"><span>Mode</span><strong>{intent?.live ? "Live payment" : "Sandbox payment"}</strong></div>{!intent ? <Btn className="mt-4" variant="outline" loading={busy} onClick={checkout}>{user ? "Create payment request" : "Sign in to pay"}</Btn> : intent.status === "succeeded" ? <Badge tone="up" className="mt-4">Payment confirmed</Badge> : <div className="mt-5 space-y-5"><p className="text-xs leading-relaxed text-[#617751]">Send {fmtUsd(intent.amountUsd)} to @{intent.handle}, with memo <span className="font-mono text-[#567a39]">{intent.memo}</span>.</p><a className="small-link" href={intent.deeplink} target="_blank" rel="noreferrer">Open X ↗</a><Field label="Confirmation code" hint={intent.live ? "Provided by X Money." : `Sandbox code: ${intent.code}`}><Input value={code} onChange={setCode} placeholder="6 digits" maxLength={6} /></Field><Btn loading={busy} onClick={settle}>Confirm payment</Btn></div>}</div>}
              <div className="form-note">No real funds are used here. X Money is a sandbox payment rail in this preview. Live transactions require an approved merchant integration.</div>
              <div className="flex gap-3"><Btn variant="outline" size="lg" onClick={() => setStep(1)}>Back</Btn>{!user ? <Btn size="lg" onClick={() => setAuthModal("login")}>Sign in to continue</Btn> : <Btn size="lg" onClick={next} disabled={payWith === "x_money" && intent?.status !== "succeeded"}>Review launch</Btn>}</div>
            </div> : null}

            {step === 3 ? <div className="space-y-7"><div className="surface p-6"><div className="summary-row"><span>Token</span><strong>{name} · ${symbol}</strong></div><div className="summary-row"><span>Category</span><strong className="capitalize">{category}</strong></div><div className="summary-row"><span>Graduation target</span><strong>{fmtHype(target)}</strong></div><div className="summary-row"><span>Initial buy</span><strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong></div><div className="summary-row"><span>Payment</span><strong>{payWith === "hype" ? "HYPE balance" : "X Money"}</strong></div><div className="summary-row"><span>Deployer</span><strong><Copyable text={user?.wallet ?? ""} label={shortAddr(user?.wallet, 6)} /></strong></div></div><div className="form-note">You are deploying on the Elysium testnet. Check the ticker and curve target before you continue. A launched token cannot be renamed or change its supply.</div><div className="flex gap-3"><Btn variant="outline" size="lg" onClick={() => setStep(2)}>Back</Btn><Btn size="lg" loading={busy} onClick={deploy}>Deploy ${symbol}</Btn></div></div> : null}
          </div>
        </div>

        <aside className="trade-ticket">
          <Panel className="side-ticket"><div className="mb-4 text-[11px] font-medium text-[#657858]">Live preview</div><div className="flex items-center gap-3.5"><TokenGlyph glyph={glyph} accent={accent} size={46} /><div className="min-w-0"><h2 className="truncate text-lg font-semibold tracking-tight text-[#395c2a]">{name || "Untitled token"}</h2><div className="mt-0.5 font-mono text-[11px] text-[#647354]">${symbol || "TICKER"}</div></div></div><p className="mt-4 line-clamp-3 text-xs leading-relaxed text-[#657858]">{description || "Tell the market about your project."}</p><div className="mt-5 border-t border-[#e1ead5] pt-5"><div className="text-[10px] text-[#647558]">Initial token price · HYPE</div><div className="tabular mt-1 text-2xl font-semibold text-[#3e6a29]">{fmtPrice(preview.first)}</div><div className="mt-5"><Sparkline values={preview.line} accent="#76a74d" height={100} /></div><div className="mt-1 flex justify-between text-[9px] text-[#69755c]"><span>0</span><span>Bonding curve · theoretical</span><span>800M</span></div></div><div className="mt-6"><div className="summary-row"><span>Supply</span><strong>1,000,000,000</strong></div><div className="summary-row"><span>Curve fee</span><strong>1.00%</strong></div><div className="summary-row"><span>Creator share</span><strong>25%</strong></div><div className="summary-row"><span>Graduation target</span><strong>{target} HYPE</strong></div></div></Panel>
          <div className="tip-card mt-4"><h3>What happens next?</h3><p className="text-xs leading-relaxed">At 800M sold, the curve freezes. Anyone can trigger graduation to a liquidity pool and a HyperCore spot book. A HIP-3 perpetual can follow.</p><Link href="/docs#lifecycle" className="small-link mt-3">Read the lifecycle guide ↗</Link></div>
        </aside>
      </div>
    </div>
  );
}
