import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { faucetClaims, users } from "@/db/schema";
import { ApiError, currentUser, requireUser } from "@/lib/auth";
import { body, route } from "@/lib/api";
import { ELYSIUM } from "@/lib/util";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = 1000 * 60 * 30;
const DRIP = { hype: 5, usdc: 1200, stoke: 250 };

async function lastClaim(userId: string) {
  const rows = await db.select().from(faucetClaims).where(and_(userId)).orderBy(desc(faucetClaims.createdAt)).limit(1);
  return rows[0]?.createdAt.getTime() ?? 0;
}

function and_(userId: string) {
  return eq(faucetClaims.userId, userId);
}

export const GET = route(async () => {
  const user = await currentUser();
  if (!user) return Response.json({ drip: DRIP, cooldownMs: COOLDOWN_MS, nextInMs: 0, network: ELYSIUM.chainId, boosts: {} });
  const at = await lastClaim(user.id);
  const next = Math.max(0, at + COOLDOWN_MS - Date.now());
  const mult = 1;
  return Response.json({ drip: DRIP, cooldownMs: COOLDOWN_MS, nextInMs: next, mult, network: ELYSIUM.chainId, wallet: user.wallet });
});

/** POST /api/faucet { wallet, usdc } */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  await body(req);
  const at = await lastClaim(user.id);
  if (Date.now() - at < COOLDOWN_MS) {
    const secs = Math.ceil((COOLDOWN_MS - (Date.now() - at)) / 1000);
    throw new ApiError(`Faucet is rate limited — try again in ${secs}s.`, 429);
  }
  const hype = DRIP.hype;
  const usdc = DRIP.usdc;
  const stoke = user.points >= 1200 ? DRIP.stoke : 0;

  await db.insert(faucetClaims).values({ id: `fct_${Date.now()}`, userId: user.id, wallet: user.wallet, amountHype: hype, amountUsdc: usdc });
  await db
    .update(users)
    .set({ hype: sql`${users.hype} + ${hype}`, usdc: sql`${users.usdc} + ${usdc}`, stoke: sql`${users.stoke} + ${stoke}`, points: sql`${users.points} + 25` })
    .where(eq(users.id, user.id));
  const after = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return Response.json({ ok: true, credited: { hype, usdc, stoke }, user: after[0] ? { hype: after[0].hype, usdc: after[0].usdc, stoke: after[0].stoke, points: after[0].points } : null, nextInMs: COOLDOWN_MS });
});

function strOr(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
