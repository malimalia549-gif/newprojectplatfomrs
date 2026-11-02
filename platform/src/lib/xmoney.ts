/** Payment UI simulator only. No external transfer endpoint and no real-money credentials. */
import { createHash, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { ApiError } from "@/lib/auth";

import { handleFrom, hypeToUsd } from "@/lib/payment-format";
export { handleFrom, hypeToUsd } from "@/lib/payment-format";

const LIVE = false;

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
  const status: CheckoutIntent["status"] = "pending";
  let code: string | undefined = String(randomInt(100000, 999999));

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
    cashtag: args.cashtag ?? null,
    reference,
    verifyCode: code ?? null,
    live: LIVE,
    note: memo,
    confirmedAt: null,
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
export async function settleCheckout(reference: string, code: string, userId?: string, purpose?: string) {
  const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
  const row = rows[0];
  if (!row || (userId && row.userId !== userId)) throw new ApiError("Payment intent not found.", 404);
  if (purpose && row.purpose !== purpose) throw new ApiError("This receipt cannot pay for a different product.", 400);
  if (row.live) throw new ApiError("Live payments are disabled.", 403);
  if (row.consumedAt) throw new ApiError("This payment receipt has already been used.", 409);
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
  const rows = await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(payments.createdAt);
  return rows.map(({ verifyCode: _secret, ...safe }) => { void _secret; return safe; });
}

/** A fee receipt is consumed once; top-ups are credited once by the confirm route. */
export async function consumeCheckout(reference: string, code: string, userId: string, purpose: string) {
  const row = await settleCheckout(reference, code, userId, purpose);
  await db.update(payments).set({ consumedAt: new Date(), verifyCode: null }).where(eq(payments.id, row.id));
  return row;
}

/** Public share intent used by the cashtag listing flow. */
export function shareText(args: { symbol: string; cashtag: string; priceUsd: number; mcapUsd: number; stage: string }) {
  return `$${args.cashtag} just ${args.stage} on Elysium via FORGE · price $${args.priceUsd.toPrecision(4)} · mcap $${Math.round(args.mcapUsd).toLocaleString("en-US")} · chain 99801`;
}
