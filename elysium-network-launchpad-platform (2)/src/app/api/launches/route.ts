import { currentUser } from "@/lib/auth";
import { body, num, route, str } from "@/lib/api";
import { createLaunch, listLaunches, quoteLaunch } from "@/lib/forge";
import { requireUser } from "@/lib/auth";
import { getLaunch, launchDetail } from "@/lib/forge";
import { settleCheckout, createCheckout, handleFrom, hypeToUsd } from "@/lib/xmoney";
import { head } from "@/lib/chain";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError } from "@/lib/auth";

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const user = await currentUser();
  const stage = url.searchParams.get("stage") ?? undefined;
  const sort = url.searchParams.get("sort") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const launches = await listLaunches(user, { stage, sort, q });
  return Response.json({ launches, user: Boolean(user) });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await body(req);
  const action = str(input.action, "create");

  if (action === "quote") {
    const q = await quoteLaunch(str(input.slug), str(input.side, "buy") === "sell" ? "sell" : "buy", num(input.amount));
    return Response.json(q);
  }

  if (action === "checkout") {
    const h = await head();
    const handle = handleFrom(str(input.handle, user.xHandle ?? ""));
    const hype = Math.max(0.01, num(input.hype, 0.05));
    const intent = await createCheckout({
      userId: user.id,
      handle,
      amountUsd: hypeToUsd(h.hypeUsd, hype),
      amountHype: hype,
      purpose: "launch_fee",
    });
    return Response.json(intent);
  }

  if (action === "settle") {
    const settled = await settleCheckout(str(input.reference), str(input.code));
    const fresh = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const credit = settled.amountHype;
    await db.update(users).set({ hype: (fresh[0]?.hype ?? 0) + credit }).where(eq(users.id, user.id));
    return Response.json({ payment: { ...settled, verifyCode: null }, creditedHype: credit });
  }

  if (action === "create") {
    if (!user) throw new ApiError("Sign in first.", 401);
    const detail = await createLaunch(user, {
      name: str(input.name),
      symbol: str(input.symbol),
      description: str(input.description),
      category: (str(input.category, "meme") as never) ?? "meme",
      accent: str(input.accent, "#7ce0ff"),
      glyph: str(input.glyph, "◆"),
      xHandle: input.xHandle ? str(input.xHandle) : undefined,
      graduationHype: num(input.graduationHype, 12),
      initialBuyHype: num(input.initialBuyHype, 0),
      paymentRef: input.paymentRef ? str(input.paymentRef) : undefined,
    });
    return Response.json({ detail });
  }

  throw new ApiError(`Unknown launch action: ${action}`, 404);
});


