import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { ApiError, currentUser, requireUser } from "@/lib/auth";
import { body, positive, route, str } from "@/lib/api";
import { createCheckout, consumeCheckout, handleFrom } from "@/lib/xmoney";
import { notify } from "@/lib/forge";

export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const user = await currentUser();
  const rows = user ? await db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(12) : [];
  return Response.json({ live: false, mode: "sandbox", recent: rows.map((p) => ({ id: p.id, purpose: p.purpose, amountUsd: p.amountUsd, status: p.status, reference: p.reference, live: false, createdAt: p.createdAt.toISOString() })) });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await body(req);
  const action = str(input.action, "checkout");
  if (action === "connect") {
    const handle = handleFrom(str(input.handle));
    await db.update(users).set({ xHandle: handle }).where(eq(users.id, user.id));
    return Response.json({ ok: true, handle, mode: "sandbox", verified: false });
  }
  if (action === "checkout") {
    const handle = handleFrom(str(input.handle, user.xHandle ?? "forge_xyz"));
    const purpose = str(input.purpose, "stake_topup");
    if (!["stake_topup", "perp_margin"].includes(purpose)) throw new ApiError("Use the launch or cashtag checkout for this product.");
    const amountUsd = positive(input.usd, "Sandbox top-up", 10000);
    const asset = purpose === "perp_margin" ? "USDC" : "HYPE";
    const { head } = await import("@/lib/chain");
    const h = await head();
    return Response.json(await createCheckout({ userId: user.id, handle, amountUsd, amountHype: asset === "HYPE" ? amountUsd / h.hypeUsd : 0, purpose: purpose as "stake_topup" | "perp_margin" }));
  }
  if (action === "confirm") {
    const reference = str(input.reference);
    const [intent] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
    if (!intent || intent.userId !== user.id) throw new ApiError("Payment intent not found.", 404);
    if (!["stake_topup", "perp_margin"].includes(intent.purpose)) throw new ApiError("This receipt is a product payment, not a top-up.");
    const row = await consumeCheckout(reference, str(input.code), user.id, intent.purpose);
    const usdc = intent.purpose === "perp_margin" ? row.amountUsd : 0;
    const hype = intent.purpose === "stake_topup" ? row.amountHype : 0;
    await db.update(users).set({ hype: sql`${users.hype} + ${hype}`, usdc: sql`${users.usdc} + ${usdc}` }).where(eq(users.id, user.id));
    await notify(user.id, "payment", "Sandbox top-up completed", `Simulated credit: ${hype || usdc} ${hype ? "HYPE" : "USDC"}. No real funds transferred.`, "/dashboard");
    return Response.json({ ok: true, creditedHype: hype, creditedUsdc: usdc, reference, live: false });
  }
  throw new ApiError("Unknown payment action.", 404);
});
import { sql } from "drizzle-orm";
