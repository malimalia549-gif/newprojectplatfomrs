import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, requireUser } from "@/lib/auth";
import { body, num, route, str } from "@/lib/api";
import { advanceLifecycle, tradeLaunch } from "@/lib/forge";
import { head } from "@/lib/chain";
import { createCheckout, handleFrom, hypeToUsd } from "@/lib/xmoney";

/** POST /api/launches/[slug]/action  { action: buy|sell|graduate|dispatch|confirm|abort|deployPerp|listCashtag|cashtagCheckout, ... } */
export const POST = route(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const user = await requireUser();
  const input = await body(req);
  const action = str(input.action);
  const target = decodeURIComponent(slug);

  if (action === "buy" || action === "sell") {
    const result = await tradeLaunch(user, target, action, num(input.amount), Math.max(0, Math.min(5000, num(input.slippageBps, 50))));
    const fresh = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return Response.json({
      ...result,
      balance: { hype: fresh[0]?.hype ?? 0, usdc: fresh[0]?.usdc ?? 0, stoke: fresh[0]?.stoke ?? 0, points: fresh[0]?.points ?? 0 },
    });
  }

  if (action === "cashtagCheckout") {
    const h = await head();
    const handle = handleFrom(str(input.handle, user.xHandle ?? "forge_xyz"));
    const amountHype = Math.max(0.25, num(input.hype, 0.75));
    const intent = await createCheckout({
      userId: user.id,
      handle,
      amountUsd: hypeToUsd(h.hypeUsd, amountHype),
      amountHype,
      purpose: "cashtag_listing",
      cashtag: target.toUpperCase(),
    });
    return Response.json(intent);
  }

  if (["graduate", "dispatch", "confirm", "abort", "deployPerp", "listCashtag"].includes(action)) {
    const result = await advanceLifecycle(user, target, action as never, { paymentRef: input.paymentRef ? str(input.paymentRef) : undefined });
    return Response.json(result);
  }

  throw new ApiError(`Unsupported action “${action}”.`, 404);
});
