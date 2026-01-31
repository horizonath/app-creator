import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    await prisma.episodeLike.create({ data: { userId, episodeId: params.id } });
  } catch {
    return Response.json({ ok: true, message: "Already liked" });
  }

  // XP: reader +1, creator +2
  const ep = await prisma.episode.findUnique({ where: { id: params.id }, include: { series: true } });
  if (ep) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { xp: { increment: 1 }, xpLedger: { create: { amount: 1, reason: "LIKE_EPISODE", refType: "episode", refId: ep.id } } } }),
      prisma.user.update({ where: { id: ep.series.ownerId }, data: { xp: { increment: 2 }, xpLedger: { create: { amount: 2, reason: "RECEIVE_LIKE", refType: "episode", refId: ep.id } } } }),
    ]);
  }

  return Response.json({ ok: true });
}
