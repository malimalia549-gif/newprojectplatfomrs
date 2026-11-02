import { currentUser, requireUser } from "@/lib/auth";
import { body, num, route, str } from "@/lib/api";
import { ensureSeeded } from "@/lib/seed";
import { executeSwap, listSwapState, quoteSwap } from "@/lib/swap";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await ensureSeeded();
  const user = await currentUser();
  const state = await listSwapState(user);
  return Response.json(state);
});

export const POST = route(async (req: Request) => {
  await ensureSeeded();
  const input = await body(req);
  const action = str(input.action, "quote");
  const from = str(input.from, "HYPE");
  const to = str(input.to, "USDC");
  const amount = num(input.amount, 0);
  const slippageBps = Math.max(5, Math.min(2500, num(input.slippageBps, 50)));

  if (action === "quote") {
    const quote = await quoteSwap(from, to, amount, slippageBps);
    return Response.json({ quote });
  }

  const user = await requireUser();
  const result = await executeSwap(user, from, to, amount, slippageBps);
  const state = await listSwapState(result.user);
  return Response.json({ ...result, state });
});
