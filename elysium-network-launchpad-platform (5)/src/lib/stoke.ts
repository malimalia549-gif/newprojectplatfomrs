/** STOKE — the launchpad's native token, shipping with the Elysium mainnet. */

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { airdropClaims, pointEvents, stakes, users, vestingSchedules } from "@/db/schema";
import { ApiError, type PublicUser } from "@/lib/auth";
import { notify } from "@/lib/forge";

export { STOKE, TIERS, tierFor, apyFor, POINTS } from "@/lib/tokenomics";
export type { TierKey } from "@/lib/tokenomics";

import { STOKE, TIERS, tierFor, apyFor, type TierKey } from "@/lib/tokenomics";

export async function accrueAll(userIds?: string[]) {
  const rows = userIds?.length
    ? await db.select().from(stakes).where(and(eq(stakes.status, "active"), inArray(stakes.userId, userIds)))
    : await db.select().from(stakes).where(eq(stakes.status, "active"));
  for (const s of rows) {
    const hours = Math.max(0, (Date.now() - s.lastAccrualAt.getTime()) / 3_600_000);
    if (hours < 1 / 120) continue;
    const gain = (s.principal * (s.apy / 100) * hours) / 8760;
    await db
      .update(stakes)
      .set({ rewards: sql`${stakes.rewards} + ${Math.round(gain * 1e6) / 1e6}`, lastAccrualAt: new Date() })
      .where(eq(stakes.id, s.id));
  }
  return rows.length;
}

export async function stokeState(user: PublicUser | null) {
  await accrueAll(user ? [user.id] : undefined);
  const [agg] = await db
    .select({
      staked: sql<number>`coalesce(sum(${stakes.principal}),0)::float8`,
      rewards: sql<number>`coalesce(sum(${stakes.rewards}),0)::float8`,
      holders: sql<number>`count(distinct ${stakes.userId})::int`,
    })
    .from(stakes)
    .where(eq(stakes.status, "active"));
  const [supply] = await db.select({ total: sql<number>`coalesce(sum(${users.stoke}),0)::float8` }).from(users);
  const mine = user ? await db.select().from(stakes).where(and(eq(stakes.userId, user.id), eq(stakes.status, "active"))).orderBy(desc(stakes.createdAt)) : [];
  const claims = user ? await db.select().from(airdropClaims).where(eq(airdropClaims.userId, user.id)) : [];
  const claimedTiers = new Set(claims.map((c) => c.tier));
  const points = user?.points ?? 0;
  const myTier = tierFor(points);
  const vest = user ? await db.select().from(vestingSchedules).where(eq(vestingSchedules.userId, user.id)).limit(4) : [];
  const ledger = user ? await db.select().from(pointEvents).where(eq(pointEvents.userId, user.id)).orderBy(desc(pointEvents.createdAt)).limit(14) : [];

  return {
    apy: apyFor(agg?.staked ?? 0),
    totalStaked: agg?.staked ?? 0,
    rewardsPaid: agg?.rewards ?? 0,
    stakers: agg?.holders ?? 0,
    circulating: supply?.total ?? 0,
    myPositions: mine.map((s) => ({
      id: s.id,
      principal: s.principal,
      apy: s.apy,
      rewards: s.rewards,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      accrued: ((Date.now() - s.lastAccrualAt.getTime()) / 3_600_000) * (s.apy / 100) * s.principal,
    })),
    tiers: TIERS.map((t) => ({ ...t, claimed: claimedTiers.has(t.tier), unlocked: points >= t.min })),
    myTier: myTier.tier,
    vesting: vest.map((v) => {
      const monthsElapsed = Math.max(0, (Date.now() - v.startedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      const vestedPct = Math.min(100, v.tgePct + (100 - v.tgePct) * Math.min(1, monthsElapsed / v.months));
      const vested = (v.total * vestedPct) / 100;
      return {
        id: v.id,
        label: v.label,
        total: v.total,
        tgePct: v.tgePct,
        months: v.months,
        vestedPct,
        vested,
        claimable: Math.max(0, vested - v.claimed),
        claimed: v.claimed,
        startedAt: v.startedAt.toISOString(),
      };
    }),
    ledger: ledger.map((l) => ({ id: l.id, delta: l.delta, reason: l.reason, createdAt: l.createdAt.toISOString() })),
  };
}

export async function stakeTok(user: PublicUser, amount: number, lockDays = 0) {
  if (!(amount > 0)) throw new ApiError("Enter an amount of STOKE to stake.", 400);
  if (amount < 10) throw new ApiError("Minimum stake is 10 STOKE.", 400);
  if (user.stoke < amount) throw new ApiError(`Only ${user.stoke.toFixed(2)} STOKE liquid in your account.`, 402);
  const base = apyFor(0);
  const boost = Math.min(14, lockDays * 0.35) + (user.points >= 3000 ? 4 : user.points >= 1200 ? 2 : 0);
  const apy = Math.min(STOKE.maxApy, base + boost);
  const id = `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(stakes).values({ id, userId: user.id, principal: amount, apy, rewards: 0, lastAccrualAt: new Date(), status: lockDays > 0 ? "active" : "active" });
  await db.update(users).set({ stoke: sql`${users.stoke} - ${amount}` }).where(eq(users.id, user.id));
  await db.insert(pointEvents).values({ id: `pt_${Date.now()}_stk`, userId: user.id, delta: Math.round(amount / 10), reason: "stake" });
  await db.update(users).set({ points: sql`${users.points} + ${Math.round(amount / 10)}` }).where(eq(users.id, user.id));
  return { id, apy };
}

export async function unstakeTok(user: PublicUser, stakeId: string) {
  const rows = await db.select().from(stakes).where(eq(stakes.id, stakeId)).limit(1);
  const s = rows[0];
  if (!s || s.userId !== user.id) throw new ApiError("Stake not found.", 404);
  if (s.status !== "active") throw new ApiError("Already withdrawn.", 409);
  await accrueAll([user.id]);
  const fresh = (await db.select().from(stakes).where(eq(stakes.id, stakeId)).limit(1))[0]!;
  const payout = fresh.principal + fresh.rewards;
  await db.update(stakes).set({ status: "withdrawn", principal: 0, rewards: 0, lastAccrualAt: new Date() }).where(eq(stakes.id, stakeId));
  await db.update(users).set({ stoke: sql`${users.stoke} + ${payout}` }).where(eq(users.id, user.id));
  return { payout: Math.round(payout * 1e6) / 1e6 };
}

export async function claimAirdrop(user: PublicUser, tier: TierKey) {
  const def = TIERS.find((t) => t.tier === tier);
  if (!def) throw new ApiError("Unknown airdrop tier.", 404);
  if (user.points < def.min) throw new ApiError(`Needs ${def.min} points — you have ${user.points}.`, 403);
  const existing = await db.select().from(airdropClaims).where(and(eq(airdropClaims.userId, user.id), eq(airdropClaims.tier, tier))).limit(1);
  if (existing[0]) throw new ApiError("Tier already claimed for this account.", 409);
  await db.insert(airdropClaims).values({ id: `air_${Date.now()}`, userId: user.id, tier, amount: def.amount, wallet: user.wallet });
  await db.update(users).set({ stoke: sql`${users.stoke} + ${def.amount}` }).where(eq(users.id, user.id));
  await notify(user.id, "airdrop", `${def.amount.toLocaleString("en-US")} STOKE claimed`, `${def.label} tier delivered to ${user.wallet.slice(0, 8)}… on Elysium 99801.`, "/stoke");
  return { amount: def.amount, tier };
}

export async function claimVested(user: PublicUser, scheduleId: string) {
  const state = await stokeState(user);
  const found = state.vesting.find((v) => v.id === scheduleId);
  if (!found) throw new ApiError("Vesting schedule not found.", 404);
  if (found.claimable <= 0) throw new ApiError("Nothing has unlocked yet — vesting is monthly.", 409);
  const amount = Math.round(found.claimable * 1e6) / 1e6;
  await db.update(vestingSchedules).set({ claimed: sql`${vestingSchedules.claimed} + ${amount}` }).where(eq(vestingSchedules.id, scheduleId));
  await db.update(users).set({ stoke: sql`${users.stoke} + ${amount}` }).where(eq(users.id, user.id));
  return { amount };
}

export async function leaderboard(limit = 20) {
  const rows = await db
    .select({ id: users.id, name: users.name, wallet: users.wallet, points: users.points, stoke: users.stoke, role: users.role })
    .from(users)
    .orderBy(desc(users.points))
    .limit(limit);
  return rows.map((r, i) => ({ rank: i + 1, ...r, tier: tierFor(r.points).label }));
}
