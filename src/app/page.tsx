import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const series = await prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { owner: { select: { username: true, email: true } }, _count: { select: { episodes: true } } },
  });

  return (
    <div className="row">
      <div style={{ flex: 2, minWidth: 320 }}>
        <div className="card">
          <h2>Latest Series</h2>
          <p className="small">Komik & novel terbaru dari para kreator.</p>
          <div style={{ display: "grid", gap: 12 }}>
            {series.map((s) => (
              <Link key={s.id} href={`/series/${s.id}`} className="card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div><strong>{s.title}</strong> <span className="badge">{s.type}</span></div>
                    <div className="small">by {s.owner.username ?? s.owner.email ?? "unknown"}</div>
                  </div>
                  <div className="small">{s._count.episodes} eps</div>
                </div>
                {s.description ? <p className="small">{s.description}</p> : null}
              </Link>
            ))}
            {series.length === 0 ? <div className="small">No content yet. Create your first series via /dashboard.</div> : null}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 260 }}>
        <div className="card">
          <h3>Quick Links</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <Link className="btn secondary" href="/dashboard">Creator Dashboard</Link>
            <Link className="btn secondary" href="/leaderboard">Leaderboards</Link>
          </div>
          <hr />
          <p className="small">
            MVP: email login, faucet credits, unlock episode, tip creator, basic leaderboards.
          </p>
        </div>
      </div>
    </div>
  );
}
