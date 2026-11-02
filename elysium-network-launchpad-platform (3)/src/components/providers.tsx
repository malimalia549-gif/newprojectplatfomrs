"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PublicUser } from "@/lib/dto";

/* ---------------------------------- fetch --------------------------------- */

export async function api<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    method: init?.method ?? (init?.json ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as any) : {};
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

/** Polling hook with stale-response protection and local optimistic mutation. */
export function useLive<T>(path: string | null, intervalMs = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      if (!path) return;
      const request = ++requestId.current;
      if (!quiet) setLoading(true);
      try {
        const next = await api<T>(path);
        if (!mounted.current || request !== requestId.current) return;
        setData(next);
        setError(null);
      } catch (e) {
        if (!mounted.current || request !== requestId.current || quiet) return;
        setError((e as Error).message);
      } finally {
        if (mounted.current && request === requestId.current) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    mounted.current = true;
    if (!path) {
      requestId.current++;
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load();
    if (!intervalMs) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, intervalMs);
    return () => {
      mounted.current = false;
      requestId.current++;
      window.clearInterval(id);
    };
  }, [load, intervalMs, path]);

  return { data, setData, loading, error, reload: () => load(false), mutate: (updater: (prev: T | null) => T | null) => setData((prev) => updater(prev)) };
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
    void refresh();
  }, [refresh]);

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
