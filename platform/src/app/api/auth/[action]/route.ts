import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pointEvents, users } from "@/db/schema";
import { ApiError, addressFor, createSession, currentUser, destroySession, hashPassword, toPublicUser, verifyPassword } from "@/lib/auth";
import { body, positive, route, str, throttleAuth } from "@/lib/api";
import { notify } from "@/lib/forge";

const WELCOME = { hype: 25, usdc: 5000, stoke: 2500, points: 120 };

export const GET = route(async () => {
  const user = await currentUser();
  return Response.json({ user });
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ action: string }> }) => {
  const { action: segment } = await ctx.params;
  const url = new URL(req.url);
  const action = segment ?? url.searchParams.get("action") ?? "login";
  const input = await body(req);

  if (action === "register") {
    const email = str(input.email).toLowerCase().trim();
    const name = str(input.name).trim();
    const password = str(input.password);
    await throttleAuth(req, email);
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) throw new ApiError("Enter a valid email address.");
    if (name.length < 2 || name.length > 24) throw new ApiError("Display name must be 2–24 characters.");
    if (password.length < 8 || password.length > 128) throw new ApiError("Password must be at least 8 characters.");
    const clash = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (clash[0]) throw new ApiError("That email is already registered — sign in instead.", 409);

    const id = `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await db.insert(users).values({
      id,
      email,
      name,
      passwordHash: hashPassword(password),
      wallet: addressFor(`${email}:${id}`),
      xHandle: input.xHandle ? String(input.xHandle).replace(/^@/, "").toLowerCase() : null,
      role: "creator",
      hype: WELCOME.hype,
      usdc: WELCOME.usdc,
      stoke: WELCOME.stoke,
      points: WELCOME.points,
    });
    await db.insert(pointEvents).values({ id: `pt_${id}`, userId: id, delta: WELCOME.points, reason: "welcome — testnet season 1" });
    await notify(id, "system", "Testnet balance credited", `${WELCOME.hype} HYPE · ${WELCOME.usdc} USDC · ${WELCOME.stoke} STOKE delivered to your Elysium account.`, "/dashboard");
    await createSession(id, req.headers.get("user-agent"));
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return Response.json({ user: toPublicUser(rows[0]!), created: true });
  }

  if (action === "login") {
    const email = str(input.email).toLowerCase().trim();
    const password = str(input.password);
    await throttleAuth(req, email);
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const found = rows[0];
    if (!found || !verifyPassword(password, found.passwordHash)) throw new ApiError("Email or password is incorrect.", 401);
    await createSession(found.id, req.headers.get("user-agent"));
    return Response.json({ user: toPublicUser(found) });
  }

  if (action === "demo") {
    const rows = await db.select().from(users).where(eq(users.email, "demo@forge.xyz")).limit(1);
    const found = rows[0];
    if (!found) throw new ApiError("Demo account is not provisioned yet — refresh in a second.", 503);
    await createSession(found.id, req.headers.get("user-agent"));
    return Response.json({ user: toPublicUser(found) });
  }

  if (action === "logout") {
    await destroySession();
    return Response.json({ ok: true });
  }

  if (action === "profile") {
    const user = await currentUser();
    if (!user) throw new ApiError("Sign in first.", 401);
    const patch: Record<string, unknown> = {};
    if (input.name) patch.name = str(input.name).slice(0, 24);
    if (input.xHandle !== undefined) patch.xHandle = input.xHandle ? String(input.xHandle).replace(/^@/, "").toLowerCase().slice(0, 15) : null;
    if (Object.keys(patch).length === 0) throw new ApiError("Nothing to update.");
    await db.update(users).set(patch).where(eq(users.id, user.id));
    const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return Response.json({ user: toPublicUser(rows[0]!) });
  }

  if (action === "convert") {
    const user = await currentUser();
    if (!user) throw new ApiError("Sign in first.", 401);
    const from = str(input.from, "hype");
    const amount = positive(input.amount);
    const h = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = h[0]!;
    if (from !== "hype" && from !== "usdc") throw new ApiError("Unknown conversion asset.");
    if (from === "hype") {
      if (amount > row.hype) throw new ApiError("Not enough HYPE.", 402);
      const { head } = await import("@/lib/chain");
      const usdc = amount * (await head()).hypeUsd;
      await db.update(users).set({ hype: row.hype - amount, usdc: row.usdc + usdc }).where(eq(users.id, user.id));
      return Response.json({ user: toPublicUser({ ...row, hype: row.hype - amount, usdc: row.usdc + usdc }), usdc });
    }
    if (amount > row.usdc) throw new ApiError("Not enough USDC.", 402);
    const { head } = await import("@/lib/chain");
      const hype = amount / (await head()).hypeUsd;
    await db.update(users).set({ usdc: row.usdc - amount, hype: row.hype + hype }).where(eq(users.id, user.id));
    return Response.json({ user: toPublicUser({ ...row, usdc: row.usdc - amount, hype: row.hype + hype }), hype });
  }

  throw new ApiError(`Unknown auth action: ${action}`, 404);
});
