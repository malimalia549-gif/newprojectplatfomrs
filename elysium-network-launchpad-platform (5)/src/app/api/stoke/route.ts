import { requireUser } from "@/lib/auth";
import { body, num, route, str } from "@/lib/api";
import { claimAirdrop, claimVested, leaderboard, stokeState, stakeTok, unstakeTok } from "@/lib/stoke";
import { head } from "@/lib/chain";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const h = await head();
  const [rows, state] = await Promise.all([leaderboard(20), stokeState(null)]);
  return Response.json({ price: h.stokeUsd, hypeUsd: h.hypeUsd, leaderboard: rows, state });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await body(req);
  const action = str(input.action, "state");

  if (action === "state") {
    const rows = await leaderboard(20);
    return Response.json({ state: await stokeState(user), leaderboard: rows });
  }

  if (action === "stake") {
    const res = await stakeTok(user, num(input.amount), num(input.lockDays, 0));
    return Response.json({ ok: true, ...res, state: await stokeState(user) });
  }

  if (action === "unstake") {
    const res = await unstakeTok(user, str(input.stakeId));
    return Response.json({ ok: true, ...res, state: await stokeState(user) });
  }

  if (action === "claim") {
    const res = await claimAirdrop(user, str(input.tier) as never);
    return Response.json({ ok: true, ...res, state: await stokeState(user) });
  }

  if (action === "vest") {
    const res = await claimVested(user, str(input.scheduleId));
    return Response.json({ ok: true, ...res, state: await stokeState(user) });
  }

  throw new Error(`Unknown stoke action: ${action}`);
});
