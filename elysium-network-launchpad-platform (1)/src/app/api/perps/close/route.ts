import { NextResponse } from "next/server";
import { db } from "@/db";
import { perpPositions, tokens, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const positionId = Number(body.positionId);
    if (!positionId) {
      return NextResponse.json(
        { error: "Invalid position ID" },
        { status: 400 }
      );
    }

    const posRows = await db
      .select()
      .from(perpPositions)
      .where(
        and(eq(perpPositions.id, positionId), eq(perpPositions.userId, user.id))
      )
      .limit(1);

    if (!posRows.length) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    const position = posRows[0];
    if (position.status === "CLOSED") {
      return NextResponse.json(
        { error: "Position is already closed" },
        { status: 400 }
      );
    }

    const tokenRows = await db
      .select()
      .from(tokens)
      .where(eq(tokens.id, position.tokenId))
      .limit(1);

    const token = tokenRows[0];
    const closePrice =
      Number(body.clientMarkPrice) > 0
        ? Number(body.clientMarkPrice)
        : token
        ? token.priceUsd
        : position.entryPrice;

    let realizedPnl = 0;
    let payoutUsd = position.collateralUsd;

    if (position.status === "OPEN") {
      const priceDiff =
        position.side === "LONG"
          ? closePrice - position.entryPrice
          : position.entryPrice - closePrice;
      realizedPnl = Number((priceDiff * position.sizeUnits).toFixed(2));
      const closeFee = Number((position.sizeUsd * 0.00025).toFixed(2));
      realizedPnl = Number((realizedPnl - closeFee).toFixed(2));
      payoutUsd = Math.max(
        0,
        Number((position.collateralUsd + realizedPnl).toFixed(2))
      );
    }

    await db
      .update(users)
      .set({
        usdcBalance: Number((user.usdcBalance + payoutUsd).toFixed(2)),
      })
      .where(eq(users.id, user.id));

    const [closedPosition] = await db
      .update(perpPositions)
      .set({
        status: "CLOSED",
        realizedPnlUsd: realizedPnl,
        closePrice: Number(closePrice.toFixed(5)),
        closedAt: new Date(),
      })
      .where(eq(perpPositions.id, position.id))
      .returning();

    if (token && position.status === "OPEN") {
      await db
        .update(tokens)
        .set({
          openInterestUsd: Math.max(
            0,
            Number((token.openInterestUsd - position.sizeUsd).toFixed(2))
          ),
        })
        .where(eq(tokens.id, token.id));
    }

    return NextResponse.json({
      position: closedPosition,
      payoutUsd,
      realizedPnl,
    });
  } catch (error) {
    console.error("Close HIP-3 position error:", error);
    return NextResponse.json(
      { error: "Failed to close position" },
      { status: 500 }
    );
  }
}
