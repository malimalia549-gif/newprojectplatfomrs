import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required. Run npm run dev for the local sandbox database.");
const globalForDb = globalThis as typeof globalThis & { __unifiedPool?: Pool };
export const pool = globalForDb.__unifiedPool ?? new Pool({ connectionString: databaseUrl, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
if (process.env.NODE_ENV !== "production") globalForDb.__unifiedPool = pool;
const base = drizzle(pool);
const context = new AsyncLocalStorage<typeof base>();

/** The sandbox serializes ledger writes. Replace with account-scoped locking + an outbox before production. */
export async function ledgerTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return base.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(742091)`);
    return context.run(tx as unknown as typeof base, fn);
  });
}

/** Existing domain modules share the active transaction, including nested helpers. */
export const db = new Proxy(base, {
  get(target, key) {
    const current = context.getStore() ?? target;
    const value = Reflect.get(current, key);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
