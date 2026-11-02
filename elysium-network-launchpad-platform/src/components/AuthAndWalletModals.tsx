"use client";

import React, { useState } from "react";
import { Check, Coins, Copy, CreditCard, Droplets, Loader2, ShieldCheck, Wallet, X } from "lucide-react";
import type { UserProfile, XMoneyReceiptRecord } from "@/types/platform";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

const fieldClass = "h-10 w-full rounded-md border border-[#dfe5df] bg-white px-3 text-xs text-[#26352d] placeholder:text-[#a6aea8] focus:border-[#7ca38b] focus:outline-none focus:ring-2 focus:ring-[#176b4d]/10";

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  if (!open) return null;

  const authenticate = async (demo = false) => {
    setErrorMsg(null); setLoading(true);
    try {
      const endpoint = demo || mode === "LOGIN" ? "/api/auth/login" : "/api/auth/register";
      const payload = demo ? { demo: true } : mode === "LOGIN" ? { email, password } : { email, username, password, xHandle };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) { setErrorMsg(data.error || "Authentication failed"); return; }
      onAuthenticated(data.user); onClose();
    } catch { setErrorMsg("Network error during authentication"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14231e]/45 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-[430px] animate-modal-in overflow-hidden rounded-xl border border-[#e2e8e1] bg-white shadow-[0_24px_80px_-24px_rgba(19,36,26,0.35)]">
        <div className="flex items-start justify-between border-b border-[#edf0ec] px-5 py-5"><div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#708077]">ElysiumForge account</div><h2 className="mt-1.5 font-display text-lg font-semibold text-[#233229]">{mode === "LOGIN" ? "Welcome back" : "Create your account"}</h2><p className="mt-1 text-[10px] text-[#839087]">Connect to the Elysium test environment.</p></div><button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#7c8980] hover:bg-[#f3f5f2]"><X className="h-4 w-4" /></button></div>
        <div className="space-y-4 p-5">
          <button type="button" disabled={loading} onClick={() => authenticate(true)} className="flex w-full items-center justify-between rounded-lg border border-[#dce7dc] bg-[#f3f7f3] p-3.5 text-left transition hover:bg-[#eaf2ea] disabled:opacity-50"><span><span className="flex items-center gap-2 text-[11px] font-semibold text-[#315f42]"><Coins className="h-4 w-4" />Open demo account</span><span className="mt-1 block text-[9px] text-[#75847a]">3,200 HYPE · $85K USDC · $35K demo 𝕏 Money</span></span><span className="rounded bg-white px-2 py-1 text-[9px] font-semibold text-[#557760]">{loading ? "Loading…" : "Quick access"}</span></button>
          <div className="flex items-center gap-3"><span className="h-px flex-1 bg-[#edf0ec]" /><span className="text-[9px] uppercase tracking-[0.12em] text-[#9aa39d]">or use your account</span><span className="h-px flex-1 bg-[#edf0ec]" /></div>
          <div className="grid grid-cols-2 rounded-md bg-[#f3f5f2] p-1 text-[10px] font-semibold"><button type="button" onClick={() => { setMode("LOGIN"); setErrorMsg(null); }} className={`rounded px-3 py-2 ${mode === "LOGIN" ? "bg-white text-[#30553c] shadow-sm" : "text-[#7b877f]"}`}>Sign in</button><button type="button" onClick={() => { setMode("REGISTER"); setErrorMsg(null); }} className={`rounded px-3 py-2 ${mode === "REGISTER" ? "bg-white text-[#30553c] shadow-sm" : "text-[#7b877f]"}`}>Create account</button></div>
          <form onSubmit={(event) => { event.preventDefault(); void authenticate(false); }} className="space-y-3">
            {mode === "REGISTER" && <div className="grid grid-cols-2 gap-2"><label className="block"><span className="mb-1.5 block text-[9px] font-medium text-[#6c7970]">Name</span><input required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Builder name" className={fieldClass} /></label><label className="block"><span className="mb-1.5 block text-[9px] font-medium text-[#6c7970]">X handle</span><input value={xHandle} onChange={(event) => setXHandle(event.target.value)} placeholder="@handle" className={`${fieldClass} font-mono`} /></label></div>}
            <label className="block"><span className="mb-1.5 block text-[9px] font-medium text-[#6c7970]">Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} /></label>
            <label className="block"><span className="mb-1.5 block text-[9px] font-medium text-[#6c7970]">Password</span><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className={fieldClass} /></label>
            {errorMsg && <div className="rounded-md border border-[#f0d8d2] bg-[#fff7f4] px-3 py-2 text-[10px] text-[#9e4e42]">{errorMsg}</div>}
            <button type="submit" disabled={loading} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#176b4d] text-xs font-semibold text-white transition hover:bg-[#125a40] disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{mode === "LOGIN" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="text-center text-[9px] leading-4 text-[#99a29b]">Demo balances and payment receipts are simulated for this prototype.</p>
        </div>
      </div>
    </div>
  );
}

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  receipts: XMoneyReceiptRecord[];
  onClaimFaucet: () => Promise<void>;
  onTopUpXMoney: (xHandle: string) => Promise<void>;
}

export function WalletAndXMoneyModal({ open, onClose, user, receipts, onClaimFaucet, onTopUpXMoney }: WalletModalProps) {
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [xBusy, setXBusy] = useState(false);
  const [handleInput, setHandleInput] = useState(user?.xHandle || "@builder");
  const [copied, setCopied] = useState(false);
  if (!open || !user) return null;
  const copyAddr = async () => { try { await navigator.clipboard.writeText(user.walletAddress); setCopied(true); setTimeout(() => setCopied(false), 1300); } catch { setCopied(false); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#14231e]/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="my-auto max-h-[92vh] w-full max-w-2xl animate-modal-in overflow-y-auto rounded-xl border border-[#e2e8e1] bg-white shadow-[0_24px_80px_-24px_rgba(19,36,26,0.35)]">
        <div className="flex items-center justify-between border-b border-[#edf0ec] px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#edf3ee] text-[#4b7056]"><Wallet className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-[#29382f]">Wallet &amp; payment methods</h2><p className="mt-0.5 text-[10px] text-[#87928a]">{user.username} · {user.walletAddress.slice(0, 8)}…{user.walletAddress.slice(-5)}</p></div></div><button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#7c8980] hover:bg-[#f3f5f2]"><X className="h-4 w-4" /></button></div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-lg border border-[#e2e9e2] bg-[#fafbf9] p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#718078]">Elysium test wallet</div><div className="mt-1 font-mono text-[10px] text-[#435249]">Chain 99801</div></div><button type="button" onClick={copyAddr} className="flex items-center gap-1 rounded border border-[#e1e7e0] bg-white px-2 py-1.5 font-mono text-[9px] text-[#607068]">{user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}{copied ? <Check className="h-3 w-3 text-[#39724e]" /> : <Copy className="h-3 w-3" />}</button></div>
              <div className="mt-4 divide-y divide-[#e9ede8]">{[{ label: "Native HYPE", value: `${user.hypeBalance.toLocaleString()} HYPE`, cls: "text-[#32724b]" }, { label: "USDC balance", value: `$${user.usdcBalance.toLocaleString()}`, cls: "text-[#506f80]" }, { label: "kHYPE balance", value: `${user.khypeBalance.toLocaleString()} kHYPE`, cls: "text-[#577b75]" }].map((item) => <div key={item.label} className="flex justify-between py-2 text-[10px]"><span className="text-[#7a867e]">{item.label}</span><span className={`font-mono font-medium ${item.cls}`}>{item.value}</span></div>)}</div>
              <button type="button" disabled={faucetBusy} onClick={async () => { setFaucetBusy(true); try { await onClaimFaucet(); } finally { setFaucetBusy(false); } }} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#dce7dc] bg-[#f0f6f0] text-[10px] font-semibold text-[#376447] hover:bg-[#e6f0e6] disabled:opacity-50">{faucetBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Droplets className="h-3.5 w-3.5" />}Claim testnet faucet</button>
            </section>

            <section className="rounded-lg border border-[#dce6dc] bg-[#f4f7f3] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded bg-[#1b3125] text-[10px] font-bold text-white">𝕏</span><span className="text-[11px] font-semibold text-[#34463a]">X Money demo rail</span></div><span className="rounded bg-white px-1.5 py-1 text-[9px] font-semibold text-[#75836f]">Simulated</span></div><div className="mt-4 text-[9px] text-[#7d897f]">Demo balance</div><div className="mt-1 font-mono text-2xl font-medium tracking-[-0.04em] text-[#26372c]">${user.xMoneyBalanceUsd.toLocaleString()}<span className="ml-1 text-xs text-[#849087]">USD</span></div><div className="mt-1 text-[9px] text-[#849087]">Linked handle · {user.xHandle}</div>
              <div className="mt-4 flex gap-1.5"><input type="text" value={handleInput} onChange={(event) => setHandleInput(event.target.value)} placeholder="@x_handle" className="h-9 min-w-0 flex-1 rounded-md border border-[#dfe5df] bg-white px-2.5 font-mono text-[10px] text-[#26352d]" /><button type="button" disabled={xBusy} onClick={async () => { setXBusy(true); try { await onTopUpXMoney(handleInput || user.xHandle); } finally { setXBusy(false); } }} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[#263c2d] px-3 text-[9px] font-semibold text-white hover:bg-[#1b3022] disabled:opacity-50">{xBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}Add demo funds</button></div>
            </section>
          </div>

          <section className="overflow-hidden rounded-lg border border-[#e6eae5]"><div className="flex items-center justify-between border-b border-[#edf0ec] px-4 py-3"><div><h3 className="text-[11px] font-semibold text-[#34443a]">Recent payment receipts</h3><p className="mt-0.5 text-[9px] text-[#89948d]">Simulated transactions in this prototype</p></div><CreditCard className="h-4 w-4 text-[#819087]" /></div>{receipts.length === 0 ? <div className="px-4 py-7 text-center text-[10px] text-[#8a958d]">No receipts available.</div> : <div className="max-h-48 divide-y divide-[#edf0ec] overflow-y-auto">{receipts.map((receipt) => <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[10px]"><span><span className="font-mono font-semibold text-[#46564b]">{receipt.receiptCode}</span><span className="ml-2 text-[#849087]">{receipt.purpose}</span></span><span className="flex items-center gap-3 font-mono"><span className="text-[#57655c]">${receipt.amountUsd.toLocaleString()}</span>{receipt.cashbackUsd > 0 && <span className="text-[#39724e]">+${receipt.cashbackUsd.toFixed(2)}</span>}</span></div>)}</div>}</section>
        </div>
      </div>
    </div>
  );
}
