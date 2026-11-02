import { sql } from "drizzle-orm";
import { db, ledgerTransaction } from "@/db";
import { chainState, holders, lifecycleEvents, perpFills, perpMarkets, pointEvents, stakes, trades, users, vestingSchedules, launches } from "@/db/schema";
import { addressFor, hashPassword } from "@/lib/auth";
import { CURVE, marginalPrice, virtualHype0 } from "@/lib/curve";
import { rng } from "@/lib/util";

let done = false;
const globalFlag = globalThis as unknown as { __forgeSeeded?: Promise<void> | false };

const SEED_HYPE = (graduationHype: number, fraction: number) => {
  const vH = virtualHype0(graduationHype);
  const vT = CURVE.virtualTokens;
  const sold = CURVE.sellable * fraction;
  const raised = vH * (vT / (vT - sold) - 1);
  return { sold, raised };
};

type SeedToken = {
  name: string;
  symbol: string;
  slug: string;
  description: string;
  category: "meme" | "infra" | "rwa" | "gaming" | "ai" | "dao";
  accent: string;
  glyph: string;
  fraction: number;
  stage: "trading" | "graduated" | "perp_listed";
  cashtag?: string;
  xHandle?: string;
  graduationHype?: number;
};

const TOKENS: SeedToken[] = [
  {
    name: "Lava Cat",
    symbol: "LAVA",
    slug: "lava-cat",
    description: "Chain-native mascot for Elysium testnet. Absorbs on the curve, 0.05 HYPE launch fee, no team allocation.",
    category: "meme",
    accent: "#ff8a5c",
    glyph: "▲",
    fraction: 0.34,
    stage: "trading",
    graduationHype: 60,
    xHandle: "lavacat_hype",
  },
  {
    name: "Orbit Liquidity",
    symbol: "ORBT",
    slug: "orbit-liquidity",
    description: "First FORGE launch to walk the whole path: curve → Uniswap pool → HyperCore spot book → HIP-3 perp with a live $CASHTAG.",
    category: "infra",
    accent: "#7ce0ff",
    glyph: "◍",
    fraction: 1,
    stage: "perp_listed",
    cashtag: "ORBT",
    xHandle: "orbitliquidity",
    graduationHype: 140,
  },
  {
    name: "Dawn Staked",
    symbol: "DAWN",
    slug: "dawn-staked",
    description: "Graduated and LP-locked for 4 years. Waiting on a builder to stake the HIP-3 venue and open 20x perps.",
    category: "dao",
    accent: "#a78bfa",
    glyph: "☄",
    fraction: 1,
    stage: "graduated",
    xHandle: "dawnstaked",
    graduationHype: 48,
  },
  {
    name: "Prop Market Maker",
    symbol: "PROPM",
    slug: "prop-market-maker",
    description: "PropAMM quoting token: quotes refresh 8x a second on Elysium and hedge on HyperCore.",
    category: "infra",
    accent: "#2ee6a8",
    glyph: "▤",
    fraction: 0.91,
    stage: "trading",
    xHandle: "propamm",
    graduationHype: 90,
  },
  {
    name: "Tokenized Handle",
    symbol: "GNOST",
    slug: "tokenized-handle",
    description: "Experiment in account tokenization — a curve priced in HYPE that graduates into a pool with locked liquidity.",
    category: "ai",
    accent: "#ffc857",
    glyph: "✦",
    fraction: 0.12,
    stage: "trading",
    xHandle: "handlelabs",
    graduationHype: 45,
  },
];

const TRADERS = [
  { name: "hyperminh", email: "hyperminh@elysium.test", points: 8420, stoke: 41200, hype: 96.4, usdc: 52000 },
  { name: "curvehunter", email: "curvehunter@elysium.test", points: 4180, stoke: 18400, hype: 41.2, usdc: 26500 },
  { name: "0xLava", email: "lava@elysium.test", points: 2260, stoke: 9800, hype: 18.9, usdc: 14200 },
  { name: "keeper.eth", email: "keeper@elysium.test", points: 1530, stoke: 6100, hype: 12.2, usdc: 30000 },
  { name: "vulpes", email: "vulpes@elysium.test", points: 740, stoke: 2450, hype: 7.5, usdc: 5400 },
];

async function seedUser(input: { name: string; email: string; points: number; stoke: number; hype: number; usdc: number; role?: "trader" | "creator" | "keeper" | "admin"; xHandle?: string }) {
  const id = `usr_${input.email.split("@")[0]}_${Math.abs(hashCode(input.email)) % 9973}`;
  await db
    .insert(users)
    .values({
      id,
      email: input.email,
      name: input.name,
      passwordHash: hashPassword("forge1234"),
      wallet: addressFor(input.email),
      xHandle: input.xHandle ?? null,
      role: input.role ?? "trader",
      hype: input.hype,
      usdc: input.usdc,
      stoke: input.stoke,
      points: input.points,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 26),
    })
    .onConflictDoNothing();
  const rows = await db.select().from(users).where(sql`email = ${input.email}`).limit(1);
  return rows[0]!;
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export async function ensureSeeded() {
  if (done) return;
  if (globalFlag.__forgeSeeded) { await globalFlag.__forgeSeeded; return; }
  if (!globalFlag.__forgeSeeded) { const task = ledgerTransaction(async () => {
    try {
    await db.execute(sql`select 1`);
    const existing = await db.select({ n: sql<number>`count(*)::int` }).from(launches);
    if ((existing[0]?.n ?? 0) > 0) return;

    await db.execute(sql`
      insert into chain_state (id, head_block, last_block_at, hype_usd, stoke_usd, total_fees_hype, stoke_burned)
      values ('head', 12719639, now(), 28.4, 0.0412, 0, 0) on conflict (id) do nothing
    `);

    const demo = await seedUser({ name: "forge.demo", email: "demo@forge.xyz", points: 1260, stoke: 12000, hype: 40, usdc: 25000, role: "creator", xHandle: "forgedemo" });
    const traders = await Promise.all(TRADERS.map((t) => seedUser({ ...t, xHandle: t.name })));
    const everyone = [demo, ...traders];

    for (const t of traders) {
      await db
        .insert(pointEvents)
        .values({ id: `pt_seed_${t.id}`, userId: t.id, delta: t.points, reason: "testnet season 1" })
        .onConflictDoNothing();
    }

    const r = rng(20261109);

    for (const spec of TOKENS) {
      const graduationHype = spec.graduationHype ?? 12;
      const { sold, raised } = SEED_HYPE(graduationHype, Math.min(1, spec.fraction));
      const creator = spec.stage === "trading" ? traders[Math.floor(r() * traders.length)]! : demo;
      const id = `lch_seed_${spec.symbol.toLowerCase()}`;
      const fee = (raised / 0.99) * 0.01;
      await db.insert(launches).values({
        id,
        slug: spec.slug,
        name: spec.name,
        symbol: spec.symbol,
        description: spec.description,
        creatorId: creator.id,
        creatorName: creator.name,
        accent: spec.accent,
        glyph: spec.glyph,
        category: spec.category,
        xHandle: spec.xHandle ?? null,
        cashtag: spec.cashtag ?? null,
        soldTokens: sold,
        raisedHype: raised,
        treasuryHype: fee * 0.75,
        creatorHype: fee * 0.25,
        graduationHype,
        tickerReserve: Math.max(0.5, graduationHype * 0.05),
        stage: spec.stage,
        ticket: spec.stage === "trading" ? "none" : "confirmed",
        tokenAddress: addressFor(`${spec.symbol}:seed`),
        poolAddress: spec.stage === "trading" ? null : addressFor(`pool:${spec.symbol}`),
        poolLiquidityHype: spec.stage === "trading" ? 0 : raised,
        poolTokens: spec.stage === "trading" ? 0 : CURVE.bookTokens,
        lpLockedUntil: spec.stage === "trading" ? null : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 4),
        hypercoreSpotIndex: spec.stage === "trading" ? null : 100 + (hashCode(spec.symbol) % 800),
        perpMarketId: spec.stage === "perp_listed" ? `hip3_${spec.symbol.toLowerCase()}_seed` : null,
        volumeHype: raised / 0.99,
        tradesCount: 0,
        holdersCount: 0,
        paidWith: r() > 0.5 ? "x_money" : "hype",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * (18 + Math.floor(r() * 400))),
        graduatedAt: spec.stage === "trading" ? null : new Date(Date.now() - 1000 * 60 * 60 * 8),
        listedAt: spec.stage === "perp_listed" ? new Date(Date.now() - 1000 * 60 * 60 * 6) : null,
      });

      // trades walking the curve
      const steps = 14 + Math.floor(r() * 8);
      let cursorSold = 0;
      let cursorRaised = 0;
      let count = 0;
      for (let i = 0; i < steps; i++) {
        const targetSold = (sold * (i + 1)) / steps;
        const tokens = Math.max(1, targetSold - cursorSold);
        const priceBefore = marginalPrice({ sold: cursorSold, raised: cursorRaised, graduationHype, feeBps: 100 });
        const priceAfter = marginalPrice({ sold: targetSold, raised: cursorRaised, graduationHype, feeBps: 100 });
        const hype = tokens * ((priceBefore + priceAfter) / 2) / 0.99;
        const who = traders[Math.floor(r() * traders.length)]!;
        cursorSold = targetSold;
        cursorRaised = raised * ((i + 1) / steps);
        count += 1;
        await db.insert(trades).values({
          id: `trd_seed_${spec.symbol}_${i}`,
          launchId: id,
          userId: who.id,
          traderName: who.name,
          traderWallet: who.wallet,
          side: r() > 0.78 && i > steps / 2 ? "sell" : "buy",
          hypeAmount: Math.round(hype * 1e5) / 1e5,
          tokenAmount: Math.round(tokens * 1e5) / 1e5,
          feeHype: Math.round(hype * 0.01 * 1e6) / 1e6,
          priceAfter: priceAfter,
          txHash: addressFor(`${spec.symbol}:${i}`),
          blockNumber: 12_700_000 + i * 137 + hashCode(spec.symbol) % 900,
          createdAt: new Date(Date.now() - (steps - i) * 1000 * 60 * (26 + Math.floor(r() * 90))),
        });
      }
      await db.update(launches).set({ tradesCount: count }).where(sql`id = ${id}`);

      // holder bags
      let remaining = sold;
      const picked = everyone.slice(0, 3 + Math.floor(r() * 4));
      for (const [idx, holder] of picked.entries()) {
        const bag = idx === picked.length - 1 ? remaining : remaining * (0.55 - idx * 0.06);
        remaining -= bag;
        if (bag <= 0) continue;
        await db
          .insert(holders)
          .values({ id: `hld_seed_${spec.symbol}_${idx}`, launchId: id, userId: holder.id, wallet: holder.wallet, amount: Math.round(bag) })
          .onConflictDoNothing();
      }
      const holderCount = await db.select({ n: sql<number>`count(*)::int` }).from(holders).where(sql`launch_id = ${id}`);
      await db.update(launches).set({ holdersCount: holderCount[0]?.n ?? 0 }).where(sql`id = ${id}`);

      const timeline: Array<[string, string, string]> = [
        ["created", "launch() — CorePadFactory style deploy", `1,000,000,000 ${spec.symbol} minted to the launch pool · curve live on Elysium 99801`],
        ["trading", "Trading open", "1% fee on the HYPE leg · 25% to creator · graduation at 800M sold"],
      ];
      if (spec.fraction >= 1) timeline.push(["frozen", "Curve sold out — 800M absorbed", "Pool frozen. Anyone can now call graduate()."]);
      if (spec.stage !== "trading") {
        timeline.push(
          ["graduating", "graduate() → Settlement Ticket{Open}", `${raised.toFixed(3)} HYPE + 200,000,000 book tokens locked for dispatch`],
          ["graduating", "dispatch() → ElysiumBridgeAdapter", "tokens via mirror escrow · HYPE via ArbSys(0x64).withdrawEth → coreSettler"],
          ["graduated", "confirm() → Uniswap V3 pool + HyperCore spot", "Outbox claimed · HIP-1 registerToken2 · TOKEN/USDC ladder seeded · LP locked 4y"],
        );
      }
      if (spec.stage === "perp_listed") timeline.push(["perp_listed", "HIP-3 venue deployed", `${spec.symbol}-PERP live · 500,000 HYPE deployer stake · isolated margin, 20x max`]);
      for (const [step, label, detail] of timeline) {
        await db.insert(lifecycleEvents).values({ id: `ev_seed_${spec.symbol}_${step}_${label.length}`, launchId: id, step: step as never, label, detail, txHash: addressFor(`${id}:${label}`) });
      }
    }

    // perp markets
    const hypeUsd = 28.4;
    const orbit = await db.select().from(launches).where(sql`symbol = 'ORBT'`).limit(1);
    const orbitPrice = (orbit[0]!.poolLiquidityHype || 1) / (orbit[0]!.poolTokens || 1) * hypeUsd;
    const markets = [
      { id: "hip3_orbt_seed", symbol: "ORBT", launchId: orbit[0]!.id, price: orbitPrice * 1.42, vol: 0.0016, oi: 412_000, vol24: 1_940_000, lev: 20, status: "live" as const },
      { id: "hip3_stoke_seed", symbol: "STOKE", launchId: null, price: 0.0412, vol: 0.0008, oi: 2_940_000, vol24: 8_120_000, lev: 25, status: "live" as const },
      { id: "hip3_kntq_seed", symbol: "KNTQ", launchId: null, price: 0.842, vol: 0.0006, oi: 6_120_000, vol24: 14_800_000, lev: 25, status: "live" as const },
      { id: "hip3_dawn_seed", symbol: "DAWN", launchId: null, price: 0.0000000000000001, vol: 0.001, oi: 0, vol24: 0, lev: 10, status: "prelist" as const },
    ];
    for (const m of markets.filter((x) => x.status === "live")) {
      await db.insert(perpMarkets).values({
        id: m.id,
        symbol: m.symbol,
        launchId: m.launchId,
        venue: "forge-hip3",
        indexPrice: m.price,
        markPrice: m.price,
        anchorPrice: m.price,
        vol: m.vol,
        openInterestUsd: m.oi,
        volume24hUsd: m.vol24,
        maxLeverage: m.lev,
        open24hPrice: m.price * 0.972,
        high24hPrice: m.price * 1.031,
        low24hPrice: m.price * 0.958,
        priceTrail: JSON.stringify(Array.from({ length: 40 }, (_, i) => m.price * (1 + Math.sin(i / 4) * 0.012 + (rng(i + 3)() - 0.5) * 0.01))),
        status: m.status,
      });
    }

    // a little perp history so the tape and leaderboard are alive
    const live = markets.filter((m) => m.status === "live");
    for (const [i, m] of live.entries()) {
      for (let j = 0; j < 7; j++) {
        const who = traders[(i + j) % traders.length]!;
        const side = j % 3 === 0 ? "short" : "long";
        const size = Math.round((m.oi / 8 / m.price) * (0.4 + rng(j * 13 + i)()));
        await db.insert(perpFills).values({
          id: `fil_seed_${m.symbol}_${j}`,
          marketId: m.id,
          marketSymbol: m.symbol,
          userId: who.id,
          traderName: who.name,
          action: j === 5 ? "close" : "open",
          side,
          size,
          price: m.price * (1 + (rng(j + i)() - 0.5) * 0.01),
          feeUsd: 0,
          pnlUsd: j === 5 ? size * m.price * 0.008 * (side === "long" ? 1 : -1) : 0,
          leverage: 5 + ((i + j) % 12),
          txHash: addressFor(`fill:${m.symbol}:${j}`),
          blockNumber: 12_718_000 + j * 61,
          createdAt: new Date(Date.now() - (7 - j) * 1000 * 60 * 9),
        });
      }
    }

    await db
      .insert(stakes)
      .values({ id: "stk_seed_demo", userId: demo.id, principal: 5200, apy: 21.4, rewards: 96.2, lastAccrualAt: new Date(Date.now() - 1000 * 60 * 48), status: "active" })
      .onConflictDoNothing();
    await db
      .insert(vestingSchedules)
      .values({ id: "vest_seed_demo", userId: demo.id, label: "Season 1 testnet airdrop", total: 9000, tgePct: 25, months: 12, claimed: 0, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 122) })
      .onConflictDoNothing();
    await db
      .insert(vestingSchedules)
      .values({ id: "vest_seed_creator", userId: demo.id, label: "Creator fee stream (ORBT)", total: 2400, tgePct: 40, months: 6, claimed: 240, startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 74) })
      .onConflictDoNothing();
  } catch (e) {
    done = false;
    globalFlag.__forgeSeeded = false;
    console.error("[forge:seed]", (e as Error).message);
    throw e;
    }
  }).then(() => { done = true; }).finally(() => { globalFlag.__forgeSeeded = false; });
  globalFlag.__forgeSeeded = task;
  }
  await globalFlag.__forgeSeeded;
}
