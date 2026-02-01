import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const CreateEpisodeSchema = z.object({
  seriesId: z.string().min(1),
  title: z.string().min(1).max(200),
  number: z.number().int().min(1),
  isLocked: z.boolean().optional().default(false),
  unlockCost: z.number().int().min(0).optional().default(1),

  // content
  pages: z.array(z.string().url()).optional(),      // for COMIC
  novelBody: z.string().max(200000).optional(),     // for NOVEL
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateEpisodeSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  const s = await prisma.series.findUnique({
    where: { id: parsed.data.seriesId },
    select: { id: true, creatorId: true, type: true },
  });

  // ✅ creatorId replaces creatorId
  if (!s || s.creatorId !== userId) {
    return Response.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 403 });
  }

  // validate content based on series type
  if (s.type === "COMIC") {
    if (!parsed.data.pages || parsed.data.pages.length === 0) {
      return Response.json({ error: "PAGES_REQUIRED_FOR_COMIC" }, { status: 400 });
    }
  } else if (s.type === "NOVEL") {
    if (!parsed.data.novelBody || parsed.data.novelBody.trim().length === 0) {
      return Response.json({ error: "NOVEL_BODY_REQUIRED_FOR_NOVEL" }, { status: 400 });
    }
  }

  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ep = await tx.episode.create({
        data: {
          seriesId: s.id,
          title: parsed.data.title,
          number: parsed.data.number,
          isLocked: parsed.data.isLocked ?? false,
          unlockCost: parsed.data.unlockCost ?? 1,
          novelBody: s.type === "NOVEL" ? (parsed.data.novelBody ?? null) : null,
        },
        select: { id: true },
      });

      if (s.type === "COMIC") {
        const pages = parsed.data.pages ?? [];
        // bulk create pages
        await tx.episodePage.createMany({
          data: pages.map((url, idx) => ({
            episodeId: ep.id,
            pageNumber: idx + 1,
            imageUrl: url,
          })),
        });
      }

      return ep;
    });

    return Response.json({ ok: true, id: created.id });
  } catch (e: any) {
    // unique violation for (seriesId, number)
    if (e?.code === "P2002") {
      return Response.json({ error: "EPISODE_NUMBER_ALREADY_EXISTS" }, { status: 409 });
    }
    return Response.json({ error: "INTERNAL_ERROR", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
