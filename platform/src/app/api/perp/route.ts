import { ApiError, currentUser, requireUser } from "@/lib/auth";
import { body, num, positive, route, str } from "@/lib/api";
import { cancelOrder, closePosition, marketViews, openPosition, placeTriggerOrder } from "@/lib/perps";

export const dynamic = "force-dynamic";

/** GET /api/perp → live HIP-3 market table (ticks marks + funding). */
export const GET = route(async () => {
  const user = await currentUser();
  const markets = await marketViews(user);
  return Response.json({ markets, at: Date.now() });
});

/** POST /api/perp → { action: open|close|limit|cancel } */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await body(req);
  const action = str(input.action, "open");
  const marketId = str(input.marketId);

  if (action === "open") {
    const res = await openPosition(user, marketId, {
      side: str(input.side, "long") === "short" ? "short" : "long",
      size: input.size ? positive(input.size, "Size") : undefined,
      notionalUsd: input.notionalUsd ? positive(input.notionalUsd, "Notional", 100000) : undefined,
      leverage: num(input.leverage, 10),
      tpPct: input.tpPct ? num(input.tpPct) / 100 : undefined,
      slPct: input.slPct ? num(input.slPct) / 100 : undefined,
    });
    return Response.json({ ok: true, ...res, markets: await marketViews(user) });
  }

  if (action === "close") {
    const res = await closePosition(user, str(input.positionId), num(input.fraction, 1));
    return Response.json({ ok: true, ...res, markets: await marketViews(user) });
  }

  if (action === "limit") {
    const res = await placeTriggerOrder(user, marketId, {
      side: str(input.side, "buy") === "sell" ? "sell" : "buy",
      limitPrice: num(input.limitPrice),
      size: num(input.size),
      leverage: num(input.leverage, 10),
      kind: str(input.kind, "limit") === "stop" ? "stop" : "limit",
    });
    return Response.json({ ok: true, ...res });
  }

  if (action === "cancel") {
    const res = await cancelOrder(user, str(input.orderId));
    return Response.json({ ok: true, ...res });
  }

  throw new ApiError("Unknown perp action.", 404);
});
