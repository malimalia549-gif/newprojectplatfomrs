"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, CreditCard, Droplets, Loader2, LockKeyhole, Wallet, X } from "lucide-react";
import type { UserProfile, XMoneyReceiptRecord } from "@/types/platform";

interface AuthModalProps { open: boolean; onClose: () => void; onAuthenticated: (user: UserProfile) => void; }
interface WalletModalProps { open: boolean; onClose: () => void; user: UserProfile | null; receipts: XMoneyReceiptRecord[]; onClaimFaucet: () => Promise<void>; onTopUpXMoney: (xHandle: string) => Promise<void>; }

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const authenticate = async (demo: boolean) => {
    setError(null); setBusy(true);
    try {
      const response = await fetch(demo || mode === "LOGIN" ? "/api/auth/login" : "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(demo ? { demo: true } : mode === "LOGIN" ? { email, password } : { email, username, password, xHandle }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Could not sign in."); return; }
      onAuthenticated(data.user); onClose();
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#03080b]/85 p-4 backdrop-blur-[7px]">
      <div role="dialog" aria-modal="true" aria-labelledby="auth-title" className="ui-card animate-enter my-auto w-full max-w-[440px] overflow-hidden shadow-[0_30px_90px_-20px_rgba(0,0,0,.8)]">
        <div className="flex items-start justify-between border-b border-[#26353b] px-6 py-5"><div><div className="ui-overline">YOUR ACCOUNT</div><h2 id="auth-title" className="mt-1.5 font-display text-[23px] font-medium text-[#edf3ee]">{mode === "LOGIN" ? "Welcome back." : "Join the workspace."}</h2><p className="mt-1 text-[11px] text-[#84998c]">Sign in to explore sandbox trading and launches.</p></div><button type="button" onClick={onClose} aria-label="Close sign-in dialog" className="ui-btn-quiet !h-8 !w-8 !min-h-0 !p-0"><X className="h-4 w-4" /></button></div>
        <div className="space-y-5 p-6">
          <button type="button" disabled={busy} onClick={() => authenticate(true)} className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-[#4b7057] bg-[#20392b] px-4 py-3.5 text-left transition hover:bg-[#294832] disabled:opacity-50"><span><span className="block text-[12px] font-semibold text-[#e0f2e2]">Explore with a demo account</span><span className="mt-1 block text-[10px] text-[#98b79f]">Preloaded balances, positions, and assets</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#bde8c3]" /></button>
          <div className="flex items-center gap-3"><span className="h-px flex-1 bg-[#26353b]" /><span className="text-[10px] text-[#73887d]">or use your account</span><span className="h-px flex-1 bg-[#26353b]" /></div>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#26353b] bg-[#0e171b] p-1"><button type="button" onClick={() => { setMode("LOGIN"); setError(null); }} className={`rounded-md py-2 text-[11px] font-semibold transition ${mode === "LOGIN" ? "bg-[#253a2d] text-[#d6eedb]" : "text-[#7f9387] hover:text-white"}`}>Sign in</button><button type="button" onClick={() => { setMode("REGISTER"); setError(null); }} className={`rounded-md py-2 text-[11px] font-semibold transition ${mode === "REGISTER" ? "bg-[#253a2d] text-[#d6eedb]" : "text-[#7f9387] hover:text-white"}`}>Create account</button></div>
          <form onSubmit={(event) => { event.preventDefault(); void authenticate(false); }} className="space-y-4">
            {mode === "REGISTER" && <div className="grid grid-cols-2 gap-3"><label><span className="ui-label">Display name *</span><input required minLength={2} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name" className="ui-field" /></label><label><span className="ui-label">X handle <span className="font-normal text-[#688074]">· optional</span></span><input value={xHandle} onChange={(event) => setXHandle(event.target.value)} placeholder="@handle" className="ui-field" /></label></div>}
            <label className="block"><span className="ui-label">Email address *</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="ui-field" /></label>
            <label className="block"><span className="ui-label">Password *</span><input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="ui-field" /></label>
            {error && <div role="alert" className="rounded-md border border-[#784c4b] bg-[#392627] px-3 py-2.5 text-[11px] text-[#f1b9af]">{error}</div>}
            <button type="submit" disabled={busy} className="ui-btn-primary w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{busy ? "Please wait..." : mode === "LOGIN" ? "Sign in" : "Create demo account"}<ArrowRight className="h-4 w-4" /></button>
          </form>
          <p className="border-t border-[#26353b] pt-4 text-center text-[10px] leading-relaxed text-[#70887a]">All balances and trading actions in this workspace are simulations.</p>
        </div>
      </div>
    </div>
  );
}

export function WalletAndXMoneyModal({ open, onClose, user, receipts, onClaimFaucet, onTopUpXMoney }: WalletModalProps) {
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [xHandle, setXHandle] = useState(user?.xHandle || "");
  const [copied, setCopied] = useState(false);
  const linkedHandle = user?.xHandle;

  useEffect(() => { if (open && linkedHandle) setXHandle(linkedHandle); }, [open, linkedHandle]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !user) return null;

  const copyAddress = async () => {
    try { await navigator.clipboard.writeText(user.walletAddress); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setCopied(false); }
  };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#03080b]/85 p-3 backdrop-blur-[7px] sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="wallet-title" className="ui-card ui-scroll animate-enter my-auto max-h-[92vh] w-full max-w-[720px] overflow-y-auto shadow-[0_30px_90px_-20px_rgba(0,0,0,.8)]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#26353b] bg-[#111b20] px-5 py-5 sm:px-6"><div><div className="ui-overline">YOUR WORKSPACE</div><h2 id="wallet-title" className="mt-1 font-display text-[22px] font-medium text-[#edf3ee]">Wallet & demo payments</h2><p className="mt-1 text-[11px] text-[#84998c]">Sandbox balances for {user.username}</p></div><button type="button" onClick={onClose} aria-label="Close wallet" className="ui-btn-quiet !h-8 !w-8 !min-h-0 !p-0"><X className="h-4 w-4" /></button></div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="ui-card-soft flex flex-col p-4"><div className="flex items-start justify-between gap-2"><div><div className="ui-overline">ELYSIUM WALLET · DEMO</div><h3 className="mt-1 text-[13px] font-semibold text-[#e8efe9]">Asset balances</h3></div><Wallet className="h-4 w-4 text-[#9dcca9]" /></div><button type="button" onClick={copyAddress} className="mt-3 inline-flex items-center gap-2 self-start font-mono text-[10px] text-[#9fb7a7] hover:text-white">{user.walletAddress.slice(0, 12)}…{user.walletAddress.slice(-8)}{copied ? <Check className="h-3.5 w-3.5 text-[#b3ebc9]" /> : <Copy className="h-3.5 w-3.5" />}</button><div className="mt-5 divide-y divide-[#26353b]">{[{ name: "HYPE", value: `${user.hypeBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} HYPE` }, { name: "USDC", value: `$${user.usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}` }, { name: "kHYPE", value: `${user.khypeBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} kHYPE` }].map((row) => <div key={row.name} className="flex items-center justify-between py-2.5 text-[11px]"><span className="text-[#8ba094]">{row.name}</span><span className="font-mono text-[#dce9dc]">{row.value}</span></div>)}</div><button type="button" disabled={faucetBusy} onClick={async () => { setFaucetBusy(true); try { await onClaimFaucet(); } finally { setFaucetBusy(false); } }} className="ui-btn-secondary mt-auto !min-h-9 w-full !text-[11px]"><Droplets className="h-3.5 w-3.5" />{faucetBusy ? "Adding demo funds..." : "Add test balances"}</button></section>
            <section className="ui-card-soft flex flex-col p-4"><div className="flex items-start justify-between gap-2"><div><div className="ui-overline">PAYMENT PROTOTYPE</div><h3 className="mt-1 text-[13px] font-semibold text-[#e8efe9]">X Money preview</h3></div><span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#3a5447] bg-[#263f31] text-[13px] font-bold text-[#d6edd9]">X</span></div><div className="mt-5 text-[11px] text-[#8ba094]">Illustrative balance · {user.xHandle}</div><div className="mt-1 font-display text-[27px] font-medium text-[#edf4ed]">${user.xMoneyBalanceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[12px] text-[#8aa599]">USD</span></div><p className="mt-2 text-[10px] leading-relaxed text-[#7f9688]">This is not connected to X Money or a real payment card.</p><label className="mt-auto block pt-5"><span className="ui-label">Demo X handle</span><input value={xHandle} onChange={(event) => setXHandle(event.target.value)} placeholder="@yourhandle" className="ui-field !min-h-9" /></label><button type="button" disabled={topUpBusy} onClick={async () => { setTopUpBusy(true); try { await onTopUpXMoney(xHandle || user.xHandle); } finally { setTopUpBusy(false); } }} className="ui-btn-secondary mt-2 w-full !min-h-9 !text-[11px]"><CreditCard className="h-3.5 w-3.5" />{topUpBusy ? "Updating balance..." : "Add demo payment balance"}</button></section>
          </div>
          <section className="ui-card-soft overflow-hidden"><div className="flex items-center justify-between border-b border-[#26353b] px-4 py-3.5"><div><h3 className="text-[12px] font-semibold text-[#e5eee6]">Payment history</h3><p className="mt-0.5 text-[10px] text-[#7e9586]">Simulation receipts only</p></div><CreditCard className="h-4 w-4 text-[#819f8c]" /></div><div className="ui-scroll max-h-48 divide-y divide-[#26353b] overflow-y-auto">{receipts.length === 0 ? <p className="px-4 py-8 text-center text-[11px] text-[#7f9387]">No demo payments yet.</p> : receipts.map((receipt) => <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px]"><span><span className="font-mono text-[#dce8df]">{receipt.receiptCode}</span><span className="ml-2 text-[10px] text-[#7c9284]">{receipt.purpose.replaceAll("_", " ").toLowerCase()}</span></span><span className="font-mono text-[#c7d8cd]">${receipt.amountUsd.toLocaleString()}{receipt.cashbackUsd > 0 && <span className="ml-2 text-[#a6dfb8]">+${receipt.cashbackUsd.toFixed(2)} demo rebate</span>}</span></div>)}</div></section>
          <p className="text-[10px] leading-[1.6] text-[#728a7b]">Demo faucet and X Money balance updates modify only this application’s database. No funds are transferred.</p>
        </div>
      </div>
    </div>
  );
}
