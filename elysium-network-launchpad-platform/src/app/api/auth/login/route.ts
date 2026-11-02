import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();

    if (body.demo === true) {
      const demoRows = await db
        .select()
        .from(users)
        .where(eq(users.email, "whale@elysium.kinetiq.xyz"))
        .limit(1);

      if (!demoRows.length) {
        return NextResponse.json(
          { error: "Demo account not found" },
          { status: 404 }
        );
      }

      const demoUser = demoRows[0];
      await createSession(demoUser.id);
      const { passwordHash: _omitted, ...safeUser } = demoUser;
      void _omitted;
      return NextResponse.json({ user: safeUser });
    }

    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!rows.length || !verifyPassword(password, rows[0].passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = rows[0];
    await createSession(user.id);
    const { passwordHash: _omitted, ...safeUser } = user;
    void _omitted;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
