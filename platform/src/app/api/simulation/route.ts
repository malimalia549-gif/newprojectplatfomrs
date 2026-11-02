import { sql } from "drizzle-orm";
import { db } from "@/db";
import { route } from "@/lib/api";
import { simulationTick } from "@/lib/perps";

export const dynamic = "force-dynamic";
/** Explicit sandbox clock. At most one tick every 2.5 seconds across all viewers. */
export const POST = route(async () => {
  const state = await db.execute<{ ready: boolean }>(sql`select coalesce(max(last_block_at) < now() - interval '2.5 seconds', true) as ready from chain_state`);
  if (!state.rows[0]?.ready) return Response.json({ skipped: true, live: false });
  return Response.json(await simulationTick());
});
