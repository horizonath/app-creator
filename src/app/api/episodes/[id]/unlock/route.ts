import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = new Date();

  const ep = await prisma.episode.findUnique({
    where: { id: params.id },
    include: { series: true },
  });
  if (!ep) return Response.json({ error: "EPISODE_NOT_FOUND" }, { status: 404 });

  if (!ep.isLocked || ep.unlockType === "FREE") return Response.json({ ok: true, message: "Already free" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  // membership bypass
  if (user.membershipPlan === "PREMIUM" && user.membershipActiveUntil && user.membershipActiveUntil > now) {
    return Response.json({ ok: true, message: "Membership access" });
  }

  if (ep.unlockType === "MEMBERSHIP_ONLY") return Response.json({ error: "MEMBERSHIP_ONLY" }, { status: 403 });

  const existing = await prisma.episodeUnlock.findUnique({ where: { userId_episodeId: { userId, episodeId: ep.id } } });
  if (existing && (!existing.expiresAt || existing.expiresAt > now)) {
    return Response.json({ ok: true, message: "Already unlocked" });
  }

  if (user.creditsBalance < ep.creditCost) {
    return Response.json({ error: "INSUFFICIENT_CREDITS", cost: ep.creditCost, balance: user.creditsBalance }, { status: 402 });
  }

  const expiresAt = new Date(now.getTime() + ep.unlockDurationHours * 60 * 60_000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        creditsBalance: { decrement: ep.creditCost },
        creditLedger: { create: { amount: -ep.creditCost, reason: "UNLOCK_EPISODE", refType: "episode", refId: ep.id } },
        xp: { increment: 1 },
        xpLedger: { create: { amount: 1, reason: "UNLOCK_EPISODE", refType: "episode", refId: ep.id } },
      },
    }),
    prisma.episodeUnlock.upsert({
      where: { userId_episodeId: { userId, episodeId: ep.id } },
      create: { userId, episodeId: ep.id, expiresAt },
      update: { expiresAt },
    }),
  ]);

  return Response.json({ ok: true, expiresAt });
}
