import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({
  type: z.enum(["COMIC","NOVEL"]),
  title: z.string().min(1).max(140),
  description: z.string().max(2000).optional().nullable(),
  genre: z.string().max(120).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });

  const s = await prisma.series.create({
    data: {
      ownerId: userId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      genre: parsed.data.genre ?? null,
    },
    select: { id: true },
  });

  return Response.json({ id: s.id });
}
