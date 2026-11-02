CREATE TABLE "airdrop_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier" text NOT NULL,
	"amount" double precision NOT NULL,
	"wallet" text NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_state" (
	"id" text PRIMARY KEY DEFAULT 'head' NOT NULL,
	"head_block" integer DEFAULT 12719639 NOT NULL,
	"last_block_at" timestamp DEFAULT now() NOT NULL,
	"hype_usd" double precision DEFAULT 28.4 NOT NULL,
	"stoke_usd" double precision DEFAULT 0.0412 NOT NULL,
	"total_fees_hype" double precision DEFAULT 0 NOT NULL,
	"stoke_burned" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faucet_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet" text NOT NULL,
	"amount_hype" double precision NOT NULL,
	"amount_usdc" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holders" (
	"id" text PRIMARY KEY NOT NULL,
	"launch_id" text NOT NULL,
	"user_id" text,
	"wallet" text NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launches" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"creator_id" text,
	"creator_name" text,
	"accent" text DEFAULT '#7ce0ff' NOT NULL,
	"glyph" text DEFAULT '◆' NOT NULL,
	"category" text DEFAULT 'meme' NOT NULL,
	"x_handle" text,
	"cashtag" text,
	"total_supply" double precision DEFAULT 1000000000 NOT NULL,
	"sold_tokens" double precision DEFAULT 0 NOT NULL,
	"raised_hype" double precision DEFAULT 0 NOT NULL,
	"treasury_hype" double precision DEFAULT 0 NOT NULL,
	"creator_hype" double precision DEFAULT 0 NOT NULL,
	"graduation_hype" double precision DEFAULT 12 NOT NULL,
	"ticker_reserve" double precision DEFAULT 0.5 NOT NULL,
	"fee_bps" integer DEFAULT 100 NOT NULL,
	"stage" text DEFAULT 'created' NOT NULL,
	"ticket" text DEFAULT 'none' NOT NULL,
	"token_address" text,
	"pool_address" text,
	"pool_kind" text DEFAULT 'uniswap_v3' NOT NULL,
	"pool_liquidity_hype" double precision DEFAULT 0 NOT NULL,
	"pool_tokens" double precision DEFAULT 0 NOT NULL,
	"lp_locked_until" timestamp,
	"hypercore_spot_index" integer,
	"perp_market_id" text,
	"volume_hype" double precision DEFAULT 0 NOT NULL,
	"holders_count" integer DEFAULT 0 NOT NULL,
	"trades_count" integer DEFAULT 0 NOT NULL,
	"tge_boost" boolean DEFAULT false NOT NULL,
	"paid_with" text,
	"payment_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"graduated_at" timestamp,
	"listed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lifecycle_events" (
	"id" text PRIMARY KEY NOT NULL,
	"launch_id" text NOT NULL,
	"step" text NOT NULL,
	"label" text NOT NULL,
	"detail" text,
	"tx_hash" text,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutation_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"launch_id" text,
	"provider" text DEFAULT 'x_money' NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_usd" double precision NOT NULL,
	"amount_hype" double precision NOT NULL,
	"x_handle" text,
	"reference" text NOT NULL,
	"verify_code" text,
	"consumed_at" timestamp,
	"live" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "perp_fills" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"market_symbol" text NOT NULL,
	"user_id" text,
	"trader_name" text,
	"action" text NOT NULL,
	"side" text NOT NULL,
	"size" double precision NOT NULL,
	"price" double precision NOT NULL,
	"fee_usd" double precision DEFAULT 0 NOT NULL,
	"pnl_usd" double precision DEFAULT 0 NOT NULL,
	"leverage" integer DEFAULT 10 NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perp_markets" (
	"id" text PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"launch_id" text,
	"venue" text DEFAULT 'forge-hip3' NOT NULL,
	"index_price" double precision NOT NULL,
	"mark_price" double precision NOT NULL,
	"anchor_price" double precision NOT NULL,
	"vol" double precision DEFAULT 0.0009 NOT NULL,
	"funding_hour" double precision DEFAULT 0 NOT NULL,
	"open_interest_usd" double precision DEFAULT 0 NOT NULL,
	"volume_24h_usd" double precision DEFAULT 0 NOT NULL,
	"open24h_price" double precision,
	"high24h_price" double precision,
	"low24h_price" double precision,
	"price_trail" text,
	"max_leverage" integer DEFAULT 20 NOT NULL,
	"maker_fee_bps" double precision DEFAULT 1 NOT NULL,
	"taker_fee_bps" double precision DEFAULT 4.5 NOT NULL,
	"tick_size" double precision DEFAULT 0.0001 NOT NULL,
	"last_tick_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perp_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"market_symbol" text NOT NULL,
	"user_id" text NOT NULL,
	"side" text NOT NULL,
	"kind" text DEFAULT 'market' NOT NULL,
	"size" double precision NOT NULL,
	"limit_price" double precision,
	"leverage" integer DEFAULT 10 NOT NULL,
	"post_only" boolean DEFAULT false NOT NULL,
	"position_id" text,
	"status" text DEFAULT 'resting' NOT NULL,
	"reserved_usd" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perp_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"market_symbol" text NOT NULL,
	"user_id" text NOT NULL,
	"side" text NOT NULL,
	"size" double precision NOT NULL,
	"entry_price" double precision NOT NULL,
	"leverage" integer DEFAULT 10 NOT NULL,
	"margin" double precision NOT NULL,
	"liq_price" double precision NOT NULL,
	"funding_accrued" double precision DEFAULT 0 NOT NULL,
	"last_funding_at" timestamp DEFAULT now() NOT NULL,
	"realized_pnl" double precision DEFAULT 0 NOT NULL,
	"tp_price" double precision,
	"sl_price" double precision,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"principal" double precision NOT NULL,
	"apy" double precision NOT NULL,
	"rewards" double precision DEFAULT 0 NOT NULL,
	"last_accrual_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"lock_days" integer DEFAULT 0 NOT NULL,
	"unlock_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" text PRIMARY KEY NOT NULL,
	"launch_id" text NOT NULL,
	"user_id" text,
	"trader_name" text,
	"trader_wallet" text,
	"side" text NOT NULL,
	"hype_amount" double precision NOT NULL,
	"token_amount" double precision NOT NULL,
	"fee_hype" double precision DEFAULT 0 NOT NULL,
	"price_after" double precision NOT NULL,
	"tx_hash" text NOT NULL,
	"block_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"wallet" text NOT NULL,
	"x_handle" text,
	"avatar_seed" text DEFAULT 'ice' NOT NULL,
	"role" text DEFAULT 'trader' NOT NULL,
	"hype" double precision DEFAULT 0 NOT NULL,
	"usdc" double precision DEFAULT 0 NOT NULL,
	"stoke" double precision DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vesting_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"total" double precision NOT NULL,
	"tge_pct" double precision DEFAULT 20 NOT NULL,
	"months" integer DEFAULT 12 NOT NULL,
	"claimed" double precision DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "airdrop_claims" ADD CONSTRAINT "airdrop_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faucet_claims" ADD CONSTRAINT "faucet_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holders" ADD CONSTRAINT "holders_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holders" ADD CONSTRAINT "holders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launches" ADD CONSTRAINT "launches_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_receipts" ADD CONSTRAINT "mutation_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_fills" ADD CONSTRAINT "perp_fills_market_id_perp_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."perp_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_fills" ADD CONSTRAINT "perp_fills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_markets" ADD CONSTRAINT "perp_markets_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_orders" ADD CONSTRAINT "perp_orders_market_id_perp_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."perp_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_orders" ADD CONSTRAINT "perp_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_positions" ADD CONSTRAINT "perp_positions_market_id_perp_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."perp_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perp_positions" ADD CONSTRAINT "perp_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakes" ADD CONSTRAINT "stakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_launch_id_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."launches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vesting_schedules" ADD CONSTRAINT "vesting_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "airdrop_unique_idx" ON "airdrop_claims" USING btree ("user_id","tier");--> statement-breakpoint
CREATE INDEX "faucet_user_idx" ON "faucet_claims" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "holders_unique_idx" ON "holders" USING btree ("launch_id","user_id");--> statement-breakpoint
CREATE INDEX "holders_amount_idx" ON "holders" USING btree ("launch_id","amount");--> statement-breakpoint
CREATE UNIQUE INDEX "launches_slug_idx" ON "launches" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "launches_symbol_idx" ON "launches" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "launches_stage_idx" ON "launches" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "lifecycle_launch_idx" ON "lifecycle_events" USING btree ("launch_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mutation_user_key_idx" ON "mutation_receipts" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "notif_user_idx" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_ref_idx" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "fills_market_idx" ON "perp_fills" USING btree ("market_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "perp_symbol_idx" ON "perp_markets" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "orders_market_idx" ON "perp_orders" USING btree ("market_id","status");--> statement-breakpoint
CREATE INDEX "positions_user_idx" ON "perp_positions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "positions_market_idx" ON "perp_positions" USING btree ("market_id","status");--> statement-breakpoint
CREATE INDEX "points_user_idx" ON "point_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stakes_user_idx" ON "stakes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "trades_launch_idx" ON "trades" USING btree ("launch_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");