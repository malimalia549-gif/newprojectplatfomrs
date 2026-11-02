import { NextResponse } from "next/server";
import { db } from "@/db";
import { perpPositions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const positionId = Number(id);
    const body = await request.json();

    const tp =
      body.takeProfitPrice === null || body.takeProfitPrice === ""
        ? null
        : Number(body.takeProfitPrice) > 0
        ? Number(body.takeProfitPrice)
        : null;
    const sl =
      body.stopLossPrice === null || body.stopLossPrice === ""
        ? null
        : Number(body.stopLossPrice) > 0
        ? Number(body.stopLossPrice)
        : null;

    const [updated] = await db
      .update(perpPositions)
      .set({
        takeProfitPrice: tp,
        stopLossPrice: sl,
      })
      .where(
        and(eq(perpPositions.id, positionId), eq(perpPositions.userId, user.id))
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ position: updated });
  } catch (error) {
    console.error("Update TP/SL error:", error);
    return NextResponse.json(
      { error: "Failed to update TP/SL" },
      { status: 500 }
    );
  }
}
