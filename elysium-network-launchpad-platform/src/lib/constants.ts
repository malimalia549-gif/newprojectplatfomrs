export const HYPE_PRICE_USD = 78.5;

export const ELYSIUM_NETWORK_CONFIG = {
  testnet: {
    name: "Elysium Testnet",
    badge: "TESTNET LIVE",
    chainId: 99801,
    chainIdHex: "0x185d9",
    rpcUrl: "https://testnet-rpc.elysium.kinetiq.xyz",
    explorerUrl: "https://elysium.kinetiq.xyz/testnet-explorer",
    parentChain: "HyperEVM Testnet (Chain 998)",
    stack: "Arbitrum Orbit (Nitro / ArbOS 61 Elara)",
    blockTimeMs: 128,
    finalityMs: 300,
    throughputTarget: "300 Mgas/s",
    gasToken: "HYPE (1:1 Native msg.value)",
    daLayer: "AnyTrust Committee + HyperEVM Fallback",
    sequencer: "Conduit Neutral Priority-Fee",
    hyperCoreCadenceMs: 70,
  },
  mainnet_preview: {
    name: "Elysium Mainnet (Pre-Launch)",
    badge: "MAINNET STAGING",
    chainId: "TBA (Orbit → 999)",
    chainIdHex: "0x185da",
    rpcUrl: "https://rpc.elysium.kinetiq.xyz (Pre-Launch)",
    explorerUrl: "https://elysium.kinetiq.xyz/explorer",
    parentChain: "HyperEVM Mainnet (Chain 999)",
    stack: "Arbitrum Orbit + HyperCore Precompiles",
    blockTimeMs: 100,
    finalityMs: 280,
    throughputTarget: "300 Mgas/s (Load Validated)",
    gasToken: "HYPE (1:1 Native msg.value)",
    daLayer: "AnyTrust DAC + HyperEVM L1 Settlement",
    sequencer: "Conduit + ElysiumCoreWriter Fast-Lane",
    hyperCoreCadenceMs: 70,
  },
} as const;

export type LifecycleStage =
  | "BONDING"
  | "GRADUATED_UNISWAP"
  | "TICKER_ACQUIRED"
  | "HYPERCORE_SPOT"
  | "HIP3_PERP_LIVE";

export const LIFECYCLE_STAGES_META: Record<
  LifecycleStage,
  {
    step: number;
    label: string;
    shortLabel: string;
    venue: string;
    badgeClass: string;
    description: string;
  }
> = {
  BONDING: {
    step: 1,
    label: "1–2. Create & Bonding Curve Trading",
    shortLabel: "Bonding Curve",
    venue: "Elysium 100ms AMM",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description:
      "Trading on Elysium constant-product virtual bonding curve toward 100% HYPE reserve graduation.",
  },
  GRADUATED_UNISWAP: {
    step: 2,
    label: "3. Graduated → Uniswap V3 Pool",
    shortLabel: "Uniswap V3 Pool",
    venue: "Elysium UniV3 Concentrated LP",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    description:
      "Liquidity migrated & burned on Elysium Uniswap V3 (SELESAI for AMM-only, or ready for HIP-1 Beli Ticker).",
  },
  TICKER_ACQUIRED: {
    step: 3,
    label: "4a. Ticker Purchased (HIP-1 Auction)",
    shortLabel: "HIP-1 Ticker Won",
    venue: "Mirror Bridge → HyperEVM",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    description:
      "Ticker acquired via Hyperliquid HIP-1 Dutch Auction & linked to HyperEVM Mirror + Deposit Wallet.",
  },
  HYPERCORE_SPOT: {
    step: 4,
    label: "4b. HyperCore Spot Orderbook",
    shortLabel: "HyperCore Spot",
    venue: "HyperCore ~70ms CLOB",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    description:
      "Escrowed via Deposit Wallet with native 1:1 spot Central Limit Orderbook execution on HyperCore.",
  },
  HIP3_PERP_LIVE: {
    step: 5,
    label: "5. HIP-3 Perpetual Market Live",
    shortLabel: "HIP-3 Perp Live",
    venue: "HyperCore HIP-3 Perp CLOB",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description:
      "Builder-deployed perpetual backed by 500,000 HYPE vault with Long/Short leverage & ElysiumCoreWriter routing.",
  },
};

export const HIP1_CURRENT_AUCTION_HYPE = 42.5;
export const TOKEN_CREATE_FEE_HYPE = 1.5;
