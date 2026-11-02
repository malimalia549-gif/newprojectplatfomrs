/** Types shared by API routes (server) and React clients. */

export type LaunchStage = "created" | "trading" | "frozen" | "graduating" | "graduated" | "perp_listed";
export type TicketState = "none" | "open" | "dispatched" | "confirmed" | "aborted";

export type LaunchSummary = {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  description: string;
  glyph: string;
  accent: string;
  category: string;
  creatorName: string | null;
  xHandle: string | null;
  cashtag: string | null;
  stage: LaunchStage;
  ticket: TicketState;
  soldTokens: number;
  raisedHype: number;
  graduationHype: number;
  progressPct: number;
  priceHype: number;
  priceUsd: number;
  marketCapHype: number;
  marketCapUsd: number;
  holdersCount: number;
  tradesCount: number;
  volumeHype: number;
  change24h: number;
  perpMarketId: string | null;
  poolAddress: string | null;
  createdAt: string;
  graduatedAt: string | null;
  myBalance: number;
  myStakeHype: number;
};

export type TradeRow = {
  id: string;
  side: "buy" | "sell";
  traderName: string | null;
  traderWallet: string | null;
  hypeAmount: number;
  tokenAmount: number;
  priceAfter: number;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  mine: boolean;
};

export type HolderRow = { rank: number; wallet: string; name: string | null; amount: number; pct: number; isPool: boolean };

export type LaunchDetail = LaunchSummary & {
  tokenAddress: string | null;
  poolLiquidityHype: number;
  poolTokens: number;
  lpLockedUntil: string | null;
  hypercoreSpotIndex: number | null;
  perpSymbol: string | null;
  creatorHype: number;
  treasuryHype: number;
  tickerReserve: number;
  feeBps: number;
  tgeBoost: boolean;
  paidWith: string | null;
  paymentRef: string | null;
  listedAt: string | null;
  curve: Array<{ t: number; price: number; mcap: number }>;
  trades: TradeRow[];
  holders: HolderRow[];
  events: Array<{ id: string; step: string; label: string; detail: string | null; txHash: string | null; createdAt: string }>;
  nextAction: null | { action: string; label: string; hint: string; costHype: number };
};

export type PerpMarket = {
  id: string;
  symbol: string;
  venue: string;
  indexPrice: number;
  markPrice: number;
  change24h: number;
  fundingHour: number;
  fundingAnnual: number;
  openInterestUsd: number;
  volume24hUsd: number;
  maxLeverage: number;
  takerFeeBps: number;
  makerFeeBps: number;
  status: "live" | "prelist" | "paused";
  launchSlug: string | null;
  cashtag: string | null;
  high24h: number;
  low24h: number;
  trail: number[];
};

export type PerpPosition = {
  id: string;
  marketId: string;
  marketSymbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  leverage: number;
  margin: number;
  liqPrice: number;
  markPrice: number;
  unrealized: number;
  roe: number;
  fundingAccrued: number;
  tpPrice: number | null;
  slPrice: number | null;
  openedAt: string;
};

export type BookSide = { price: number; size: number; total: number };

export type BookSnapshot = { bids: BookSide[]; asks: BookSide[]; mid: number; spreadBps: number; imbalance: number };

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  wallet: string;
  xHandle: string | null;
  role: "trader" | "creator" | "keeper" | "admin";
  hype: number;
  usdc: number;
  stoke: number;
  points: number;
  createdAt: string;
};

export type StakeRow = {
  id: string;
  principal: number;
  apy: number;
  rewards: number;
  createdAt: string;
  status: "active" | "withdrawn";
  accrued: number;
};

export type PaymentRow = {
  id: string;
  provider: "x_money" | "hype" | "credits";
  purpose: string;
  status: "pending" | "succeeded" | "failed" | "expired";
  amountUsd: number;
  amountHype: number;
  xHandle: string | null;
  reference: string;
  live: boolean;
  createdAt: string;
};

export type ApiErrorBody = { error: string };
