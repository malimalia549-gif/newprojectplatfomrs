import type { LifecycleStage } from "@/lib/constants";

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  walletAddress: string;
  xHandle: string;
  xMoneyConnected: boolean;
  xMoneyBalanceUsd: number;
  hypeBalance: number;
  usdcBalance: number;
  khypeBalance: number;
  networkMode: string;
  createdAt: string;
}

export interface PlatformToken {
  id: number;
  creatorId: number | null;
  name: string;
  ticker: string;
  category: string;
  description: string;
  logoColor: string;
  contractAddress: string;
  hyperEvmMirrorAddress: string | null;
  depositWalletAddress: string | null;
  uniswapPoolAddress: string | null;
  hyperCoreSpotId: string | null;
  hip3PerpSymbol: string | null;
  stage: LifecycleStage;
  targetPath: "UNISWAP_ONLY" | "FULL_HIP3_PIPELINE" | string;
  priceUsd: number;
  priceHype: number;
  change24h: number;
  marketCapUsd: number;
  volume24hUsd: number;
  virtualHypeReserves: number;
  virtualTokenReserves: number;
  realHypeRaised: number;
  graduationTargetHype: number;
  bondingProgress: number;
  totalSupply: number;
  holdersCount: number;
  isStockToken: boolean;
  underlyingTicker: string | null;
  underlyingExchange: string | null;
  oracleProvider: string | null;
  backingRatio: number | null;
  isinCode: string | null;
  maxLeverage: number;
  fundingRateHourly: number;
  openInterestUsd: number;
  hip3StakedHype: number;
  tickerAuctionCostHype: number | null;
  launchPaymentMethod: string;
  xMoneyReceiptId: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
}

export interface SpotTradeRecord {
  id: number;
  tokenId: number;
  userId: number | null;
  traderLabel: string;
  side: "BUY" | "SELL" | string;
  venue: string;
  paymentMethod: string;
  amountToken: number;
  amountHype: number;
  amountUsd: number;
  priceUsd: number;
  txHash: string;
  createdAt: string;
}

export interface TickerAuctionRecord {
  id: number;
  tokenId: number;
  userId: number | null;
  ticker: string;
  clearingPriceHype: number;
  clearingPriceUsd: number;
  paymentMethod: string;
  hyperCoreAssetId: string;
  txHash: string;
  createdAt: string;
}

export interface TokenHoldingRecord {
  id: number;
  userId: number;
  tokenId: number;
  balance: number;
  avgBuyPriceUsd: number;
}

export interface PerpPositionRecord {
  id: number;
  userId: number;
  tokenId: number;
  symbol: string;
  side: "LONG" | "SHORT" | string;
  marginMode: "CROSS" | "ISOLATED" | string;
  orderType: "MARKET" | "LIMIT" | string;
  status: "OPEN" | "LIMIT_PENDING" | "CLOSED" | string;
  leverage: number;
  collateralUsd: number;
  sizeUsd: number;
  sizeUnits: number;
  entryPrice: number;
  limitPrice: number | null;
  liquidationPrice: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  realizedPnlUsd: number;
  closePrice: number | null;
  createdAt: string;
  closedAt: string | null;
}

export interface XMoneyReceiptRecord {
  id: number;
  userId: number;
  xHandle: string;
  paymentRail: string;
  purpose: string;
  amountUsd: number;
  convertedHype: number;
  cashbackUsd: number;
  receiptCode: string;
  status: string;
  createdAt: string;
}

export interface BootstrapPayload {
  user: UserProfile | null;
  tokens: PlatformToken[];
  recentTrades: SpotTradeRecord[];
  tickerAuctions: TickerAuctionRecord[];
  holdings: TokenHoldingRecord[];
  perpPositions: PerpPositionRecord[];
  xMoneyReceipts: XMoneyReceiptRecord[];
  hypePriceUsd: number;
  hip1CurrentAuctionHype: number;
}

export type ActiveTab =
  | "LAUNCHPAD"
  | "STOCK_TOKENS"
  | "LIFECYCLE_PIPELINE"
  | "HIP3_PERPS"
  | "CREATE_TOKEN"
  | "DOCS_ELYSIUM";
