import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function utcDayRange(d: Date) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

type GroupByEpisode = { episodeId: string; _count: { _all: number } }; // ✅ tambah ini

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const { start: yesterdayStart, end: yesterdayEnd } = utcDayRange(yesterday);

  const VIEW_XP = 1;
  const LIKE_XP = 3;
  const COMMENT_XP = 5;

  const viewsByEpisode = await prisma.episodeView.groupBy({
    by: ["episodeId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { _all: true },
  });

  const likesByEpisode = await prisma.like.groupBy({
    by: ["episodeId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { _all: true },
  });

  const commentsByEpisode = await prisma.comment.groupBy({
    by: ["episodeId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { _all: true },
  });

  // ✅ helper biar x tidak any
  const pluckEpisodeId = (row: GroupByEpisode) => row.episodeId;

  const episodeIds = Array.from(
    new Set([
      ...(viewsByEpisode as GroupByEpisode[]).map(pluckEpisodeId),
      ...(likesByEpisode as GroupByEpisode[]).map(pluckEpisodeId),
      ...(commentsByEpisode as GroupByEpisode[]).map(pluckEpisodeId),
    ])
  );

  if (episodeIds.length === 0) {
    return Response.json({ ok: true, date: yesterdayStart.toISOString(), creators: 0 });
  }

  const episodes = await prisma.episode.findMany({
    where: { id: { in: episodeIds } },
    select: { id: true, series: { select: { creatorId: true } } },
  });

  const episodeToCreator = new Map<string, string>();
  for (const e of episodes) {
    if (e.series?.creatorId) episodeToCreator.set(e.id, e.series.creatorId);
  }

  const creatorScore = new Map<string, number>();
  const add = (creatorId: string | undefined, delta: number) => {
    if (!creatorId) return;
    creatorScore.set(creatorId, (creatorScore.get(creatorId) ?? 0) + delta);
  };

  for (const v of viewsByEpisode as GroupByEpisode[]) {
    add(episodeToCreator.get(v.episodeId), (v._count._all ?? 0) * VIEW_XP);
  }
  for (const l of likesByEpisode as GroupByEpisode[]) {
    add(episodeToCreator.get(l.episodeId), (l._count._all ?? 0) * LIKE_XP);
  }
  for (const c of commentsByEpisode as GroupByEpisode[]) {
    add(episodeToCreator.get(c.episodeId), (c._count._all ?? 0) * COMMENT_XP);
  }

  await prisma.$transaction(
    Array.from(creatorScore.entries()).map(([userId, score]) =>
      prisma.dailyUserScore.upsert({
        where: {
          date_userId_role: {
            date: yesterdayStart,
            userId,
            role: "CREATOR",
          },
        },
        create: { date: yesterdayStart, userId, role: "CREATOR", score },
        update: { score },
      })
    )
  );

  return Response.json({
    ok: true,
    date: yesterdayStart.toISOString(),
    creators: creatorScore.size,
  });
}
