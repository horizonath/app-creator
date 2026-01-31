import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  toUserId: z.string().min(1),
  amount: z.number().int().min(1).max(999),
  episodeId: z.string().min(1).optional(),
  seriesId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const fromUserId = (session?.user as any)?.id as string | undefined;
  if (!fromUserId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  if (parsed.data.toUserId === fromUserId) {
    return Response.json({ error: "CANNOT_TIP_SELF" }, { status: 400 });
  }

  const [from, to] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId } }),
    prisma.user.findUnique({ where: { id: parsed.data.toUserId } }),
  ]);
  if (!from || !to) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  if (from.creditsBalance < parsed.data.amount) return Response.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });

  const tip = await prisma.$transaction(async (tx) => {
    const created = await tx.tip.create({
      data: {
        fromUserId,
        toUserId: parsed.data.toUserId,
        amount: parsed.data.amount,
        episodeId: parsed.data.episodeId ?? null,
        seriesId: parsed.data.seriesId ?? null,
      },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: fromUserId },
      data: {
        creditsBalance: { decrement: parsed.data.amount },
        creditLedger: { create: { amount: -parsed.data.amount, reason: "TIP_SENT", refType: "tip", refId: created.id } },
        xp: { increment: 2 },
        xpLedger: { create: { amount: 2, reason: "TIP_GIVEN", refType: "tip", refId: created.id } },
      },
    });

    await tx.user.update({
      where: { id: parsed.data.toUserId },
      data: {
        creatorCredits: { increment: parsed.data.amount },
        creditLedger: { create: { amount: parsed.data.amount, reason: "TIP_RECEIVED", refType: "tip", refId: created.id } },
        xp: { increment: parsed.data.amount * 5 },
        xpLedger: { create: { amount: parsed.data.amount * 5, reason: "TIP_RECEIVED", refType: "tip", refId: created.id } },
      },
    });

    return created;
  });

  return Response.json({ ok: true, id: tip.id });
}
