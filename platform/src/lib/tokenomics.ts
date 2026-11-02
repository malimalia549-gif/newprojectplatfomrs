/** Client-safe STOKE constants (no DB imports) — shared by the UI and the server module. */

export const STOKE = {
  symbol: "STOKE",
  name: "Stoke Token",
  chain: "Elysium (testnet 99801 → mainnet)",
  totalSupply: 1_000_000_000,
  allocations: [
    { label: "Launch incentives & curve rewards", pct: 38, note: "Emitted to traders who absorb early curves" },
    { label: "Staker emissions", pct: 24, note: "Paid hourly from the rewards pool" },
    { label: "Community & X creators", pct: 12, note: "Cashtag partners, account-tokenization pilots" },
    { label: "Treasury (4y vest)", pct: 14, note: "Sequencer-fee backed, governance gated" },
    { label: "Core contributors (1y cliff, 4y)", pct: 12, note: "Linear unlock after cliff" },
  ],
  baseApy: 14,
  maxApy: 46,
} as const;

export const TIERS = [
  { tier: "og", label: "OG Builder", min: 6000, amount: 12_000, perks: "12,000 STOKE sandbox claim; production privileges not enabled" },
  { tier: "whale", label: "Curve Whale", min: 3000, amount: 6_500, perks: "6,500 STOKE sandbox claim; no live TGE privileges" },
  { tier: "builder", label: "Deployer", min: 1200, amount: 2_400, perks: "2,400 STOKE sandbox claim; standard product fees apply" },
  { tier: "trader", label: "Trader", min: 300, amount: 600, perks: "600 STOKE claim and 250 STOKE per eligible faucet drip" },
  { tier: "genesis", label: "Genesis", min: 0, amount: 150, perks: "Permanent profile badge" },
] as const;

export type TierKey = (typeof TIERS)[number]["tier"];

export function tierFor(points: number) {
  return TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1];
}

export function apyFor(totalStaked: number) {
  const utilization = Math.min(1, totalStaked / 260_000_000);
  return Math.max(6, STOKE.baseApy * (1 - utilization * 0.55) + 4);
}

export const POINTS = {
  launch: 500,
  graduateCall: 150,
  perpDeploy: 400,
  perHypeTraded: 120,
  perUsdPerp: 12,
  faucetClaim: 25,
} as const;
