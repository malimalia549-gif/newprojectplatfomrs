/**
 * X Money checkout integration.
 *
 * X Money (peer-to-peer payments inside X, powered by Cross River Bank + Visa) has no
 * public merchant API yet, so this module speaks the shape of one: if `X_MONEY_API_KEY`
 * is present we call the live endpoint, otherwise we run a deterministic sandbox flow
 * that the UI drives end-to-end (intent → handle deep link → confirm code → settle).
 *
 * Everything settlement-related (HYPE credit, launch mint, points) happens on OUR side,
 * so flipping to live credentials requires no UI change.
 */

import { createHash, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { ApiError } from "@/lib/auth";

const LIVE = Boolean(process.env.X_MONEY_API_KEY);
const ENDPOINT = process.env.X_MONEY_ENDPOINT ?? "https://api.x.com/2/payments/transfers";

export type CheckoutIntent = {
  reference: string;
  amountUsd: number;
  amountHype: number;
  handle: string;
  memo: string;
  live: boolean;
  status: "pending" | "succeeded" | "failed" | "expired";
  deeplink: string;
  cashtag?: string;
  /** Sandbox confirmation code surfaced in the UI so the flow is completable without credentials. */
  code?: string;
  expiresAt: number;
};

export const xLive = () => LIVE;

export function handleFrom(input: string) {
  const cleaned = input.trim().replace(/^@/, "").replace(/^https?:\/\/(x|twitter)\.com\//, "").replace(/\/.*$/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) throw new ApiError("X handle must be 1–15 chars: letters, numbers, underscore.");
  return cleaned.toLowerCase();
}

export function hypeToUsd(rate: number, hype: number) {
  return Math.round(hype * rate * 100) / 100;
}

async function callXMoney(payload: Record<string, unknown>) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.X_MONEY_API_KEY}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new ApiError(`X Money responded ${res.status}`, 502);
  return (await res.json()) as Record<string, any>;
}

export async function createCheckout(args: {
  userId: string;
  launchId?: string | null;
  handle: string;
  amountUsd: number;
  amountHype: number;
  purpose: "launch_fee" | "cashtag_listing" | "stake_topup" | "perp_margin";
  cashtag?: string | null;
}) {
  const reference = `XM-${randomInt(1600, 9999)}-${createHash("sha1").update(`${args.userId}${Date.now()}`).digest("hex").slice(0, 6).toUpperCase()}`;
  const memo = `${args.purpose.replace(/_/g, " ")} · ${reference}`;
  let status: CheckoutIntent["status"] = "pending";
  let code: string | undefined = String(randomInt(100000, 999999));

  if (LIVE) {
    try {
      const out = await callXMoney({
        recipient: `@${args.handle}`,
        amount_cents: Math.round(args.amountUsd * 100),
        currency: "USD",
        memo,
        idempotency_key: reference,
      });
      status = out?.status === "succeeded" ? "succeeded" : "pending";
      code = undefined;
    } catch (e) {
      console.warn("[xmoney] live call failed, falling back to sandbox:", (e as Error).message);
    }
  }

  await db.insert(payments).values({
    id: `pay_${reference}`,
    userId: args.userId,
    launchId: args.launchId ?? null,
    provider: "x_money",
    purpose: args.purpose,
    status,
    amountUsd: args.amountUsd,
    amountHype: args.amountHype,
    xHandle: args.handle,
    reference,
    verifyCode: code ?? null,
    live: LIVE,
    note: memo,
    confirmedAt: status === "succeeded" ? new Date() : null,
  });

  const intent: CheckoutIntent = {
    reference,
    amountUsd: args.amountUsd,
    amountHype: args.amountHype,
    handle: args.handle,
    memo,
    live: LIVE,
    status,
    deeplink: `https://x.com/compose/post?text=${encodeURIComponent(`Paying ${memo} via X Money to @${args.handle}`)}`,
    cashtag: args.cashtag ?? undefined,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  return intent;
}

/** Settles a pending X Money intent and returns the row (idempotent). */
export async function settleCheckout(reference: string, code: string) {
  const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  const row = rows[0];
  if (!row) throw new ApiError("Payment intent not found.", 404);
  if (row.status === "succeeded") return row;
  if (Date.now() - row.createdAt.getTime() > 15 * 60 * 1000) {
    await db.update(payments).set({ status: "expired" }).where(eq(payments.id, row.id));
    throw new ApiError("That X Money quote expired. Start a new checkout.", 410);
  }
  if (!LIVE && row.verifyCode && row.verifyCode !== code.trim()) throw new ApiError("Confirmation code did not match the X Money request.", 403);
  await db
    .update(payments)
    .set({ status: "succeeded", verifyCode: null, confirmedAt: new Date(), note: `${row.note ?? ""} · settled`.trim() })
    .where(eq(payments.id, row.id));
  const after = await db.select().from(payments).where(eq(payments.id, row.id)).limit(1);
  return after[0] ?? row;
}

export async function listPayments(userId: string) {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(payments.createdAt);
}

/** Public share intent used by the cashtag listing flow. */
export function shareText(args: { symbol: string; cashtag: string; priceUsd: number; mcapUsd: number; stage: string }) {
  return `$${args.cashtag} just ${args.stage} on Elysium via FORGE · price $${args.priceUsd.toPrecision(4)} · mcap $${Math.round(args.mcapUsd).toLocaleString("en-US")} · chain 99801`;
}
