import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const COOKIE = "forge_sid";
const WEEK = 1000 * 60 * 60 * 24 * 7;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  wallet: string;
  xHandle: string | null;
  role: "trader" | "creator" | "keeper" | "admin";
  hype: number;
  usdc: number;
  stoke: number;
  points: number;
  createdAt: string;
};

export function hashPassword(password: string, salt = randomBytes(8).toString("hex")) {
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Deterministic EVM-style address so every account has a HyperCore/HyperEVM handle. */
export function addressFor(seed: string) {
  return `0x${createHash("sha256").update(seed).digest("hex").slice(0, 40)}`;
}

export function fakeTx(seed: string) {
  return `0x${createHash("sha256").update(`${seed}:${Date.now()}:${Math.random()}`).digest("hex")}`;
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(24).toString("base64url");
  await db.insert(sessions).values({ token, userId, userAgent: userAgent ?? null, expiresAt: new Date(Date.now() + WEEK) });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Only force `Secure` when explicitly opted in — the preview and testnet
    // deployments may terminate TLS at a proxy or serve plain HTTP.
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
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
    .where(and(gt(sessions.expiresAt, new Date()), eq(sessions.token, token)))
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
