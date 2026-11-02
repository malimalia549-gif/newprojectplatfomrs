import { currentUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { marketPanel, userPositions } from "@/lib/perps";

export const dynamic = "force-dynamic";

/** GET /api/perp/[marketId] → marks, HyperCore-style depth, tape, own positions + resting orders. */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ marketId: string }> }) => {
  const { marketId } = await ctx.params;
  const user = await currentUser();
  const id = decodeURIComponent(marketId);
  const panel = await marketPanel(id, user);
  return Response.json(panel);
});

/** POST /api/perp/[marketId] with { action: "positions" } → refresh own trading state. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ marketId: string }> }) => {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { marketId } = await ctx.params;
  const panel = await marketPanel(decodeURIComponent(marketId), user);
  const own = await userPositions(user);
  return Response.json({ ...panel, ...own });
});
