"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PublicUser } from "@/lib/dto";

/* ---------------------------------- fetch --------------------------------- */

export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const method = init?.method ?? (init?.json !== undefined ? "POST" : "GET");
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (method !== "GET" && !headers.has("idempotency-key")) headers.set("idempotency-key", crypto.randomUUID());
  const request = { ...init, method, headers, body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body, cache: "no-store" as const };
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { response = await fetch(path, request); }
    catch (error) { if (headers.has("idempotency-key") && attempt === 0 && !init?.signal?.aborted) continue; throw error; }
    if (![502, 503, 504].includes(response.status) || !headers.has("idempotency-key") || attempt === 1) break;
  }
  if (!response) throw new Error("No response from the server.");
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`Invalid server response (${response.status}).`); }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${response.status}).`);
  return data as T;
}

/** Abortable polling with stale-response protection. */
export function useLive<T>(path: string | null, intervalMs = 3000) {
  const [state, setState] = useState<{ path: string | null; data: T | null; loading: boolean; error: string | null }>({ path, data: null, loading: Boolean(path), error: null });
  const controllerRef = useRef<AbortController | null>(null);
  const load = useCallback(async (quiet = false) => {
    controllerRef.current?.abort();
    if (!path) return;
    const controller = new AbortController(); controllerRef.current = controller;
    if (!quiet) setState((s) => ({ ...s, path, loading: true }));
    try {
      const data = await api<T>(path, { signal: controller.signal });
      if (!controller.signal.aborted) setState({ path, data, loading: false, error: null });
    } catch (e) {
      if (!controller.signal.aborted) setState((s) => ({ path, data: s.path === path ? s.data : null, loading: false, error: quiet ? s.error : (e as Error).message }));
    }
  }, [path]);
  useEffect(() => {
    void load();
    const id = intervalMs && path ? window.setInterval(() => { if (document.visibilityState === "visible") void load(true); }, intervalMs) : null;
    const visible = () => { if (path && document.visibilityState === "visible") void load(true); };
    document.addEventListener("visibilitychange", visible);
    return () => { controllerRef.current?.abort(); if (id) window.clearInterval(id); document.removeEventListener("visibilitychange", visible); };
  }, [load, intervalMs, path]);
  const current = state.path === path ? state : { data: null, loading: Boolean(path), error: null };
  return { data: path ? current.data : null, loading: current.loading, error: current.error, reload: () => load(false), setData: (next: T | null) => setState({ path, data: next, loading: false, error: null }), mutate: (fn: (prev: T | null) => T | null) => setState((s) => ({ path, data: fn(s.path === path ? s.data : null), loading: false, error: null })) };
}

/* ---------------------------------- toasts -------------------------------- */

export type Toast = { id: string; kind: "success" | "error" | "info" | "tx"; title: string; body?: string; href?: string };

type Ctx = {
  user: PublicUser | null;
  ready: boolean;
  setUser: (u: PublicUser | null) => void;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  demo: () => Promise<void>;
  signUp: (input: { email: string; name: string; password: string; xHandle?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
  authModal: null | "login" | "register";
  setAuthModal: (v: null | "login" | "register") => void;
};

const ForgeCtx = createContext<Ctx | null>(null);

export function useForge() {
  const ctx = useContext(ForgeCtx);
  if (!ctx) throw new Error("useForge must be used inside AppProviders");
  return ctx;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authModal, setAuthModal] = useState<null | "login" | "register">(null);

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6200);
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ user: PublicUser | null }>("/api/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 6500);
    return () => { window.clearTimeout(id); window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try { await api("/api/simulation", { json: {} }); } catch { /* Health is exposed by read requests. */ }
      finally { busy = false; }
    };
    const timer = window.setInterval(() => void tick(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      ready,
      setUser,
      refresh,
      async signIn(email, password) {
        const res = await api<{ user: PublicUser }>("/api/auth/login", { json: { email, password } });
        setUser(res.user);
        setAuthModal(null);
        push({ kind: "success", title: `Welcome back, ${res.user.name}`, body: "Session active for 7 days." });
      },
      async demo() {
        const res = await api<{ user: PublicUser }>("/api/auth/demo", { json: {} });
        setUser(res.user);
        setAuthModal(null);
        push({ kind: "success", title: "Sandbox account loaded", body: `${res.user.hype.toFixed(2)} HYPE · ${res.user.usdc.toFixed(0)} USDC · ${res.user.stoke.toFixed(0)} STOKE` });
      },
      async signUp(input) {
        const res = await api<{ user: PublicUser }>("/api/auth/register", { json: input });
        setUser(res.user);
        setAuthModal(null);
        push({ kind: "success", title: "Account created on Elysium testnet", body: "Testnet balances credited — start a launch." });
      },
      async signOut() {
        await api("/api/auth/logout", { json: {} });
        setUser(null);
        push({ kind: "info", title: "Signed out" });
      },
      toasts,
      push,
      dismiss,
      authModal,
      setAuthModal,
    }),
    [user, ready, refresh, toasts, push, dismiss, authModal],
  );

  return <ForgeCtx.Provider value={value}>{children}</ForgeCtx.Provider>;
}
