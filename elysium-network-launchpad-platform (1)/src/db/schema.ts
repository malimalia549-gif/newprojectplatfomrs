import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  walletAddress: text("wallet_address").notNull(),
  xHandle: text("x_handle").notNull().default("@elysium_builder"),
  xMoneyConnected: boolean("x_money_connected").notNull().default(true),
  xMoneyBalanceUsd: doublePrecision("x_money_balance_usd").notNull().default(25000),
  hypeBalance: doublePrecision("hype_balance").notNull().default(2500),
  usdcBalance: doublePrecision("usdc_balance").notNull().default(50000),
  khypeBalance: doublePrecision("khype_balance").notNull().default(500),
  networkMode: text("network_mode").notNull().default("testnet"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => users.id),
  name: text("name").notNull(),
  ticker: text("ticker").notNull(),
  category: text("category").notNull().default("CRYPTO"),
  description: text("description").notNull(),
  logoColor: text("logo_color").notNull().default("#10b981"),
  contractAddress: text("contract_address").notNull(),
  hyperEvmMirrorAddress: text("hyperevm_mirror_address"),
  depositWalletAddress: text("deposit_wallet_address"),
  uniswapPoolAddress: text("uniswap_pool_address"),
  hyperCoreSpotId: text("hypercore_spot_id"),
  hip3PerpSymbol: text("hip3_perp_symbol"),
  stage: text("stage").notNull().default("BONDING"),
  targetPath: text("target_path").notNull().default("FULL_HIP3_PIPELINE"),
  priceUsd: doublePrecision("price_usd").notNull(),
  priceHype: doublePrecision("price_hype").notNull(),
  change24h: doublePrecision("change_24h").notNull().default(0),
  marketCapUsd: doublePrecision("market_cap_usd").notNull(),
  volume24hUsd: doublePrecision("volume_24h_usd").notNull().default(0),
  virtualHypeReserves: doublePrecision("virtual_hype_reserves").notNull().default(120),
  virtualTokenReserves: doublePrecision("virtual_token_reserves")
    .notNull()
    .default(1000000000),
  realHypeRaised: doublePrecision("real_hype_raised").notNull().default(0),
  graduationTargetHype: doublePrecision("graduation_target_hype").notNull().default(500),
  bondingProgress: doublePrecision("bonding_progress").notNull().default(0),
  totalSupply: doublePrecision("total_supply").notNull().default(1000000000),
  holdersCount: integer("holders_count").notNull().default(1),
  isStockToken: boolean("is_stock_token").notNull().default(false),
  underlyingTicker: text("underlying_ticker"),
  underlyingExchange: text("underlying_exchange"),
  oracleProvider: text("oracle_provider"),
  backingRatio: doublePrecision("backing_ratio"),
  isinCode: text("isin_code"),
  maxLeverage: integer("max_leverage").notNull().default(25),
  fundingRateHourly: doublePrecision("funding_rate_hourly").notNull().default(0.0012),
  openInterestUsd: doublePrecision("open_interest_usd").notNull().default(0),
  hip3StakedHype: doublePrecision("hip3_staked_hype").notNull().default(500000),
  tickerAuctionCostHype: doublePrecision("ticker_auction_cost_hype"),
  launchPaymentMethod: text("launch_payment_method").notNull().default("HYPE"),
  xMoneyReceiptId: text("x_money_receipt_id"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenHoldings = pgTable("token_holdings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenId: integer("token_id")
    .notNull()
    .references(() => tokens.id, { onDelete: "cascade" }),
  balance: doublePrecision("balance").notNull().default(0),
  avgBuyPriceUsd: doublePrecision("avg_buy_price_usd").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const spotTrades = pgTable("spot_trades", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id")
    .notNull()
    .references(() => tokens.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  traderLabel: text("trader_label").notNull(),
  side: text("side").notNull(),
  venue: text("venue").notNull(),
  paymentMethod: text("payment_method").notNull().default("HYPE"),
  amountToken: doublePrecision("amount_token").notNull(),
  amountHype: doublePrecision("amount_hype").notNull(),
  amountUsd: doublePrecision("amount_usd").notNull(),
  priceUsd: doublePrecision("price_usd").notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const perpPositions = pgTable("perp_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenId: integer("token_id")
    .notNull()
    .references(() => tokens.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  marginMode: text("margin_mode").notNull().default("CROSS"),
  orderType: text("order_type").notNull().default("MARKET"),
  status: text("status").notNull().default("OPEN"),
  leverage: integer("leverage").notNull(),
  collateralUsd: doublePrecision("collateral_usd").notNull(),
  sizeUsd: doublePrecision("size_usd").notNull(),
  sizeUnits: doublePrecision("size_units").notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  limitPrice: doublePrecision("limit_price"),
  liquidationPrice: doublePrecision("liquidation_price").notNull(),
  takeProfitPrice: doublePrecision("take_profit_price"),
  stopLossPrice: doublePrecision("stop_loss_price"),
  realizedPnlUsd: doublePrecision("realized_pnl_usd").notNull().default(0),
  closePrice: doublePrecision("close_price"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const xMoneyPayments = pgTable("x_money_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  xHandle: text("x_handle").notNull(),
  paymentRail: text("payment_rail").notNull(),
  purpose: text("purpose").notNull(),
  amountUsd: doublePrecision("amount_usd").notNull(),
  convertedHype: doublePrecision("converted_hype").notNull(),
  cashbackUsd: doublePrecision("cashback_usd").notNull().default(0),
  receiptCode: text("receipt_code").notNull(),
  status: text("status").notNull().default("SETTLED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickerAuctions = pgTable("ticker_auctions", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id")
    .notNull()
    .references(() => tokens.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  ticker: text("ticker").notNull(),
  clearingPriceHype: doublePrecision("clearing_price_hype").notNull(),
  clearingPriceUsd: doublePrecision("clearing_price_usd").notNull(),
  paymentMethod: text("payment_method").notNull(),
  hyperCoreAssetId: text("hypercore_asset_id").notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
