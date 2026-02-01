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

  const ep = await prisma.episode.findUnique({
    where: { id },
    select: {
      id: true,
      isLocked: true,
      unlockCost: true,
      series: { select: { creatorId: true } },
    },
  });
  if (!ep) return Response.json({ error: "EPISODE_NOT_FOUND" }, { status: 404 });

  // If not locked, nothing to do
  if (!ep.isLocked) return Response.json({ ok: true, message: "Already free" });

  // Check already unlocked (unique constraint)
  const existing = await prisma.unlock.findUnique({
    where: { episodeId_userId: { episodeId: id, userId } },
    select: { id: true },
  });
  if (existing) return Response.json({ ok: true, message: "Already unlocked" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      creditsBalance: true,
      membershipPlan: true,
      membershipActiveUntil: true,
    },
  });
  if (!user) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const now = new Date();
  const membershipActive =
    user.membershipPlan === "PREMIUM" &&
    user.membershipActiveUntil &&
    user.membershipActiveUntil > now;

  const cost = Math.max(0, ep.unlockCost ?? 1);
  const creatorId = ep.series.creatorId;

  // If no membership, must pay credits
  if (!membershipActive && user.creditsBalance < cost) {
    return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // record unlock (so user can access it later)
    const u = await tx.unlock.create({
      data: { userId, episodeId: id, cost: membershipActive ? 0 : cost },
      select: { id: true },
    });

    // charge credits if needed
    if (!membershipActive) {
      await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: cost } },
      });
    }

    // ledger
    await tx.walletTx.create({
      data: {
        userId,
        type: "UNLOCK_EPISODE",
        xpDelta: 0,
        creditDelta: membershipActive ? 0 : -cost,
        refType: "EPISODE",
        refId: id,
        meta: { unlockId: u.id, membershipActive, cost },
      },
    });

    // (optional) creator reward: kamu bisa tambah logic di sini nanti
    // contoh: credit masuk ke creator per unlock, atau XP creator bertambah.

    return { unlockId: u.id, membershipActive, costCharged: membershipActive ? 0 : cost };
  });

  return Response.json({ ok: true, ...result });
}
