import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { endOfJakartaDayUtc, startOfJakartaDayUtc } from "@/lib/time";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const now = new Date();
  const start = startOfJakartaDayUtc(now);
  const end = endOfJakartaDayUtc(now);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const minAgeHours = parseInt(process.env.FAUCET_MIN_ACCOUNT_AGE_HOURS || "24", 10);
  if (now.getTime() - user.createdAt.getTime() < minAgeHours * 60 * 60_000) {
    return Response.json({ error: "ACCOUNT_TOO_NEW", minAgeHours }, { status: 403 });
  }

  if (user.lastFaucetClaimAt && user.lastFaucetClaimAt >= start && user.lastFaucetClaimAt < end) {
    return Response.json({ error: "ALREADY_CLAIMED_TODAY" }, { status: 429 });
  }

  const base = parseInt(process.env.FAUCET_DAILY_CREDITS || "2", 10);
  let bonus = 0;

  // membership bonus (optional)
  if (user.membershipPlan === "PREMIUM" && user.membershipActiveUntil && user.membershipActiveUntil > now) {
    bonus = parseInt(process.env.MEMBERSHIP_DAILY_BONUS_CREDITS || "1", 10);
  }

  const added = Math.max(0, base + bonus);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      creditsBalance: { increment: added },
      lastFaucetClaimAt: now,
      creditLedger: {
        create: { amount: added, reason: bonus ? "MEMBERSHIP_BONUS" : "FAUCET_CLAIM", refType: "faucet", refId: start.toISOString() },
      },
    },
    select: { creditsBalance: true },
  });

  // XP for reader: +2 for daily claim (optional engagement)
  await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: 2 }, xpLedger: { create: { amount: 2, reason: "DAILY_CLAIM", refType: "faucet", refId: start.toISOString() } } },
  });

  return Response.json({ added, balance: updated.creditsBalance });
}
