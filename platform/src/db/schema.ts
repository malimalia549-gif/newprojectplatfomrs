import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    wallet: text("wallet").notNull(),
    xHandle: text("x_handle"),
    avatarSeed: text("avatar_seed").notNull().default("ice"),
    role: text("role").$type<"trader" | "creator" | "keeper" | "admin">().notNull().default("trader"),
    hype: doublePrecision("hype").notNull().default(0),
    usdc: doublePrecision("usdc").notNull().default(0),
    stoke: doublePrecision("stoke").notNull().default(0),
    points: integer("points").notNull().default(0),
    banned: boolean("banned").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ *
 * Launchpad: Create → Trading → Graduate → Pool → HIP-3
 * ------------------------------------------------------------------ */

export type LaunchStage = "created" | "trading" | "frozen" | "graduating" | "graduated" | "perp_listed";
export type TicketState = "none" | "open" | "dispatched" | "confirmed" | "aborted";

export const launches = pgTable(
  "launches",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    description: text("description").notNull().default(""),
    creatorId: text("creator_id").references(() => users.id, { onDelete: "set null" }),
    creatorName: text("creator_name"),
    accent: text("accent").notNull().default("#7ce0ff"),
    glyph: text("glyph").notNull().default("◆"),
    category: text("category").$type<"meme" | "infra" | "rwa" | "gaming" | "ai" | "dao">().notNull().default("meme"),
    xHandle: text("x_handle"),
    cashtag: text("cashtag"),
    totalSupply: doublePrecision("total_supply").notNull().default(1_000_000_000),
    soldTokens: doublePrecision("sold_tokens").notNull().default(0),
    raisedHype: doublePrecision("raised_hype").notNull().default(0),
    treasuryHype: doublePrecision("treasury_hype").notNull().default(0),
    creatorHype: doublePrecision("creator_hype").notNull().default(0),
    graduationHype: doublePrecision("graduation_hype").notNull().default(12),
    tickerReserve: doublePrecision("ticker_reserve").notNull().default(0.5),
    feeBps: integer("fee_bps").notNull().default(100),
    stage: text("stage").$type<LaunchStage>().notNull().default("created"),
    ticket: text("ticket").$type<TicketState>().notNull().default("none"),
    tokenAddress: text("token_address"),
    poolAddress: text("pool_address"),
    poolKind: text("pool_kind").$type<"uniswap_v3" | "propamm">().notNull().default("uniswap_v3"),
    poolLiquidityHype: doublePrecision("pool_liquidity_hype").notNull().default(0),
    poolTokens: doublePrecision("pool_tokens").notNull().default(0),
    lpLockedUntil: timestamp("lp_locked_until", { mode: "date" }),
    hypercoreSpotIndex: integer("hypercore_spot_index"),
    perpMarketId: text("perp_market_id"),
    volumeHype: doublePrecision("volume_hype").notNull().default(0),
    holdersCount: integer("holders_count").notNull().default(0),
    tradesCount: integer("trades_count").notNull().default(0),
    tgeBoost: boolean("tge_boost").notNull().default(false),
    paidWith: text("paid_with").$type<"x_money" | "hype" | "credits">(),
    paymentRef: text("payment_ref"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    graduatedAt: timestamp("graduated_at", { mode: "date" }),
    listedAt: timestamp("listed_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("launches_slug_idx").on(t.slug), uniqueIndex("launches_symbol_idx").on(t.symbol), index("launches_stage_idx").on(t.stage)],
);

export const trades = pgTable(
  "trades",
  {
    id: text("id").primaryKey(),
    launchId: text("launch_id")
      .notNull()
      .references(() => launches.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    traderName: text("trader_name"),
    traderWallet: text("trader_wallet"),
    side: text("side").$type<"buy" | "sell">().notNull(),
    hypeAmount: doublePrecision("hype_amount").notNull(),
    tokenAmount: doublePrecision("token_amount").notNull(),
    feeHype: doublePrecision("fee_hype").notNull().default(0),
    priceAfter: doublePrecision("price_after").notNull(),
    txHash: text("tx_hash").notNull(),
    blockNumber: bigintBlock("block_number").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("trades_launch_idx").on(t.launchId, t.createdAt)],
);

export const holders = pgTable(
  "holders",
  {
    id: text("id").primaryKey(),
    launchId: text("launch_id")
      .notNull()
      .references(() => launches.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    wallet: text("wallet").notNull(),
    amount: doublePrecision("amount").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("holders_unique_idx").on(t.launchId, t.userId), index("holders_amount_idx").on(t.launchId, t.amount)],
);

/** Every lifecycle step of a launch (create/graduate/bridge/list) as an audit trail. */
export const lifecycleEvents = pgTable(
  "lifecycle_events",
  {
    id: text("id").primaryKey(),
    launchId: text("launch_id")
      .notNull()
      .references(() => launches.id, { onDelete: "cascade" }),
    step: text("step").$type<"created" | "trading" | "frozen" | "graduating" | "graduated" | "perp_listed" | "aborted">().notNull(),
    label: text("label").notNull(),
    detail: text("detail"),
    txHash: text("tx_hash"),
    actorId: text("actor_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lifecycle_launch_idx").on(t.launchId, t.createdAt)],
);

/* ------------------------------------------------------------------ *
 * HyperCore spot book + HIP-3 perpetuals
 * ------------------------------------------------------------------ */

export const perpMarkets = pgTable(
  "perp_markets",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    launchId: text("launch_id").references(() => launches.id, { onDelete: "set null" }),
    venue: text("venue").notNull().default("forge-hip3"),
    indexPrice: doublePrecision("index_price").notNull(),
    markPrice: doublePrecision("mark_price").notNull(),
    anchorPrice: doublePrecision("anchor_price").notNull(),
    vol: doublePrecision("vol").notNull().default(0.0009),
    fundingHour: doublePrecision("funding_hour").notNull().default(0),
    openInterestUsd: doublePrecision("open_interest_usd").notNull().default(0),
    volume24hUsd: doublePrecision("volume_24h_usd").notNull().default(0),
    open24hPrice: doublePrecision("open24h_price"),
    high24hPrice: doublePrecision("high24h_price"),
    low24hPrice: doublePrecision("low24h_price"),
    priceTrail: text("price_trail"),
    maxLeverage: integer("max_leverage").notNull().default(20),
    makerFeeBps: doublePrecision("maker_fee_bps").notNull().default(1),
    takerFeeBps: doublePrecision("taker_fee_bps").notNull().default(4.5),
    tickSize: doublePrecision("tick_size").notNull().default(0.0001),
    lastTickAt: timestamp("last_tick_at", { mode: "date" }).notNull().defaultNow(),
    status: text("status").$type<"live" | "prelist" | "paused">().notNull().default("live"),
  },
  (t) => [uniqueIndex("perp_symbol_idx").on(t.symbol)],
);

export const perpPositions = pgTable(
  "perp_positions",
  {
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => perpMarkets.id, { onDelete: "cascade" }),
    marketSymbol: text("market_symbol").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    side: text("side").$type<"long" | "short">().notNull(),
    size: doublePrecision("size").notNull(),
    entryPrice: doublePrecision("entry_price").notNull(),
    leverage: integer("leverage").notNull().default(10),
    margin: doublePrecision("margin").notNull(),
    liqPrice: doublePrecision("liq_price").notNull(),
    fundingAccrued: doublePrecision("funding_accrued").notNull().default(0),
    lastFundingAt: timestamp("last_funding_at", { mode: "date" }).notNull().defaultNow(),
    realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
    tpPrice: doublePrecision("tp_price"),
    slPrice: doublePrecision("sl_price"),
    status: text("status").$type<"open" | "closed">().notNull().default("open"),
    openedAt: timestamp("opened_at", { mode: "date" }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { mode: "date" }),
  },
  (t) => [index("positions_user_idx").on(t.userId, t.status), index("positions_market_idx").on(t.marketId, t.status)],
);

export const perpOrders = pgTable(
  "perp_orders",
  {
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => perpMarkets.id, { onDelete: "cascade" }),
    marketSymbol: text("market_symbol").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    side: text("side").$type<"buy" | "sell">().notNull(),
    kind: text("kind").$type<"market" | "limit" | "stop" | "reduce_only" | "twap">().notNull().default("market"),
    size: doublePrecision("size").notNull(),
    limitPrice: doublePrecision("limit_price"),
    leverage: integer("leverage").notNull().default(10),
    postOnly: boolean("post_only").notNull().default(false),
    positionId: text("position_id"),
    status: text("status").$type<"resting" | "filled" | "canceled" | "triggered">().notNull().default("resting"),
    reservedUsd: doublePrecision("reserved_usd").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("orders_market_idx").on(t.marketId, t.status)],
);

export const perpFills = pgTable(
  "perp_fills",
  {
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => perpMarkets.id, { onDelete: "cascade" }),
    marketSymbol: text("market_symbol").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    traderName: text("trader_name"),
    action: text("action").$type<"open" | "close" | "liquidate" | "fund" | "place" | "cancel">().notNull(),
    side: text("side").$type<"long" | "short">().notNull(),
    size: doublePrecision("size").notNull(),
    price: doublePrecision("price").notNull(),
    feeUsd: doublePrecision("fee_usd").notNull().default(0),
    pnlUsd: doublePrecision("pnl_usd").notNull().default(0),
    leverage: integer("leverage").notNull().default(10),
    txHash: text("tx_hash").notNull(),
    blockNumber: bigintBlock("block_number").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("fills_market_idx").on(t.marketId, t.createdAt)],
);

/** HyperCore-style block counter — Elysium targets ~100ms canonical blocks. */
export const chainState = pgTable("chain_state", {
  id: text("id").primaryKey().default("head"),
  headBlock: bigintBlock("head_block").notNull().default(12_719_639),
  lastBlockAt: timestamp("last_block_at", { mode: "date" }).notNull().defaultNow(),
  hypeUsd: doublePrecision("hype_usd").notNull().default(28.4),
  stokeUsd: doublePrecision("stoke_usd").notNull().default(0.0412),
  totalFeesHype: doublePrecision("total_fees_hype").notNull().default(0),
  stokeBurned: doublePrecision("stoke_burned").notNull().default(0),
});

/* ------------------------------------------------------------------ *
 * STOKE token: staking, vesting, airdrop, points
 * ------------------------------------------------------------------ */

export const stakes = pgTable(
  "stakes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    principal: doublePrecision("principal").notNull(),
    apy: doublePrecision("apy").notNull(),
    rewards: doublePrecision("rewards").notNull().default(0),
    lastAccrualAt: timestamp("last_accrual_at", { mode: "date" }).notNull().defaultNow(),
    status: text("status").$type<"active" | "withdrawn">().notNull().default("active"),
    lockDays: integer("lock_days").notNull().default(0),
    unlockAt: timestamp("unlock_at", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("stakes_user_idx").on(t.userId, t.status)],
);

export const vestingSchedules = pgTable("vesting_schedules", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  total: doublePrecision("total").notNull(),
  tgePct: doublePrecision("tge_pct").notNull().default(20),
  months: integer("months").notNull().default(12),
  claimed: doublePrecision("claimed").notNull().default(0),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
});

export const airdropClaims = pgTable(
  "airdrop_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: text("tier").$type<"genesis" | "builder" | "trader" | "whale" | "og">().notNull(),
    amount: doublePrecision("amount").notNull(),
    wallet: text("wallet").notNull(),
    claimedAt: timestamp("claimed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("airdrop_unique_idx").on(t.userId, t.tier)],
);

export const pointEvents = pgTable(
  "point_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("points_user_idx").on(t.userId, t.createdAt)],
);

/* ------------------------------------------------------------------ *
 * Payments (X Money / HYPE) · faucet · notifications
 * ------------------------------------------------------------------ */

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    launchId: text("launch_id").references(() => launches.id, { onDelete: "set null" }),
    provider: text("provider").$type<"x_money" | "hype" | "credits">().notNull().default("x_money"),
    purpose: text("purpose").$type<"launch_fee" | "cashtag_listing" | "stake_topup" | "perp_margin">().notNull(),
    status: text("status").$type<"pending" | "succeeded" | "failed" | "expired">().notNull().default("pending"),
    amountUsd: doublePrecision("amount_usd").notNull(),
    amountHype: doublePrecision("amount_hype").notNull(),
    xHandle: text("x_handle"),
    cashtag: text("cashtag"),
    reference: text("reference").notNull(),
    verifyCode: text("verify_code"),
    consumedAt: timestamp("consumed_at", { mode: "date" }),
    live: boolean("live").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("payments_ref_idx").on(t.reference), index("payments_user_idx").on(t.userId, t.createdAt)],
);

export const faucetClaims = pgTable(
  "faucet_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wallet: text("wallet").notNull(),
    amountHype: doublePrecision("amount_hype").notNull(),
    amountUsdc: doublePrecision("amount_usdc").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("faucet_user_idx").on(t.userId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"graduation" | "fill" | "liquidation" | "payment" | "airdrop" | "system">().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.read, t.createdAt)],
);

/** small helper so bigint-ish block numbers stay numeric in JS */
function bigintBlock(name: string) {
  return integer(name);
}

export const mutationReceipts = pgTable("mutation_receipts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fingerprint: text("fingerprint").notNull(),
  response: jsonb("response").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("mutation_user_key_idx").on(t.userId, t.id)]);

export const authAttempts = pgTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { mode: "date" }).notNull(),
});
