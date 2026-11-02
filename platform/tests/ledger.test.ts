import test, { after } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, ledgerTransaction, pool } from "../src/db";
import { users, perpPositions, perpOrders } from "../src/db/schema";
import { hashPassword, toPublicUser } from "../src/lib/auth";
import { openPosition, settleFunding, sweep, placeTriggerOrder, type MarketRow } from "../src/lib/perps";

after(() => pool.end());
class Rollback extends Error {}
/** Each scenario is genuinely PostgreSQL-backed, then rolled back, including its test account. */
async function scenario(fn: (user: ReturnType<typeof toPublicUser>, market: MarketRow) => Promise<void>) {
  try {
    await ledgerTransaction(async () => {
      const id = `qa_ledger_${crypto.randomUUID()}`;
      const [row] = await db.insert(users).values({ id, email: `${id}@example.test`, name: "Ledger regression", passwordHash: hashPassword("test-only-password"), wallet: `0x${"1".repeat(40)}`, usdc: 10000 }).returning();
      const [market] = await db.select().from(marketTable()).where(eq(perpMarkets.id, "hip3_kntq_seed"));
      assert.ok(market);
      await fn(toPublicUser(row), market);
      throw new Rollback();
    });
  } catch (error) { if (!(error instanceof Rollback)) throw error; }
}
import { perpMarkets } from "../src/db/schema";
const marketTable = () => perpMarkets;
const balance = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0]!.usdc;

test("ledger: funding is accrued once across repeated sweeps", () => scenario(async (user, market) => {
  const opened = await openPosition(user, market.id, { side: "long", notionalUsd: 100, leverage: 5 });
  await db.update(perpPositions).set({ lastFundingAt: new Date(Date.now() - 3_600_000) }).where(eq(perpPositions.id, opened.position.id));
  const charged = { ...market, fundingHour: 0.0001 };
  await settleFunding(charged);
  const first = (await db.select().from(perpPositions).where(eq(perpPositions.id, opened.position.id)))[0]!;
  assert.ok(first.fundingAccrued > 0);
  await settleFunding(charged);
  const second = (await db.select().from(perpPositions).where(eq(perpPositions.id, opened.position.id)))[0]!;
  assert.equal(second.fundingAccrued, first.fundingAccrued);
}));

test("ledger: take-profit actually closes and credits equity", () => scenario(async (user, market) => {
  const opened = await openPosition(user, market.id, { side: "long", notionalUsd: 100, leverage: 5, tpPct: 0.01 });
  const before = await balance(user.id);
  await sweep({ ...market, markPrice: opened.price * 1.02 });
  const position = (await db.select().from(perpPositions).where(eq(perpPositions.id, opened.position.id)))[0]!;
  assert.equal(position.status, "closed"); assert.equal(position.size, 0);
  assert.ok(await balance(user.id) > before + opened.margin);
}));

test("ledger: stop-loss actually closes a losing position", () => scenario(async (user, market) => {
  const opened = await openPosition(user, market.id, { side: "long", notionalUsd: 100, leverage: 5, slPct: 0.01 });
  await sweep({ ...market, markPrice: opened.price * 0.98 });
  const position = (await db.select().from(perpPositions).where(eq(perpPositions.id, opened.position.id)))[0]!;
  assert.equal(position.status, "closed"); assert.ok(position.realizedPnl < 0);
}));

test("ledger: liquidation cannot be closed again for a second payout", () => scenario(async (user, market) => {
  const opened = await openPosition(user, market.id, { side: "long", notionalUsd: 100, leverage: 10 });
  await sweep({ ...market, markPrice: opened.position.liqPrice * 0.95 });
  const position = (await db.select().from(perpPositions).where(eq(perpPositions.id, opened.position.id)))[0]!;
  assert.equal(position.status, "closed");
  const after = await balance(user.id);
  await assert.rejects(() => import("../src/lib/perps").then((m) => m.closePosition(user, opened.position.id)));
  assert.equal(await balance(user.id), after);
}));

test("ledger: a resting limit consumes its reservation exactly once on fill", () => scenario(async (user, market) => {
  const limitPrice = market.markPrice * 0.9;
  const order = await placeTriggerOrder(user, market.id, { side: "buy", kind: "limit", limitPrice, size: 100 / limitPrice, leverage: 5 });
  await sweep({ ...market, markPrice: limitPrice * 0.99 });
  const stored = (await db.select().from(perpOrders).where(eq(perpOrders.id, order.id)))[0]!;
  assert.equal(stored.status, "filled"); assert.equal(stored.reservedUsd, 0);
  const positions = await db.select().from(perpPositions).where(eq(perpPositions.userId, user.id));
  assert.equal(positions.length, 1); assert.equal(positions[0]!.status, "open");
  assert.ok(await balance(user.id) < 10000 - 19);
}));
