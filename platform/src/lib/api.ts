import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, ledgerTransaction } from "@/db";
import { authAttempts, mutationReceipts } from "@/db/schema";
import { ApiError, currentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }
export function err(message: string, status = 400) { return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } }); }

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new ApiError("Cross-site mutations are not allowed.", 403);
  if (!origin) return; // Non-browser clients still require the session cookie.
  const allowed = new Set([new URL(req.url).host, req.headers.get("host"), process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).host : null]);
  try { if (!allowed.has(new URL(origin).host)) throw new Error("origin"); }
  catch { throw new ApiError("Request origin is not allowed.", 403); }
}

/** Persist a login throttler across server processes; never trust a supplied wallet as identity. */
export async function throttleAuth(req: Request, email: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = createHash("sha256").update(`${ip}:${email.toLowerCase().trim()}`).digest("hex");
  const now = new Date();
  const [row] = await db.insert(authAttempts).values({ key, count: 1, resetAt: new Date(now.getTime() + 15 * 60_000) })
    .onConflictDoUpdate({ target: authAttempts.key, set: {
      count: sqlIncrement(authAttempts.count, now),
      resetAt: sqlReset(authAttempts.resetAt, now),
    } }).returning();
  if (row.count > 12) throw new ApiError("Too many sign-in attempts. Try again in 15 minutes.", 429);
}
import { sql } from "drizzle-orm";
const sqlIncrement = (col: typeof authAttempts.count, now: Date) => sql`case when ${authAttempts.resetAt} < ${now} then 1 else ${col} + 1 end`;
const sqlReset = (col: typeof authAttempts.resetAt, now: Date) => sql`case when ${col} < ${now} then ${new Date(now.getTime() + 15 * 60_000)} else ${col} end`;

/** Every financial mutation is atomic and optionally idempotent. GET requests never settle orders. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      await ensureSeeded();
      const req = args[0] as Request;
      if (!(req instanceof Request) || req.method === "GET") return await handler(...args);
      assertSameOrigin(req);
      const raw = await req.clone().text();
      if (raw.length > 32_768) throw new ApiError("Request body is too large.", 413);
      const user = await currentUser();
      const key = req.headers.get("idempotency-key");
      if (key && !/^[a-zA-Z0-9_-]{8,100}$/.test(key)) throw new ApiError("Invalid idempotency key.");
      const fingerprint = createHash("sha256").update(`${new URL(req.url).pathname}:${raw}`).digest("hex");
      return await ledgerTransaction(async () => {
        if (key && user) {
          const [prior] = await db.select().from(mutationReceipts).where(and(eq(mutationReceipts.userId, user.id), eq(mutationReceipts.id, key))).limit(1);
          if (prior) {
            if (prior.fingerprint !== fingerprint) throw new ApiError("Idempotency key was already used for another request.", 409);
            return Response.json(prior.response, { headers: { "Idempotent-Replay": "true" } });
          }
        }
        const response = await handler(...args);
        if (key && user && response.ok) {
          const data = await response.clone().json();
          await db.insert(mutationReceipts).values({ id: key, userId: user.id, fingerprint, response: data });
        }
        return response;
      });
    } catch (e) {
      if (e instanceof ApiError) return err(e.message, e.status);
      const code = createHash("sha256").update(String(e)).digest("hex").slice(0, 10);
      console.error(`[platform:api:${code}]`, e instanceof Error ? e.message : "Unexpected error");
      return err(`Request could not be completed. Reference: ${code}`, 500);
    }
  };
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object");
    return parsed as Record<string, unknown>;
  } catch { throw new ApiError("A JSON object is required."); }
}
export const num = (v: unknown, fallback = 0) => {
  if (v === null || v === "" || typeof v === "boolean") return fallback;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
export function positive(v: unknown, label = "Amount", max = 1e12): number {
  const n = num(v, NaN);
  if (!Number.isFinite(n) || n <= 0 || n > max) throw new ApiError(`${label} must be greater than zero and at most ${max}.`);
  return n;
}
export const str = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
