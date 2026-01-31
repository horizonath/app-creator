import { prisma } from "@/lib/prisma";
import { dateKeyJakarta, startOfJakartaDayUtc } from "@/lib/time";

/**
 * Run daily via Vercel Cron.
 * Aggregates yesterday's reader/creator scores from events.
 *
 * Auth: header x-cron-secret must match CRON_SECRET.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = startOfJakartaDayUtc(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60_000);
  const yesterdayEnd = todayStart;

  const dateKey = dateKeyJakarta(yesterdayStart);

  // Reader score components
  const views = await prisma.episodeView.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { _all: true },
  });

  const likes = await prisma.episodeLike.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { _all: true },
  });

  const comments = await prisma.comment.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { _all: true },
  });

  // Creator score: interactions received on their episodes + tips received
  const likesReceived = await prisma.episodeLike.findMany({
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    select: { episode: { select: { series: { select: { ownerId: true } } } } },
  });
  const commentsReceived = await prisma.comment.findMany({
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    select: { episode: { select: { series: { select: { ownerId: true } } } } },
  });
  const viewsReceived = await prisma.episodeView.findMany({
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    select: { episode: { select: { series: { select: { ownerId: true } } } } },
  });
  const tipsReceived = await prisma.tip.groupBy({
    by: ["toUserId"],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _sum: { amount: true },
  });

  // Build maps
  const readerScore = new Map<string, number>();
  for (const v of views) readerScore.set(v.userId, (readerScore.get(v.userId) ?? 0) + v._count._all * 1);
  for (const l of likes) readerScore.set(l.userId, (readerScore.get(l.userId) ?? 0) + l._count._all * 1);
  for (const c of comments) readerScore.set(c.userId, (readerScore.get(c.userId) ?? 0) + c._count._all * 2);

  const creatorScore = new Map<string, number>();
  for (const x of viewsReceived) {
    const ownerId = x.episode.series.ownerId;
    creatorScore.set(ownerId, (creatorScore.get(ownerId) ?? 0) + 1); // 1 per view
  }
  for (const x of likesReceived) {
    const ownerId = x.episode.series.ownerId;
    creatorScore.set(ownerId, (creatorScore.get(ownerId) ?? 0) + 3); // 3 per like received
  }
  for (const x of commentsReceived) {
    const ownerId = x.episode.series.ownerId;
    creatorScore.set(ownerId, (creatorScore.get(ownerId) ?? 0) + 4); // 4 per comment received
  }
  for (const t of tipsReceived) {
    creatorScore.set(t.toUserId, (creatorScore.get(t.toUserId) ?? 0) + (t._sum.amount ?? 0) * 5);
  }

  // Upsert scores
  const ops = [];
  for (const [userId, score] of readerScore.entries()) {
    ops.push(prisma.dailyUserScore.upsert({
      where: { date_userId_role: { date: dateKey, userId, role: "READER" } },
      create: { date: dateKey, userId, role: "READER", score: Math.trunc(score) },
      update: { score: Math.trunc(score) },
    }));
  }
  for (const [userId, score] of creatorScore.entries()) {
    ops.push(prisma.dailyUserScore.upsert({
      where: { date_userId_role: { date: dateKey, userId, role: "CREATOR" } },
      create: { date: dateKey, userId, role: "CREATOR", score: Math.trunc(score) },
      update: { score: Math.trunc(score) },
    }));
  }

  await prisma.$transaction(ops);

  return Response.json({
    ok: true,
    date: dateKey.toISOString(),
    readerUsers: readerScore.size,
    creatorUsers: creatorScore.size,
  });
}
