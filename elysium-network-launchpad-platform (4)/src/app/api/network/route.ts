import { route } from "@/lib/api";
import { head } from "@/lib/chain";
import { globalTape, marketViews } from "@/lib/perps";
import { ELYSIUM } from "@/lib/util";
import { platformStats } from "@/lib/forge";

export const dynamic = "force-dynamic";

/** GET /api/network → chain heartbeat used by the nav strip, hero and docs page. */
export const GET = route(async () => {
  const h = await head(1200);
  const [stats, markets, tape] = await Promise.all([platformStats(), marketViews(null), globalTape(14)]);
  return Response.json({
    network: {
      name: ELYSIUM.name,
      chainId: ELYSIUM.chainId,
      chainIdHex: ELYSIUM.chainIdHex,
      gasToken: ELYSIUM.gasToken,
      rpc: ELYSIUM.rpc,
      explorer: ELYSIUM.explorer,
      blockMs: stats.blockLatencyMs,
      headBlock: h.headBlock,
      arbOS: ELYSIUM.arbOS,
    },
    prices: { hypeUsd: h.hypeUsd, stokeUsd: h.stokeUsd },
    stats,
    markets: markets.map((m) => ({ id: m.id, symbol: m.symbol, markPrice: m.markPrice, change24h: m.change24h, fundingAnnual: m.fundingAnnual, oi: m.openInterestUsd })),
    tape,
  });
});
