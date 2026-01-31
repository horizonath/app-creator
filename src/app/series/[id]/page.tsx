import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const s = await prisma.series.findUnique({
    where: { id },
    include: { owner: true, episodes: { orderBy: { number: "asc" } } },
  });
  if (!s) return <div className="card">Series not found.</div>;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{s.title} <span className="badge">{s.type}</span></h2>
          <div className="small">by {s.owner.username ?? s.owner.email ?? "unknown"}</div>
        </div>
        <Link className="btn secondary" href="/dashboard">Dashboard</Link>
      </div>

      {s.description ? <p className="small">{s.description}</p> : null}
      <hr />

      <h3>Episodes</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {s.episodes.map((e: (typeof s.episodes)[number]) => (
          <Link key={e.id} href={`/episode/${e.id}`} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>#{e.number} — {e.title}</strong>
                {e.isLocked ? <span className="badge" style={{ marginLeft: 8 }}>Locked • {e.unlockType} • {e.creditCost} credits</span> : <span className="badge" style={{ marginLeft: 8 }}>Free</span>}
              </div>
              <div className="small">{e.publishedAt ? "Published" : "Draft"}</div>
            </div>
          </Link>
        ))}
        {s.episodes.length === 0 ? <div className="small">No episodes yet.</div> : null}
      </div>
    </div>
  );
}
