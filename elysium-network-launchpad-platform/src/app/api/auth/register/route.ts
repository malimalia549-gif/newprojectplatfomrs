import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  generateEvmAddress,
  hashPassword,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    let xHandle = String(body.xHandle || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    if (!username || username.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (!xHandle) {
      xHandle = `@${username.toLowerCase().replace(/[^a-z0-9_]/g, "") || "trader"}`;
    } else if (!xHandle.startsWith("@")) {
      xHandle = `@${xHandle}`;
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash: hashPassword(password),
        walletAddress: generateEvmAddress(),
        xHandle,
        xMoneyConnected: true,
        xMoneyBalanceUsd: 25000,
        hypeBalance: 2500,
        usdcBalance: 50000,
        khypeBalance: 500,
        networkMode: "testnet",
      })
      .returning();

    await createSession(created.id);

    const { passwordHash: _omitted, ...safeUser } = created;
    void _omitted;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
