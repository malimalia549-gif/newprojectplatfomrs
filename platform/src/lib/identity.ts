import type { users } from "@/db/schema";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  if (password.length < 8 || password.length > 128) throw new Error("Password must contain 8–128 characters.");
  const derived = scryptSync(password, salt, 64, SCRYPT).toString("hex");
  return `scrypt2$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, digest] = stored.split("$");
  if (password.length > 128 || !["scrypt", "scrypt2"].includes(scheme) || !salt || !/^[a-f0-9]{16,64}$/.test(salt) || !/^[a-f0-9]+$/.test(digest)) return false;
  const derived = scheme === "scrypt2" ? scryptSync(password, salt, 64, SCRYPT) : scryptSync(password, salt, 32);
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


export const sessionKey = (token: string) => createHash("sha256").update(token).digest("hex");

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
