// Indicative sandbox values; do not treat these as live market data.
export const HYPE_PRICE_USD = 78.5;

export const ELYSIUM_NETWORK_CONFIG = {
  testnet: {
    name: "Elysium Testnet",
    badge: "TESTNET CONFIGURATION",
    chainId: 99801,
    chainIdHex: "0x185d9",
    rpcUrl: "https://testnet-rpc.elysium.kinetiq.xyz",
    explorerUrl: "https://elysium.kinetiq.xyz/testnet-explorer",
    parentChain: "HyperEVM testnet (998)",
    stack: "Arbitrum Orbit / Nitro",
    blockTimeMs: 128,
    finalityMs: 300,
    throughputTarget: "300 Mgas/s target",
    gasToken: "HYPE",
    daLayer: "AnyTrust with fallback",
    sequencer: "Priority fee ordering",
    hyperCoreCadenceMs: 70,
  },
  mainnet_preview: {
    name: "Mainnet Preparation",
    badge: "CONFIGURATION PREVIEW",
    chainId: "Not published",
    chainIdHex: "Not published",
    rpcUrl: "Not published",
    explorerUrl: "Not published",
    parentChain: "HyperEVM mainnet (999)",
    stack: "Arbitrum Orbit / Nitro",
    blockTimeMs: 100,
    finalityMs: 300,
    throughputTarget: "300 Mgas/s target",
    gasToken: "HYPE",
    daLayer: "AnyTrust with fallback",
    sequencer: "Priority fee ordering",
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
  { step: number; label: string; shortLabel: string; venue: string; badgeClass: string; description: string }
> = {
  BONDING: {
    step: 1,
    label: "Bonding curve trading",
    shortLabel: "Bonding curve",
    venue: "Elysium launch sandbox",
    badgeClass: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    description: "The asset is trading on the sandbox bonding curve. It can complete when its HYPE target is reached.",
  },
  GRADUATED_UNISWAP: {
    step: 2,
    label: "Pool graduation complete",
    shortLabel: "Pool complete",
    venue: "Uniswap V3 pool preview",
    badgeClass: "border-violet-300/20 bg-violet-300/10 text-violet-200",
    description: "The pool stage is complete. AMM-only assets finish here; other assets can proceed to a ticker acquisition preview.",
  },
  TICKER_ACQUIRED: {
    step: 3,
    label: "Ticker acquired",
    shortLabel: "Ticker acquired",
    venue: "HIP-1 auction preview",
    badgeClass: "border-sky-300/20 bg-sky-300/10 text-sky-200",
    description: "Ticker acquisition has been recorded in the sandbox. HyperCore spot linkage is the next stage.",
  },
  HYPERCORE_SPOT: {
    step: 4,
    label: "HyperCore spot market",
    shortLabel: "Spot market",
    venue: "HyperCore orderbook preview",
    badgeClass: "border-sky-300/20 bg-sky-300/10 text-sky-200",
    description: "Spot market state is available in the sandbox. A perpetual market can be activated next.",
  },
  HIP3_PERP_LIVE: {
    step: 5,
    label: "HIP-3 perpetual market",
    shortLabel: "Perpetuals",
    venue: "HIP-3 trading sandbox",
    badgeClass: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    description: "Long and short orders can be practiced in the HIP-3 perpetual trading simulator.",
  },
};

export const HIP1_CURRENT_AUCTION_HYPE = 42.5;
export const TOKEN_CREATE_FEE_HYPE = 1.5;
