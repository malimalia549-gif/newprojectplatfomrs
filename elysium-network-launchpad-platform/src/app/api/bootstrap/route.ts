import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tokens,
  spotTrades,
  tickerAuctions,
  tokenHoldings,
  perpPositions,
  xMoneyPayments,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { getCurrentUser } from "@/lib/auth";
import { HIP1_CURRENT_AUCTION_HYPE, HYPE_PRICE_USD } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const user = await getCurrentUser();

    const [allTokens, recentTrades, recentAuctions] = await Promise.all([
      db.select().from(tokens).orderBy(desc(tokens.volume24hUsd), desc(tokens.id)),
      db.select().from(spotTrades).orderBy(desc(spotTrades.id)).limit(35),
      db.select().from(tickerAuctions).orderBy(desc(tickerAuctions.id)).limit(15),
    ]);

    let holdings: (typeof tokenHoldings.$inferSelect)[] = [];
    let positions: (typeof perpPositions.$inferSelect)[] = [];
    let xReceipts: (typeof xMoneyPayments.$inferSelect)[] = [];

    if (user) {
      [holdings, positions, xReceipts] = await Promise.all([
        db
          .select()
          .from(tokenHoldings)
          .where(eq(tokenHoldings.userId, user.id)),
        db
          .select()
          .from(perpPositions)
          .where(eq(perpPositions.userId, user.id))
          .orderBy(desc(perpPositions.id)),
        db
          .select()
          .from(xMoneyPayments)
          .where(eq(xMoneyPayments.userId, user.id))
          .orderBy(desc(xMoneyPayments.id))
          .limit(20),
      ]);
    }

    // Dynamic Dutch auction decay calculation based on current minute
    const minuteCycle = (Date.now() / 60000) % 60;
    const liveAuctionHype = Number(
      Math.max(28.5, HIP1_CURRENT_AUCTION_HYPE - minuteCycle * 0.18).toFixed(2)
    );

    return NextResponse.json({
      user,
      tokens: allTokens,
      recentTrades,
      tickerAuctions: recentAuctions,
      holdings,
      perpPositions: positions,
      xMoneyReceipts: xReceipts,
      hypePriceUsd: HYPE_PRICE_USD,
      hip1CurrentAuctionHype: liveAuctionHype,
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json(
      { error: "Failed to load platform state" },
      { status: 500 }
    );
  }
}
