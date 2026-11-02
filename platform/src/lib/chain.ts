import { sql } from "drizzle-orm";
import { db } from "@/db";
import { chainState } from "@/db/schema";
import { ELYSIUM } from "@/lib/util";

export type Head = {
  headBlock: number;
  hypeUsd: number;
  stokeUsd: number;
  totalFeesHype: number;
  stokeBurned: number;
};

const DEFAULTS: Head = {
  headBlock: 12_719_639,
  hypeUsd: 28.4,
  stokeUsd: 0.0412,
  totalFeesHype: 0,
  stokeBurned: 0,
};

let cache: { at: number; value: Head } | null = null;

/** Read the persisted sandbox head. Only the explicit simulation tick advances it. */
export async function head(refreshMs = 900): Promise<Head> {
  if (cache && Date.now() - cache.at < refreshMs) return cache.value;
  const rows = await db.select().from(chainState).where(sql`id = 'head'`).limit(1);
  const row = rows[0];
  const value: Head = row
    ? {
        headBlock: Number(row.headBlock),
        hypeUsd: Number(row.hypeUsd),
        stokeUsd: Number(row.stokeUsd),
        totalFeesHype: Number(row.totalFeesHype),
        stokeBurned: Number(row.stokeBurned),
      }
    : DEFAULTS;
  cache = { at: Date.now(), value };
  return value;
}

export async function addFees(hypeAmount: number, stokeBurn: number) {
  await db.execute(sql`
    update chain_state
       set total_fees_hype = total_fees_hype + ${hypeAmount},
           stoke_burned = stoke_burned + ${stokeBurn}
     where id = 'head'
  `);
  cache = null;
}

export async function nextBlockNumber() {
  const h = await head(0);
  return h.headBlock;
}

export async function advanceSandboxHead() {
  await db.execute(sql`update chain_state set
    head_block = head_block + greatest(1, floor(extract(epoch from (now() - last_block_at)) * ${1000 / ELYSIUM.blockMs})::int),
    last_block_at = now(),
    hype_usd = round((hype_usd * (1 + (random() - 0.5) * 0.0016))::numeric, 4),
    stoke_usd = round((stoke_usd * (1 + (random() - 0.5) * 0.004))::numeric, 6)
    where id = 'head'`);
  cache = null;
}
