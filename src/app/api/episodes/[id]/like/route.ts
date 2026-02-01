import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // Get episode + creator
  const ep = await prisma.episode.findUnique({
    where: { id },
    select: { id: true, series: { select: { creatorId: true } } },
  });
  if (!ep) return Response.json({ error: "EPISODE_NOT_FOUND" }, { status: 404 });

  const creatorId = ep.series.creatorId;

  // Like is unique([episodeId, userId]) in schema
  // We do upsert-like behavior: try create, if exists -> already liked
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // create like
      await tx.like.create({
        data: { userId, episodeId: id },
      });

      // XP: liker +1 (reader), creator +2 (optional)
      // You can tweak later
      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: 1 } },
      });

      await tx.walletTx.create({
        data: {
          userId,
          type: "ADMIN_ADJUST",
          xpDelta: 1,
          creditDelta: 0,
          refType: "LIKE",
          refId: `${id}:${userId}`,
          meta: { episodeId: id, reason: "LIKE" },
        },
      });

      if (creatorId && creatorId !== userId) {
        await tx.user.update({
          where: { id: creatorId },
          data: { xp: { increment: 2 } },
        });

        await tx.walletTx.create({
          data: {
            userId: creatorId,
            type: "ADMIN_ADJUST",
            xpDelta: 2,
            creditDelta: 0,
            refType: "LIKE_RECEIVED",
            refId: `${id}:${userId}`,
            meta: { episodeId: id, fromUserId: userId, reason: "RECEIVE_LIKE" },
          },
        });
      }

      return { ok: true as const };
    });

    return Response.json(result);
  } catch (e: any) {
    // Unique constraint -> already liked
    // Prisma throws P2002 for unique violation
    if (e?.code === "P2002") {
      return Response.json({ ok: true, message: "Already liked" });
    }
    return Response.json({ error: "INTERNAL_ERROR", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
