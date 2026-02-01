import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Prisma } from "@prisma/client"; // ✅ tambah ini

function utcDayRange(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const dailyCredits = parseInt(process.env.FAUCET_DAILY_CREDITS || "2", 10);
  const minAgeHours = parseInt(process.env.FAUCET_MIN_ACCOUNT_AGE_HOURS || "0", 10);

  const now = new Date();
  const { start, end } = utcDayRange(now);

  try {
    const res = await prisma.$transaction(async (tx: Prisma.TransactionClient) => { // ✅ fix di sini
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, createdAt: true },
      });
      if (!user) return { ok: false as const, error: "USER_NOT_FOUND" as const };

      // min account age
      if (minAgeHours > 0) {
        const ageMs = now.getTime() - user.createdAt.getTime();
        if (ageMs < minAgeHours * 60 * 60 * 1000) {
          return { ok: false as const, error: "ACCOUNT_TOO_NEW" as const };
        }
      }

      // already claimed today?
      const already = await tx.walletTx.findFirst({
        where: {
          userId,
          type: "FAUCET_CLAIM",
          createdAt: { gte: start, lt: end },
        },
        select: { id: true },
      });

      if (already) return { ok: false as const, error: "ALREADY_CLAIMED_TODAY" as const };

      // apply credit
      await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { increment: dailyCredits } },
      });

      await tx.walletTx.create({
        data: {
          userId,
          type: "FAUCET_CLAIM",
          creditDelta: dailyCredits,
          xpDelta: 0,
          refType: "FAUCET",
          refId: start.toISOString(),
          meta: { dailyCredits },
        },
      });

      return { ok: true as const, dailyCredits };
    });

    if (!res.ok) {
      const status =
        res.error === "ALREADY_CLAIMED_TODAY" ? 429 :
        res.error === "ACCOUNT_TOO_NEW" ? 403 :
        404;
      return Response.json({ error: res.error }, { status });
    }

    return Response.json({ ok: true, creditsAdded: res.dailyCredits });
  } catch (e: any) {
    return Response.json({ error: "INTERNAL_ERROR", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
