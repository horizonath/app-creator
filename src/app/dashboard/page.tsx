import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return (
      <div className="card">
        <h2>Dashboard</h2>
        <p className="small">Please login first.</p>
        <Link className="btn" href="/login">Login</Link>
      </div>
    );
  }

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const mySeries = await prisma.series.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { episodes: true } } },
  });

  return (
    <div className="row">
      <div style={{ flex: 1, minWidth: 320 }}>
        <div className="card">
          <h2>My Account</h2>
          <div className="row">
            <span className="badge">XP: {me?.xp ?? 0}</span>
            <span className="badge">Credits: {me?.creditsBalance ?? 0}</span>
            <span className="badge">Creator Credits: {me?.creatorCredits ?? 0}</span>
            <span className="badge">Plan: {me?.membershipPlan ?? "FREE"}</span>
          </div>

          <hr />
          <h3>Daily Credits Faucet</h3>
          <p className="small">Claim credits harian untuk unlock episode locked dan memberi tip.</p>
          <form action="/credits/claim" method="GET">
            <button className="btn" type="submit">Claim now</button>
          </form>

          <hr />
          <h3>Membership</h3>
          <p className="small">MVP: membership masih manual via database. (Nanti bisa Stripe)</p>
        </div>
      </div>

      <div style={{ flex: 2, minWidth: 360 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Creator Panel</h2>
            <Link className="btn secondary" href="/dashboard/create-series">+ New Series</Link>
          </div>
          <p className="small">Buat komik atau novel, lalu publish episode/chapter.</p>

          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {mySeries.map((s) => (
              <div key={s.id} className="card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div><strong>{s.title}</strong> <span className="badge">{s.type}</span></div>
                    <div className="small">{s._count.episodes} eps</div>
                  </div>
                  <div className="row">
                    <Link className="btn secondary" href={`/series/${s.id}`}>View</Link>
                    <Link className="btn" href={`/dashboard/create-episode?seriesId=${s.id}`}>+ Episode</Link>
                  </div>
                </div>
              </div>
            ))}
            {mySeries.length === 0 ? <div className="small">No series yet. Create one.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
