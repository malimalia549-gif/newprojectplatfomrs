import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { launches, payments, users } from "@/db/schema";
import { ApiError, requireUser } from "@/lib/auth";
import { body, num, route, str } from "@/lib/api";
import { head } from "@/lib/chain";
import { createCheckout, handleFrom, hypeToUsd, xLive } from "@/lib/xmoney";
import { notify } from "@/lib/forge";

export const dynamic = "force-dynamic";

const rate = (h: Awaited<ReturnType<typeof head>>) => ({
  hypeUsd: h.hypeUsd,
  mode: xLive() ? ("live" as const) : ("sandbox" as const),
});

export const GET = route(async () => {
  const h = await head();
  const recent = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(12);
  return Response.json({
    ...rate(h),
    live: xLive(),
    recent: recent.map((p) => ({
      id: p.id,
      handle: p.xHandle,
      purpose: p.purpose,
      amountUsd: p.amountUsd,
      amountHype: p.amountHype,
      status: p.status,
      live: p.live,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

/** POST /api/x → { action: connect|checkout|confirm|fund } */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await body(req);
  const action = str(input.action, "checkout");
  const h = await head();

  if (action === "connect") {
    const handle = handleFrom(str(input.handle));
    await db.update(users).set({ xHandle: handle }).where(eq(users.id, user.id));
    await notify(user.id, "system", "X account linked", `@${handle} is now attached to this FORGE account and can receive X Money transfers.`, "/account");
    return Response.json({ ok: true, handle, mode: xLive() ? "live" : "sandbox" });
  }

  if (action === "checkout") {
    const handle = handleFrom(str(input.handle, user.xHandle ?? "forge_xyz"));
    const purpose = (str(input.purpose, "stake_topup") as never) ?? "stake_topup";
    const amountUsd = Math.max(1, num(input.usd, 20));
    const intent = await createCheckout({
      userId: user.id,
      handle,
      amountUsd,
      amountHype: amountUsd / (h.hypeUsd || 28.4),
      purpose,
      launchId: input.launchId ? str(input.launchId) : null,
      cashtag: input.cashtag ? str(input.cashtag) : null,
    });
    return Response.json(intent);
  }

  if (action === "confirm") {
    const reference = str(input.reference);
    const code = str(input.code);
    const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);
    const row = rows[0];
    if (!row) throw new ApiError("Payment intent not found.", 404);
    if (!row.live && row.verifyCode && row.verifyCode !== code.trim()) throw new ApiError("Confirmation code did not match the X Money request.", 403);
    await db.update(payments).set({ status: "succeeded", verifyCode: null, confirmedAt: new Date() }).where(eq(payments.id, row.id));
    const credit = row.amountUsd / (h.hypeUsd || 28.4);
    const me = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    await db.update(users).set({ hype: (me[0]?.hype ?? 0) + credit, usdc: (me[0]?.usdc ?? 0) + row.amountUsd }).where(eq(users.id, user.id));
    await notify(user.id, "payment", `X Money transfer settled`, `$${row.amountUsd.toFixed(2)} from @${row.xHandle} → ${credit.toFixed(4)} HYPE + ${row.amountUsd.toFixed(2)} USDC credited.`, "/account");
    return Response.json({ ok: true, creditedHype: credit, creditedUsdc: row.amountUsd, reference });
  }

  if (action === "boost") {
    const launch = await db.select().from(launches).where(eq(launches.slug, str(input.slug))).limit(1);
    if (!launch[0]) throw new ApiError("Launch not found.", 404);
    await db.update(launches).set({ tgeBoost: true }).where(eq(launches.id, launch[0]!.id));
    return Response.json({ ok: true, slug: launch[0]!.slug });
  }

  throw new ApiError(`Unknown x action: ${action}`, 404);
});
