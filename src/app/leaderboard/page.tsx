import { prisma } from "@/lib/prisma";
import { dateKeyJakarta, startOfJakartaDayUtc } from "@/lib/time";

function rangeStart(days: number) {
  const now = new Date();
  const start = new Date(startOfJakartaDayUtc(now).getTime() - (days - 1) * 24 * 60 * 60_000);
  return start;
}

export default async function LeaderboardPage({ searchParams }: { searchParams: { range?: string } }) {
  const range = searchParams.range ?? "7d";
  const days = range === "30d" ? 30 : range === "all" ? 3650 : 7;

  const start = days === 3650 ? new Date("2000-01-01T00:00:00.000Z") : rangeStart(days);

  const reader = await prisma.dailyUserScore.groupBy({
    by: ["userId"],
    where: { role: "READER", date: { gte: start } },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
    take: 20,
  });

  const creator = await prisma.dailyUserScore.groupBy({
    by: ["userId"],
    where: { role: "CREATOR", date: { gte: start } },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
    take: 20,
  });

  const ids = Array.from(new Set([...reader.map(r=>r.userId), ...creator.map(c=>c.userId)]));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id:true, username:true, email:true } });
  const map = new Map(users.map(u=>[u.id, u]));

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Leaderboards</h2>
        <div className="row">
          <a className="badge" href="/leaderboard?range=7d">7D</a>
          <a className="badge" href="/leaderboard?range=30d">30D</a>
          <a className="badge" href="/leaderboard?range=all">All</a>
        </div>
      </div>
      <p className="small">Leaderboard dihitung dari daily aggregation (Vercel Cron). Jalankan endpoint cron minimal 1x/hari.</p>
      <hr />

      <div className="row">
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <h3>Top Readers ({range})</h3>
          <ol>
            {reader.map((r) => {
              const u = map.get(r.userId);
              return <li key={r.userId}><strong>{u?.username ?? u?.email ?? "unknown"}</strong> — {r._sum.score ?? 0}</li>;
            })}
          </ol>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <h3>Top Creators ({range})</h3>
          <ol>
            {creator.map((c) => {
              const u = map.get(c.userId);
              return <li key={c.userId}><strong>{u?.username ?? u?.email ?? "unknown"}</strong> — {c._sum.score ?? 0}</li>;
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
