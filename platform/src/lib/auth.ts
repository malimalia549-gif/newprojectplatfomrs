import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { sessionKey, type PublicUser } from "@/lib/identity";
export type { PublicUser } from "@/lib/identity";
const COOKIE = "forge_sid";
const WEEK = 1000 * 60 * 60 * 24 * 7;
export { hashPassword, verifyPassword, sessionKey, addressFor, fakeTx } from "@/lib/identity";

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ token: sessionKey(token), userId, userAgent: userAgent ?? null, expiresAt: new Date(Date.now() + WEEK) });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE === "none" ? "none" : "lax",
    partitioned: process.env.COOKIE_SAMESITE === "none",
    path: "/",
    // Only force `Secure` when explicitly opted in — the preview and testnet
    // deployments may terminate TLS at a proxy or serve plain HTTP.
    secure: process.env.COOKIE_SAMESITE === "none" || (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production"),
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}


export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, sessionKey(token)));
  jar.delete(COOKIE);
}

export function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    wallet: row.wallet,
    xHandle: row.xHandle,
    role: row.role,
    hype: row.hype,
    usdc: row.usdc,
    stoke: row.stoke,
    points: row.points,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select()
    .from(sessions)
    .where(and(gt(sessions.expiresAt, new Date()), eq(sessions.token, sessionKey(token))))
    .limit(1);
  const session = rows[0];
  if (!session) return null;
  const usersRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const u = usersRows[0];
  if (!u || u.banned) return null;
  return toPublicUser(u);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<PublicUser> {
  const user = await currentUser();
  if (!user) throw new ApiError("Connect an account to continue — sign in first.", 401);
  return user;
}
