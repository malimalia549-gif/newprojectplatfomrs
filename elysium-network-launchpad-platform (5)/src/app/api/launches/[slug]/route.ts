import { currentUser } from "@/lib/auth";
import { route } from "@/lib/api";
import { launchDetail } from "@/lib/forge";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const user = await currentUser();
  const detail = await launchDetail(decodeURIComponent(slug), user);
  return Response.json({ detail });
});
