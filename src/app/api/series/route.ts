import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const CreateSeriesSchema = z.object({
  type: z.enum(["COMIC", "NOVEL"]),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),

  // optional: list of genre ids
  genreIds: z.array(z.string().min(1)).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSeriesSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY" }, { status: 400 });

  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // ensure role: creator
      await tx.user.update({
        where: { id: userId },
        data: { isCreator: true },
      });

      const s = await tx.series.create({
        data: {
          creatorId: userId, // ✅ replaces creatorId
          type: parsed.data.type,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          coverImageUrl: parsed.data.coverImageUrl ?? null,
          isPublished: true,
        },
        select: { id: true },
      });

      const genreIds = parsed.data.genreIds ?? [];
      if (genreIds.length > 0) {
        // create join rows (ignore duplicates)
        await tx.seriesGenre.createMany({
          data: genreIds.map((genreId) => ({
            seriesId: s.id,
            genreId,
          })),
          skipDuplicates: true,
        });
      }

      return s;
    });

    return Response.json({ ok: true, id: created.id });
  } catch (e: any) {
    // unique constraint (e.g., title uniqueness if you add one later)
    if (e?.code === "P2002") {
      return Response.json({ error: "UNIQUE_CONSTRAINT" }, { status: 409 });
    }
    return Response.json({ error: "INTERNAL_ERROR", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
