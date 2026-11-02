import { NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler: seeds demo state, maps thrown errors to JSON responses. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      await ensureSeeded();
      return await handler(...args);
    } catch (e) {
      if (e instanceof ApiError) return err(e.message, e.status);
      const message = e instanceof Error ? e.message : "Unexpected server error";
      console.error("[forge:api]", message);
      return err(message, 500);
    }
  };
}

export async function body(req: Request): Promise<Record<string, any>> {
  try {
    const parsed = await req.json();
    return (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, any>;
  } catch {
    return {};
  }
}

export const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

export const str = (v: unknown, fallback = "") => (typeof v === "string" && v.length ? v : fallback);
