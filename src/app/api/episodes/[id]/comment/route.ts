import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({ content: z.string().min(3).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  const c = await prisma.comment.create({
    data: { userId, episodeId: id, content: parsed.data.content },
    select: { id: true },
  });

  // XP: reader +2, creator +3
  const ep = await prisma.episode.findUnique({ where: { id }, include: { series: true } });
  if (ep) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { xp: { increment: 2 }, xpLedger: { create: { amount: 2, reason: "COMMENT", refType: "episode", refId: ep.id } } } }),
      prisma.user.update({ where: { id: ep.series.ownerId }, data: { xp: { increment: 3 }, xpLedger: { create: { amount: 3, reason: "RECEIVE_COMMENT", refType: "episode", refId: ep.id } } } }),
    ]);
  }

  return Response.json({ ok: true, id: c.id });
}
