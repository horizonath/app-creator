import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client"; // ✅ tambah ini

const Body = z.object({
  content: z.string().min(3).max(2000),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const ep = await prisma.episode.findUnique({
    where: { id },
    select: {
      id: true,
      series: { select: { creatorId: true } },
    },
  });

  if (!ep) {
    return Response.json({ error: "EPISODE_NOT_FOUND" }, { status: 404 });
  }

  const creatorId = ep.series.creatorId;

  const comment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => { // ✅ tipe tx
    const c = await tx.comment.create({
      data: {
        episodeId: id,
        userId,
        content: parsed.data.content,
      },
      select: { id: true },
    });

    // Reader XP +2
    await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: 2 } },
    });

    await tx.walletTx.create({
      data: {
        userId,
        type: "ADMIN_ADJUST",
        xpDelta: 2,
        creditDelta: 0,
        refType: "COMMENT",
        refId: c.id,
      },
    });

    // Creator XP +3 (jika beda user)
    if (creatorId && creatorId !== userId) {
      await tx.user.update({
        where: { id: creatorId },
        data: { xp: { increment: 3 } },
      });

      await tx.walletTx.create({
        data: {
          userId: creatorId,
          type: "ADMIN_ADJUST",
          xpDelta: 3,
          creditDelta: 0,
          refType: "COMMENT_RECEIVED",
          refId: c.id,
          meta: { fromUserId: userId },
        },
      });
    }

    return c;
  });

  return Response.json({ ok: true, id: comment.id });
}
