import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { z } from "zod";

const TipSchema = z.object({
  toUserId: z.string().min(1),
  amount: z.number().int().min(1),
  episodeId: z.string().optional().nullable(),
  seriesId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const fromUserId = (session?.user as any)?.id as string | undefined;
  if (!fromUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = TipSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  const { toUserId, amount, episodeId, seriesId } = parsed.data;
  if (toUserId === fromUserId) return Response.json({ error: "CANNOT_TIP_SELF" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const from = await tx.user.findUnique({
        where: { id: fromUserId },
        select: { id: true, creditsBalance: true },
      });
      if (!from) return { ok: false as const, error: "FROM_NOT_FOUND" as const };
      if (from.creditsBalance < amount) return { ok: false as const, error: "INSUFFICIENT_CREDITS" as const };

      const to = await tx.user.findUnique({
        where: { id: toUserId },
        select: { id: true },
      });
      if (!to) return { ok: false as const, error: "TO_NOT_FOUND" as const };

      const tip = await tx.tip.create({
        data: {
          fromUserId,
          toUserId,
          amount,
          episodeId: episodeId ?? null,
          seriesId: seriesId ?? null,
        },
        select: { id: true },
      });

      // balances
      await tx.user.update({
        where: { id: fromUserId },
        data: { creditsBalance: { decrement: amount } },
      });

      await tx.user.update({
        where: { id: toUserId },
        data: { creditsBalance: { increment: amount } },
      });

      // ledger (2 entries)
      await tx.walletTx.create({
        data: {
          userId: fromUserId,
          type: "TIP",
          creditDelta: -amount,
          xpDelta: 0,
          refType: "TIP",
          refId: tip.id,
          meta: { toUserId, episodeId: episodeId ?? null, seriesId: seriesId ?? null },
        },
      });

      await tx.walletTx.create({
        data: {
          userId: toUserId,
          type: "TIP",
          creditDelta: amount,
          xpDelta: 0,
          refType: "TIP",
          refId: tip.id,
          meta: { fromUserId, episodeId: episodeId ?? null, seriesId: seriesId ?? null },
        },
      });

      return { ok: true as const, tipId: tip.id };
    });

    if (!result.ok) {
      const status = result.error === "INSUFFICIENT_CREDITS" ? 402 : 404;
      return Response.json({ error: result.error }, { status });
    }

    return Response.json({ ok: true, tipId: result.tipId });
  } catch (e: any) {
    return Response.json({ error: "INTERNAL_ERROR", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
