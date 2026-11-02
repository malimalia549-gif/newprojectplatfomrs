import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { currentUser, requireUser } from "@/lib/auth";
import { body, route, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await currentUser();
  if (!user) return Response.json({ notifications: [] });
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(30);
  return Response.json({
    notifications: rows.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: n.href, read: n.read, createdAt: n.createdAt.toISOString() })),
  });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = await body(req);
  const id = str(input.id);
  if (id) await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  else await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  return Response.json({ ok: true });
});
