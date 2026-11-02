"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Badge, Btn, Copyable, Field, Input, Segmented, Sparkline, TextArea, TokenGlyph } from "@/components/ui";
import { CURVE, marginalPrice } from "@/lib/curve";
import { ELYSIUM, cn, fmtHype, fmtNum, fmtPrice, fmtUsd, normalizeSymbol, shortAddr, symbolIssue } from "@/lib/util";

const STEPS = [
  { title: "Token details", sub: "Identity & sector" },
  { title: "Bonding curve", sub: "Target & initial buy" },
  { title: "Settlement", sub: "HYPE or X Money" },
  { title: "Review & deploy", sub: "Confirm parameters" },
];

const ACCENTS = ["#6a9744", "#4f837f", "#7e77ab", "#b89447", "#ad6e68", "#5b82a6"];
const GLYPHS = ["◆", "✦", "▲", "◍", "⬢", "⌬"];

type Intent = {
  reference: string;
  amountUsd: number;
  amountHype: number;
  handle: string;
  memo: string;
  code?: string;
  deeplink: string;
  live: boolean;
  status: string;
};

export default function CreatePage() {
  const { user, setAuthModal, refresh, push } = useForge();
  const net = useLive<{ prices: { hypeUsd: number } }>("/api/network", 8000);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("Volta Labs");
  const [symbol, setSymbol] = useState("VOLTA");
  const [description, setDescription] = useState(
    "An inference marketplace for Elysium. Launch on a curve, graduate to HyperCore, and reach a perpetual market.",
  );
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

  const next = () => {
    if (step === 0 && (invalid || name.trim().length < 2)) {
      return push({
        kind: "error",
        title: "Check your token details",
        body: invalid ?? "Enter a name of at least two characters.",
      });
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const checkout = async () => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      const res = await api<Intent>("/api/launches", {
        json: { action: "checkout", handle: xHandle || user.xHandle || "forge_xyz", hype: fee },
      });
      setIntent(res);
    } catch (e) {
      push({ kind: "error", title: "Payment request failed", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const settle = async () => {
    if (!intent) return;
    setBusy(true);
    try {
      await api("/api/launches", { json: { action: "settle", reference: intent.reference, code } });
      setIntent({ ...intent, status: "succeeded" });
      push({ kind: "success", title: "Payment confirmed" });
      await refresh();
    } catch (e) {
      push({ kind: "error", title: "Could not confirm payment", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const deploy = async () => {
    if (!user) return setAuthModal("login");
    setBusy(true);
    try {
      const res = await api<{ detail: { slug: string; symbol: string } }>("/api/launches", {
        json: {
          action: "create",
          name,
          symbol,
          description,
          category,
          glyph,
          accent,
          xHandle: xHandle || undefined,
          graduationHype: target,
          initialBuyHype: initialBuy,
          paymentRef: payWith === "x_money" && intent?.status === "succeeded" ? intent.reference : undefined,
        },
      });
      setDeployed(res.detail);
      await refresh();
      push({ kind: "success", title: `${res.detail.symbol} is live`, body: "Your fixed-supply token is now trading on the curve." });
    } catch (e) {
      push({ kind: "error", title: "Deployment declined", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (deployed) {
    return (
      <div className="forge-page">
        <div className="surface mx-auto max-w-xl p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e4f0d6] text-2xl font-bold text-[#22874d]">✓</span>
          <h1 className="mt-5 !text-3xl font-bold text-[#183225]">${deployed.symbol} is live.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#64775c]">
            Your 1,000,000,000 fixed-supply token is deployed in the launch pool. The bonding curve is open and ready to progress toward HyperCore graduation.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Btn href={`/token/${deployed.slug}`} size="lg">
              Open token
            </Btn>
            <Btn href="/launch" size="lg" variant="outline">
              View launchpad
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forge-page space-y-5">
      {/* Studio Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-xs text-[#6a7d60]">
            <Link href="/launch" className="font-medium hover:text-[#1d472f]">
              Launchpad
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#1d472f]">Create</span>
          </nav>
          <div className="eyebrow !mb-1.5">Token Deployment Studio</div>
          <h1 className="!text-3xl sm:!text-[36px]">Bring your token to Elysium.</h1>
          <p className="mt-2 max-w-xl text-sm text-[#64775c]">
            Fixed 1B supply, transparent constant-product curve, and permissionless graduation to locked liquidity and HyperCore markets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="ice">Elysium testnet · {ELYSIUM.chainId}</Badge>
          <Badge tone="slate">Fee {fee} HYPE</Badge>
        </div>
      </div>

      {/* Full-Width 4-Step Progress Bar Card */}
      <ol className="surface grid grid-cols-2 divide-y divide-[#e3eadc] overflow-hidden sm:grid-cols-4 sm:divide-x sm:divide-y-0" aria-label="Launch creation steps">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => {
                  if (i < step) setStep(i);
                  else if (i === step + 1) next();
                }}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition",
                  active ? "bg-[#eef4e7]" : done ? "bg-white hover:bg-[#f7faf4]" : "bg-[#fafcf8] opacity-75",
                )}
              >
                <span
                  className={cn(
                    "tabular grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold",
                    active
                      ? "bg-[#1d472f] text-white"
                      : done
                        ? "bg-[#dcebd3] text-[#1d472f]"
                        : "border border-[#d8e2cf] bg-white text-[#6d8065]",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <div className={cn("truncate text-xs font-bold", active ? "text-[#183225]" : "text-[#4c6147]")}>{s.title}</div>
                  <div className="truncate text-[11px] text-[#6d8065]">{s.sub}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Aligned 2-Column Studio Grid */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_364px]">
        {/* Left Column: Main Configuration Card */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e3eadc] px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-[#183225]">
                Step {step + 1} of 4 · {STEPS[step]?.title}
              </h2>
              <p className="text-xs text-[#6a7d60]">{STEPS[step]?.sub}</p>
            </div>
            <span className="font-mono text-[11px] text-[#6d8065]">1,000,000,000 FIXED</span>
          </div>

          <div className="tab-content p-6">
            {step === 0 ? (
              <div className="space-y-5">
                <div className="form-grid">
                  <Field label="Token name" hint="Choose a project or asset name (2–28 characters).">
                    <Input value={name} onChange={setName} maxLength={28} placeholder="Your token name" />
                  </Field>
                  <Field label="Ticker" hint={invalid ?? "2–6 characters; becomes your HyperCore ticker."}>
                    <Input value={symbol} onChange={(v) => setSymbol(normalizeSymbol(v))} maxLength={6} placeholder="TICKER" />
                  </Field>
                </div>
                {invalid ? <p className="rounded-md bg-[#f9e7e9] px-3 py-2 text-xs font-medium text-down">{invalid}</p> : null}

                <Field label="Description" hint={`${description.length} / 280 characters`}>
                  <TextArea value={description} onChange={setDescription} maxLength={280} rows={3} placeholder="What does your token do?" />
                </Field>

                <Field label="Sector category">
                  <Segmented
                    value={category}
                    onChange={(v) => setCategory(v)}
                    options={[
                      { value: "infra", label: "Infrastructure" },
                      { value: "ai", label: "AI" },
                      { value: "rwa", label: "RWA" },
                      { value: "meme", label: "Meme" },
                      { value: "gaming", label: "Gaming" },
                      { value: "dao", label: "DAO" },
                    ]}
                  />
                </Field>

                <div className="grid gap-5 rounded-xl border border-[#e3eadc] bg-[#fafcf8] p-4 sm:grid-cols-2">
                  <Field label="Token monogram">
                    <div className="flex flex-wrap gap-2">
                      {GLYPHS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGlyph(g)}
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-lg border text-sm transition",
                            glyph === g
                              ? "border-[#1d472f] bg-[#e8f0e2] font-bold text-[#1d472f]"
                              : "border-[#dce5d3] bg-white text-[#64775c] hover:border-[#b5c9ab]",
                          )}
                          aria-label={`Use ${g} icon`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Brand accent">
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {ACCENTS.map((a) => (
                        <button
                          type="button"
                          key={a}
                          onClick={() => setAccent(a)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 border-white transition",
                            accent === a ? "scale-110 ring-2 ring-[#1d472f]" : "ring-1 ring-[#d7e2ce]",
                          )}
                          style={{ background: a }}
                          aria-label={`Accent ${a}`}
                        />
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="X handle (optional)" hint="Used for X Money launch fee receipts and cashtag verification.">
                  <Input value={xHandle} onChange={setXHandle} maxLength={20} placeholder="@yourhandle" />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-[#314b34]">Graduation target</span>
                    <span className="tabular text-xs text-[#697c60]">≈ {fmtUsd(target * price)} pool seed</span>
                  </div>

                  {/* Quick Target Presets */}
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { v: 25, tag: "Lean" },
                      { v: 45, tag: "Standard" },
                      { v: 100, tag: "Deep LP" },
                      { v: 250, tag: "Institutional" },
                    ].map((preset) => (
                      <button
                        key={preset.v}
                        type="button"
                        onClick={() => setTarget(preset.v)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition",
                          target === preset.v
                            ? "border-[#1d472f] bg-[#eef4e7]"
                            : "border-[#dfe7d7] bg-white hover:border-[#b9ccb0]",
                        )}
                      >
                        <div className="tabular text-xs font-bold text-[#183225]">{preset.v} HYPE</div>
                        <div className="text-[10px] text-[#6b7e63]">{preset.tag}</div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#e3eadc] bg-[#fafcf8] p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="tabular text-2xl font-bold text-[#183225]">
                        {fmtNum(target, 0)} <span className="text-xs font-semibold text-[#5f7358]">HYPE</span>
                      </span>
                      <span className="text-[11px] text-[#6b7e63]">Range: 6 – 400 HYPE</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Graduation target in HYPE"
                      min={6}
                      max={400}
                      value={target}
                      onChange={(e) => setTarget(Number(e.target.value))}
                      className="mt-3 w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3.5">
                    <div className="text-[11px] text-[#6d8065]">Starting price</div>
                    <div className="tabular mt-1 font-mono text-sm font-bold text-[#183225]">{fmtPrice(preview.first)} HYPE</div>
                  </div>
                  <div className="rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3.5">
                    <div className="text-[11px] text-[#6d8065]">Graduation price</div>
                    <div className="tabular mt-1 font-mono text-sm font-bold text-[#183225]">{fmtPrice(preview.end)} HYPE</div>
                  </div>
                  <div className="col-span-2 rounded-lg border border-[#e3eadc] bg-[#fafcf8] p-3.5 sm:col-span-1">
                    <div className="text-[11px] text-[#6d8065]">Graduation mcap</div>
                    <div className="tabular mt-1 text-sm font-bold text-[#183225]">{fmtUsd(preview.endMcap * price)}</div>
                  </div>
                </div>

                <Field label="Initial founder buy (optional)" hint="Capped at 3 HYPE on testnet to prevent supply sniping. Leave at 0 for zero founder allocation.">
                  <div className="flex flex-wrap gap-2">
                    <div className="min-w-[160px] flex-1">
                      <Input
                        value={initialBuy}
                        onChange={(v) => setInitialBuy(Math.min(3, Math.max(0, Number(v) || 0)))}
                        type="number"
                        suffix="HYPE"
                      />
                    </div>
                    {[0, 0.25, 0.5, 1].map((amt) => (
                      <Btn key={amt} variant={initialBuy === amt ? "primary" : "outline"} onClick={() => setInitialBuy(amt)}>
                        {amt === 0 ? "None" : `${amt}`}
                      </Btn>
                    ))}
                  </div>
                </Field>

                <div className="form-note">
                  800,000,000 tokens are placed on the bonding curve and 200,000,000 are reserved for the 4-year locked liquidity pool upon graduation.
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPayWith("hype")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      payWith === "hype" ? "border-[#1d472f] bg-[#eef4e7]" : "border-[#dfe7d7] bg-white hover:border-[#b9ccb0]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#183225]">HYPE Balance</span>
                      <Badge tone="up">Instant</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-[#62755b]">Settle the 0.05 HYPE deployment fee directly from your testnet balance.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayWith("x_money")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      payWith === "x_money" ? "border-[#1d472f] bg-[#eef4e7]" : "border-[#dfe7d7] bg-white hover:border-[#b9ccb0]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#183225]">X Money Rail</span>
                      <Badge tone="ice">Sandbox</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-[#62755b]">Settle in USD via an X handle transfer with a single-use receipt reference.</p>
                  </button>
                </div>

                {payWith === "hype" ? (
                  <div className="rounded-xl border border-[#e3eadc] bg-[#fafcf8] px-4 py-2">
                    <div className="summary-row">
                      <span>Deployment fee</span>
                      <strong>{fmtHype(fee)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Initial founder buy</span>
                      <strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Available HYPE</span>
                      <strong>{user ? fmtHype(user.hype) : "Sign in to view"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Total required</span>
                      <strong>{fmtHype(fee + initialBuy)}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#e3eadc] bg-[#fafcf8] p-4 space-y-4">
                    <div className="divide-y divide-[#e3eadc]">
                      <div className="summary-row !pt-0">
                        <span>USD equivalent</span>
                        <strong>{fmtUsd(fee * price)}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Recipient handle</span>
                        <strong>@{xHandle || user?.xHandle || "forge_xyz"}</strong>
                      </div>
                      <div className="summary-row !pb-0">
                        <span>Settlement mode</span>
                        <strong>{intent?.live ? "Live payment" : "Sandbox verification"}</strong>
                      </div>
                    </div>

                    {!intent ? (
                      <Btn variant="outline" loading={busy} onClick={checkout}>
                        {user ? "Create payment request" : "Sign in to pay"}
                      </Btn>
                    ) : intent.status === "succeeded" ? (
                      <Badge tone="up">Payment confirmed · Reference {intent.reference}</Badge>
                    ) : (
                      <div className="space-y-3 border-t border-[#e3eadc] pt-3">
                        <p className="text-xs leading-relaxed text-[#5c7055]">
                          Send <strong>{fmtUsd(intent.amountUsd)}</strong> to <strong>@{intent.handle}</strong> with memo{" "}
                          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[#1d472f]">{intent.memo}</span>.
                        </p>
                        <a className="small-link" href={intent.deeplink} target="_blank" rel="noreferrer">
                          Open X transfer ↗
                        </a>
                        <Field label="Confirmation code" hint={intent.live ? "Provided by X Money." : `Sandbox code: ${intent.code}`}>
                          <Input value={code} onChange={setCode} placeholder="6 digits" maxLength={6} />
                        </Field>
                        <Btn loading={busy} onClick={settle}>
                          Confirm payment
                        </Btn>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-note">
                  Testnet sandbox: no real funds are debited. Live X Money settlement activates when merchant credentials are configured.
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#e3eadc] bg-[#fafcf8] px-5 py-2">
                  <div className="summary-row">
                    <span>Token & ticker</span>
                    <strong>
                      {name} · ${symbol}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Sector</span>
                    <strong className="capitalize">{category}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Fixed supply</span>
                    <strong>1,000,000,000 (800M curve / 200M pool)</strong>
                  </div>
                  <div className="summary-row">
                    <span>Graduation target</span>
                    <strong>
                      {fmtHype(target)} (≈ {fmtUsd(target * price)})
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Initial buy</span>
                    <strong>{initialBuy ? fmtHype(initialBuy) : "None"}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Payment method</span>
                    <strong>{payWith === "hype" ? "HYPE balance" : "X Money"}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Deployer account</span>
                    <strong>
                      <Copyable text={user?.wallet ?? ""} label={shortAddr(user?.wallet, 6)} />
                    </strong>
                  </div>
                </div>

                <div className="form-note">
                  Deploying on Elysium Testnet ({ELYSIUM.chainId}). Token supply, ticker symbol, and curve reserves are immutable once deployed.
                </div>
              </div>
            ) : null}
          </div>

          {/* Pinned Card Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3eadc] bg-[#fafcf8] px-6 py-4">
            {step > 0 ? (
              <Btn variant="outline" size="lg" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </Btn>
            ) : (
              <span className="text-xs text-[#6d8065]">Parameters remain editable until final deployment.</span>
            )}

            <div className="flex items-center gap-3">
              {step < 2 ? (
                <Btn size="lg" onClick={next}>
                  Continue
                </Btn>
              ) : step === 2 ? (
                !user ? (
                  <Btn size="lg" onClick={() => setAuthModal("login")}>
                    Sign in to continue
                  </Btn>
                ) : (
                  <Btn size="lg" onClick={next} disabled={payWith === "x_money" && intent?.status !== "succeeded"}>
                    Review launch
                  </Btn>
                )
              ) : (
                <Btn size="lg" loading={busy} onClick={deploy}>
                  Deploy ${symbol}
                </Btn>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Live Token Sheet */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e3eadc] px-5 py-3.5">
              <span className="text-xs font-semibold text-[#183225]">Live Token Sheet</span>
              <Badge tone="slate" className="capitalize">
                {category}
              </Badge>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3.5">
                <TokenGlyph glyph={glyph} accent={accent} size={46} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-[#183225]">{name || "Untitled token"}</h3>
                  <div className="mt-0.5 font-mono text-xs font-medium text-[#5c7054]">${symbol || "TICKER"}</div>
                </div>
              </div>

              <p className="line-clamp-3 text-xs leading-relaxed text-[#5f7358]">
                {description || "Provide a clear summary of your project, asset mechanics, or community."}
              </p>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#e3eadc] bg-[#fafcf8] p-3.5">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#6e8166]">Start price</div>
                  <div className="tabular mt-1 font-mono text-sm font-bold text-[#183225]">{fmtPrice(preview.first)}</div>
                  <div className="text-[10px] text-[#6d8065]">HYPE</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#6e8166]">Grad price</div>
                  <div className="tabular mt-1 font-mono text-sm font-bold text-[#1d472f]">{fmtPrice(preview.end)}</div>
                  <div className="text-[10px] text-[#6d8065]">HYPE at 800M</div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#6b7e63]">
                  <span>Theoretical curve</span>
                  <span className="tabular font-medium text-[#223d27]">{target} HYPE cap</span>
                </div>
                <div className="rounded-lg border border-[#e6eedf] bg-[#fcfdf9] p-2.5">
                  <Sparkline values={preview.line} accent={accent} height={88} />
                  <div className="mt-1 flex justify-between font-mono text-[9px] text-[#73866b]">
                    <span>0 sold</span>
                    <span>400M</span>
                    <span>800M grad</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#e6eedf] border-t border-[#e3eadc] pt-1 text-xs">
                <div className="summary-row !py-2">
                  <span>Fixed supply</span>
                  <strong>1,000,000,000</strong>
                </div>
                <div className="summary-row !py-2">
                  <span>Curve / Creator fee</span>
                  <strong>1.00% (25% creator)</strong>
                </div>
                <div className="summary-row !py-2">
                  <span>Post-curve path</span>
                  <strong>Locked Pool → HyperCore → HIP-3</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="tip-card">
            <h3 className="font-semibold">Lifecycle guarantee</h3>
            <p className="text-xs leading-relaxed">
              When 800M tokens are absorbed, the curve freezes automatically and liquidity migrates into a 4-year locked pool, HyperCore spot book, and HIP-3 perpetual venue.
            </p>
            <Link href="/docs#lifecycle" className="small-link mt-2.5">
              Read lifecycle specifications ↗
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
