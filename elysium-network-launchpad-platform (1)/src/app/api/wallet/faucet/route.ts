import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    const action = String(body.action || "FAUCET");

    if (action === "TOGGLE_NETWORK") {
      const nextMode =
        body.networkMode === "mainnet_preview" ? "mainnet_preview" : "testnet";
      const [updated] = await db
        .update(users)
        .set({ networkMode: nextMode })
        .where(eq(users.id, user.id))
        .returning();
      const { passwordHash: _omitted, ...safeUser } = updated;
      void _omitted;
      return NextResponse.json({ user: safeUser });
    }

    if (action === "X_MONEY_TOPUP") {
      const rawHandle = body.xHandle
        ? String(body.xHandle).trim()
        : user.xHandle;
      const cleanHandle = rawHandle.startsWith("@")
        ? rawHandle
        : `@${rawHandle}`;
      const addUsd = Number(body.amountUsd) > 0 ? Number(body.amountUsd) : 10000;

      const [updated] = await db
        .update(users)
        .set({
          xHandle: cleanHandle,
          xMoneyConnected: true,
          xMoneyBalanceUsd: Number((user.xMoneyBalanceUsd + addUsd).toFixed(2)),
        })
        .where(eq(users.id, user.id))
        .returning();

      const { passwordHash: _omitted, ...safeUser } = updated;
      void _omitted;
      return NextResponse.json({ user: safeUser });
    }

    // Default: Elysium Testnet Faucet claim
    const [updated] = await db
      .update(users)
      .set({
        hypeBalance: Number((user.hypeBalance + 1000).toFixed(4)),
        usdcBalance: Number((user.usdcBalance + 25000).toFixed(2)),
        khypeBalance: Number((user.khypeBalance + 200).toFixed(4)),
      })
      .where(eq(users.id, user.id))
      .returning();

    const { passwordHash: _omitted, ...safeUser } = updated;
    void _omitted;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Faucet error:", error);
    return NextResponse.json(
      { error: "Wallet operation failed" },
      { status: 500 }
    );
  }
}
