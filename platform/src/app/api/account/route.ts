import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { airdropClaims, faucetClaims, holders, launches, notifications, payments as paymentRows, perpFills, pointEvents, stakes, trades, users } from "@/db/schema";
import { requireUser, toPublicUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { head } from "@/lib/chain";
import { toSummary } from "@/lib/forge";
import { userPositions } from "@/lib/perps";
import { stokeState, tierFor } from "@/lib/stoke";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const h = await head();
  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  const [mine, bags, own, fills, points, pays, faucet, airdrops, notifRows, stakeRows] = await Promise.all([
    db.select().from(launches).where(eq(launches.creatorId, user.id)).orderBy(desc(launches.createdAt)).limit(24),
    db
      .select({
        launchId: holders.launchId,
        amount: sql<number>`sum(${holders.amount})::float8`,
        symbol: launches.symbol,
        name: launches.name,
        slug: launches.slug,
        stage: launches.stage,
        accent: launches.accent,
        glyph: launches.glyph,
      })
      .from(holders)
      .innerJoin(launches, eq(launches.id, holders.launchId))
      .where(and(eq(holders.userId, user.id), gte(holders.amount, 1)))
      .orderBy(desc(sql`sum(${holders.amount})`))
      .groupBy(holders.launchId, launches.symbol, launches.name, launches.slug, launches.stage, launches.accent, launches.glyph)
      .limit(24),
    userPositions(user),
    db.select().from(perpFills).where(eq(perpFills.userId, user.id)).orderBy(desc(perpFills.createdAt)).limit(24),
    db.select().from(pointEvents).where(eq(pointEvents.userId, user.id)).orderBy(desc(pointEvents.createdAt)).limit(12),
    db.select().from(paymentRows).where(eq(paymentRows.userId, user.id)).orderBy(desc(paymentRows.createdAt)).limit(12),
    db.select().from(faucetClaims).where(eq(faucetClaims.userId, user.id)).orderBy(desc(faucetClaims.createdAt)).limit(6),
    db.select().from(airdropClaims).where(eq(airdropClaims.userId, user.id)),
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(24),
    db.select().from(stakes).where(eq(stakes.userId, user.id)).orderBy(desc(stakes.createdAt)).limit(12),
  ]);

  const launchViews = await Promise.all(mine.map((l) => toSummary(l, h.hypeUsd, user.id)));
  const vol = await db.select({ total: sql<number>`coalesce(sum(${trades.hypeAmount}),0)::float8`, n: sql<number>`count(*)::int` }).from(trades).where(eq(trades.userId, user.id));

  return Response.json({
    user: me ? toPublicUser(me) : user,
    tier: tierFor(me?.points ?? 0).label,
    prices: { hypeUsd: h.hypeUsd, stokeUsd: h.stokeUsd, headBlock: h.headBlock },
    launches: launchViews,
    bags: bags.map((b) => ({ ...b, amount: Number(b.amount) })),
    positions: own.positions,
    restingOrders: own.orders.map((o) => ({ id: o.id, symbol: o.marketSymbol, side: o.side, kind: o.kind, size: o.size, limitPrice: o.limitPrice, leverage: o.leverage, status: o.status })),
    fills: fills.map((f) => ({ id: f.id, symbol: f.marketSymbol, action: f.action, side: f.side, size: f.size, price: f.price, pnlUsd: f.pnlUsd, createdAt: f.createdAt.toISOString(), blockNumber: f.blockNumber })),
    points: points.map((p) => ({ id: p.id, delta: p.delta, reason: p.reason, createdAt: p.createdAt.toISOString() })),
    payments: pays.map((p) => ({
      id: p.id,
      provider: p.provider,
      purpose: p.purpose,
      status: p.status,
      amountUsd: p.amountUsd,
      amountHype: p.amountHype,
      xHandle: p.xHandle,
      reference: p.reference,
      live: p.live,
      createdAt: p.createdAt.toISOString(),
    })),
    faucet: faucet.map((f) => ({ id: f.id, hype: f.amountHype, usdc: f.amountUsdc, createdAt: f.createdAt.toISOString() })),
    airdrops: airdrops.map((a) => ({ tier: a.tier, amount: a.amount, claimedAt: a.claimedAt.toISOString() })),
    notifications: notifRows.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: n.href, read: n.read, createdAt: n.createdAt.toISOString() })),
    stakes: stakeRows.map((s) => ({ id: s.id, principal: s.principal, apy: s.apy, rewards: s.rewards, status: s.status, createdAt: s.createdAt.toISOString() })),
    curveVolume: vol[0]?.total ?? 0,
    curveTrades: vol[0]?.n ?? 0,
    stoke: await stokeState(user),
  });
});
