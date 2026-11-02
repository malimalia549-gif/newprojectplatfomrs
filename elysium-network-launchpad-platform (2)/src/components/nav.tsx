"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, useForge, useLive } from "@/components/providers";
import { Btn, Copyable, Field, Input, Modal, Panel, Spinner } from "@/components/ui";
import { ELYSIUM, cn, fmtNum, shortAddr } from "@/lib/util";

const LINKS = [
  { href: "/launch", label: "Launchpad" },
  { href: "/create", label: "Create" },
  { href: "/terminal", label: "Perps" },
  { href: "/stoke", label: "Token" },
  { href: "/dashboard", label: "Portfolio" },
  { href: "/docs", label: "Docs" },
];

type Network = { network: { headBlock: number; blockMs: number }; prices: { hypeUsd: number; stokeUsd: number } };

export function Logo() {
  return (
    <Link href="/" className="brand-lockup" aria-label="Forge homepage">
      <span className="brand-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 17V6l14 8V5H9v10h7l-11 2Z" fill="currentColor" /><path d="M5 19h14" stroke="currentColor" strokeWidth="2" /></svg></span>
      <span className="brand-word">forge<span className="brand-dot">.</span></span>
    </Link>
  );
}

export function TopNav() {
  const { user, setAuthModal, signOut } = useForge();
  const path = usePathname();
  const { data } = useLive<Network>("/api/network", 6500);
  const [menu, setMenu] = useState(false);
  const [faucet, setFaucet] = useState(false);
  const [profile, setProfile] = useState(false);

  useEffect(() => setMenu(false), [path]);
  const closeMenu = () => setMenu(false);

  return (
    <>
      <header className="app-header">
        <div className="nav-wrap">
          <Logo />
          <nav aria-label="Main navigation" className="nav-inner">
            {LINKS.map((l) => {
              const active = path === l.href || path.startsWith(`${l.href}/`);
              return <Link key={l.href} href={l.href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined}>{l.label}</Link>;
            })}
          </nav>
          <div className="nav-actions">
            <div className="network-block network-pill"><span className="live-dot h-1.5 w-1.5 rounded-full bg-up" /><span>Testnet</span><span className="text-slate-600">/</span><span className="tabular">{ELYSIUM.chainId}</span></div>
            <button onClick={() => setFaucet(true)} className="nav-text-button faucet-button">Faucet</button>
            <span className="nav-divider" />
            {user ? (
              <button className="flex items-center gap-2 rounded-md border border-[#dae5d0] bg-[#f1f7e9] px-3 py-1.5" onClick={() => setProfile(true)}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#dce9cc] text-[9px] font-semibold text-[#4d7736]">{user.name.slice(0, 2).toUpperCase()}</span>
                <span className="tabular text-xs text-[#4d7736]">{fmtNum(user.hype, 2)} HYPE</span>
              </button>
            ) : <Btn size="sm" onClick={() => setAuthModal("login")}>Sign in</Btn>}
            <button onClick={() => setMenu((v) => !v)} className="menu-button" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{menu ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
            </button>
          </div>
        </div>
        {menu ? (
          <nav className="mobile-nav rise" aria-label="Mobile navigation">
            {LINKS.map((l) => <Link key={l.href} href={l.href} onClick={closeMenu} aria-current={path === l.href ? "page" : undefined}>{l.label}<span className="ml-auto text-slate-500">↗</span></Link>)}
            <button onClick={() => { closeMenu(); setFaucet(true); }} className="nav-text-button px-3 py-3">Testnet faucet</button>
            {user ? <button onClick={() => { closeMenu(); void signOut(); }} className="nav-text-button px-3 py-3">Sign out</button> : null}
          </nav>
        ) : null}
      </header>
      <AuthModal />
      <FaucetModal open={faucet} onClose={() => setFaucet(false)} />
      <ProfileModal open={profile} onClose={() => setProfile(false)} onSignOut={() => { setProfile(false); void signOut(); }} />
    </>
  );
}

/* ------------------------------------------------------------------- auth */

export function AuthModal() {
  const { authModal, setAuthModal, signIn, signUp, demo, push } = useForge();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@forge.xyz");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("forge1234");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authModal) setMode(authModal);
  }, [authModal]);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "login") await signIn(email, password);
      else await signUp({ email, name: name || email.split("@")[0]!, password, xHandle: handle || undefined });
    } catch (e) {
      push({ kind: "error", title: "Could not sign in", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(authModal)} onClose={() => setAuthModal(null)} title={mode === "login" ? "Welcome back" : "Create your account"}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-400">
          Your account holds testnet HYPE, USDC and STOKE on Elysium chain {ELYSIUM.chainId}. No real funds are involved.
        </p>
        <Field label="Email">
          <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
        </Field>
        {mode === "register" ? (
          <>
            <Field label="Display name">
              <Input value={name} onChange={setName} placeholder="Your name" maxLength={24} />
            </Field>
            <Field label="X handle" hint="Used for X Money payments and cashtag listings.">
              <Input value={handle} onChange={setHandle} placeholder="@handle" maxLength={20} />
            </Field>
          </>
        ) : null}
        <Field label="Password">
          <Input value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" />
        </Field>
        <Btn full size="lg" loading={busy} onClick={submit}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Btn>
        <div className="flex items-center justify-between pt-1 text-[13px]">
          <button className="text-slate-400 transition hover:text-white" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          <button
            className="font-medium text-ice-400 transition hover:underline"
            onClick={async () => {
              setBusy(true);
              try {
                await demo();
              } catch (e) {
                push({ kind: "error", title: "Sandbox unavailable", body: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            Continue as demo
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- faucet */

function FaucetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh, push, setAuthModal } = useForge();
  const { data, reload } = useLive<{ nextInMs: number; drip: { hype: number; usdc: number; stoke: number }; claims: number; mult: number }>(open ? "/api/faucet" : null, 5000);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("1");
  const wait = Math.ceil((data?.nextInMs ?? 0) / 1000);
  const mult = data?.mult ?? 1;
  const n = Math.max(1, Math.min(4, Number(amount) || 1));

  return (
    <Modal open={open} onClose={onClose} title="Testnet faucet">
      {!user ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Sign in to receive testnet HYPE, USDC and STOKE.</p>
          <Btn full onClick={() => { onClose(); setAuthModal("login"); }}>Sign in</Btn>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 divide-x divide-white/[0.06] rounded-xl bg-white/[0.02] py-4 ring-1 ring-inset ring-white/[0.06]">
            {[
              ["HYPE", fmtNum((data?.drip.hype ?? 5) * mult * n, 2), "text-white"],
              ["USDC", fmtNum((data?.drip.usdc ?? 1200) * mult, 0), "text-white"],
              ["STOKE", fmtNum(data?.drip.stoke ?? 0, 0), "text-gold"],
            ].map(([k, v, c]) => (
              <div key={k} className="px-4 text-center">
                <div className="text-xs text-slate-500">{k}</div>
                <div className={cn("tabular mt-1 text-lg font-medium", c)}>{v}</div>
              </div>
            ))}
          </div>
          <Field label="Multiplier" hint="1–4× the base drip. Each claim starts the cooldown.">
            <Input value={amount} onChange={setAmount} type="number" step="1" suffix="×" />
          </Field>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Wallet</span>
            <Copyable text={user.wallet} label={shortAddr(user.wallet, 6)} />
          </div>
          <Btn
            full
            size="lg"
            loading={busy}
            disabled={wait > 0}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await api<{ credited: { hype: number; usdc: number } }>("/api/faucet", { json: { amount: n } });
                push({ kind: "success", title: "Funds received", body: `+${fmtNum(res.credited.hype, 2)} HYPE · +${fmtNum(res.credited.usdc, 0)} USDC` });
                await refresh();
                await reload();
              } catch (e) {
                push({ kind: "error", title: "Request declined", body: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            {wait > 0 ? `Available in ${Math.ceil(wait / 60)} min` : "Request funds"}
          </Btn>
        </div>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- profile */

function ProfileModal({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const { user, refresh, push } = useForge();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setHandle(user?.xHandle ?? ""), [user, open]);

  return (
    <Modal open={open} onClose={onClose} title="Account">
      {user ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-ice-400/90 text-sm font-semibold text-ink-950">{user.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-white">{user.name}</div>
              <Copyable text={user.wallet} label={shortAddr(user.wallet, 8)} />
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] rounded-xl ring-1 ring-inset ring-white/[0.06]">
            {[
              ["HYPE", fmtNum(user.hype, 4), "text-white"],
              ["USDC", fmtNum(user.usdc, 2), "text-white"],
              ["STOKE", fmtNum(user.stoke, 2), "text-gold"],
              ["Points", fmtNum(user.points, 0), "text-ice-400"],
            ].map(([k, v, c]) => (
              <div key={k} className="p-4">
                <div className="text-xs text-slate-500">{k}</div>
                <div className={cn("tabular mt-1 text-base font-medium", c)}>{v}</div>
              </div>
            ))}
          </div>
          <Field label="X handle" hint="Receives X Money transfers and signs cashtag listings.">
            <Input value={handle} onChange={setHandle} placeholder="@handle" maxLength={20} />
          </Field>
          <div className="flex gap-2">
            <Btn
              full
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/auth/profile", { json: { xHandle: handle } });
                  await refresh();
                  push({ kind: "success", title: "Profile saved" });
                  onClose();
                } catch (e) {
                  push({ kind: "error", title: "Could not save", body: (e as Error).message });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save changes
            </Btn>
            <Btn variant="outline" onClick={onSignOut}>
              Sign out
            </Btn>
          </div>
        </div>
      ) : (
        <Panel className="flex items-center gap-2 p-5 text-sm text-slate-400">
          <Spinner /> Loading account
        </Panel>
      )}
    </Modal>
  );
}
