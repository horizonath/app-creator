import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  seriesId: z.string().min(1),
  title: z.string().min(1).max(140),
  number: z.number().int().min(1),
  isLocked: z.boolean().optional().default(false),
  unlockType: z.enum(["FREE","CREDIT","MEMBERSHIP_ONLY"]).optional().default("FREE"),
  creditCost: z.number().int().min(1).max(99).optional().default(1),
  novelBody: z.string().max(200_000).optional().nullable(),
  publish: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });

  const s = await prisma.series.findUnique({ where: { id: parsed.data.seriesId } });
  if (!s || s.ownerId !== userId) return Response.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 403 });

  const ep = await prisma.episode.create({
    data: {
      seriesId: s.id,
      title: parsed.data.title,
      number: parsed.data.number,
      isLocked: parsed.data.isLocked,
      unlockType: parsed.data.unlockType,
      creditCost: parsed.data.creditCost,
      novelBody: parsed.data.novelBody ?? null,
      publishedAt: parsed.data.publish ? new Date() : null,
    },
    select: { id: true },
  });

  // XP for creator: +15 for submit episode (simple MVP)
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: { increment: 15 },
      xpLedger: { create: { amount: 15, reason: "SUBMIT_EPISODE", refType: "episode", refId: ep.id } },
    },
  });

  return Response.json({ id: ep.id });
}
