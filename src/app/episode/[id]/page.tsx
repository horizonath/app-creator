import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function recordView(episodeId: string, userId?: string) {
  // For MVP: record view only when logged in.
  // You can expand later to anonymous views (IP-based) without XP/Credits.
  if (!userId) return;
  await prisma.episodeView.create({ data: { episodeId, userId } });
}

async function canReadEpisode(episodeId: string, userId?: string) {
  const ep = await prisma.episode.findUnique({ where: { id: episodeId }, include: { series: { include: { owner: true } } } });
  if (!ep) return { ok: false, reason: "Episode not found" as const, ep: null as any };

  if (!ep.isLocked || ep.unlockType === "FREE") return { ok: true, reason: "FREE" as const, ep };

  if (!userId) return { ok: false, reason: "LOGIN_REQUIRED" as const, ep };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const now = new Date();

  // Membership bypass
  if (user?.membershipPlan === "PREMIUM" && user.membershipActiveUntil && user.membershipActiveUntil > now) {
    return { ok: true, reason: "MEMBERSHIP" as const, ep };
  }

  if (ep.unlockType === "MEMBERSHIP_ONLY") return { ok: false, reason: "MEMBERSHIP_ONLY" as const, ep };

  // CREDIT unlock: check active unlock
  const unlock = await prisma.episodeUnlock.findUnique({
    where: { userId_episodeId: { userId, episodeId } },
  });
  if (unlock && (!unlock.expiresAt || unlock.expiresAt > now)) return { ok: true, reason: "UNLOCKED" as const, ep };

  return { ok: false, reason: "LOCKED" as const, ep };
}

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const ep = await prisma.episode.findUnique({
    where: { id },
    include: {
      series: { include: { owner: true } },
      pages: { orderBy: { pageIndex: "asc" } },
      _count: { select: { likes: true, comments: true, views: true } },
    },
  });
  if (!ep) return <div className="card">Episode not found.</div>;

  const access = await canReadEpisode(ep.id, userId);

  // record a view only if readable (and logged in)
  if (access.ok) {
    await recordView(ep.id, userId);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="small"><a href={`/series/${ep.seriesId}`}>← Back to series</a></div>
          <h2 style={{ margin: "6px 0" }}>{ep.series.title} — #{ep.number}: {ep.title}</h2>
          <div className="small">by {ep.series.owner.username ?? ep.series.owner.email ?? "unknown"}</div>
        </div>
        <div className="row" style={{ alignItems: "center" }}>
          <span className="badge">{ep.series.type}</span>
          {ep.isLocked ? <span className="badge">Locked</span> : <span className="badge">Free</span>}
        </div>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <span className="badge">Views: {ep._count.views}</span>
        <span className="badge">Likes: {ep._count.likes}</span>
        <span className="badge">Comments: {ep._count.comments}</span>
      </div>

      <hr />

      {!access.ok ? (
        <LockedPanel
          episodeId={ep.id}
          unlockType={ep.unlockType}
          creditCost={ep.creditCost}
          creatorId={ep.series.ownerId}
        />
      ) : (
        <ContentView type={ep.series.type} pages={ep.pages.map((p: (typeof ep.pages)[number]) => p.imageUrl)} novelBody={ep.novelBody} />
      )}

      <hr />
      <Actions episodeId={ep.id} creatorId={ep.series.ownerId} />
      <Comments episodeId={ep.id} />
    </div>
  );
}

function ContentView({ type, pages, novelBody }: { type: string; pages: string[]; novelBody: string | null }) {
  if (type === "NOVEL") {
    return (
      <div className="card">
        <div className="small">Novel Chapter</div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{novelBody ?? "(No content yet)"}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {pages.length === 0 ? <div className="small">(No pages yet)</div> : null}
      {pages.map((url, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={idx} src={url} alt={`page-${idx+1}`} style={{ width: "100%", borderRadius: 12, border: "1px solid #e5e7eb" }} />
      ))}
    </div>
  );
}

function LockedPanel({ episodeId, unlockType, creditCost }: { episodeId: string; unlockType: string; creditCost: number; creatorId: string }) {
  return (
    <div className="card">
      <h3>Episode locked</h3>
      <p className="small">
        {unlockType === "MEMBERSHIP_ONLY"
          ? "Hanya member premium yang bisa akses episode ini."
          : `Unlock dengan ${creditCost} credits (akses 24 jam).`}
      </p>
      <div className="row">
        <a className="btn" href={`/unlock/${episodeId}`}>Unlock</a>
        <a className="btn secondary" href="/dashboard">Go to dashboard</a>
      </div>
    </div>
  );
}

function Actions({ episodeId, creatorId }: { episodeId: string; creatorId: string }) {
  return (
    <div className="row">
      <a className="btn secondary" href={`/like/${episodeId}`}>Like</a>
      <a className="btn secondary" href={`/tip?episodeId=${episodeId}&to=${creatorId}`}>Tip Creator</a>
    </div>
  );
}

async function Comments({ episodeId }: { episodeId: string }) {
  const comments = await prisma.comment.findMany({
    where: { episodeId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { username: true, email: true } } },
  });

  return (
    <div className="card">
      <h3>Comments</h3>
      <form action={`/comment/${episodeId}`} method="GET" className="row">
        <button className="btn secondary" type="submit">Add Comment</button>
      </form>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {comments.map((c: (typeof comments)[number]) => (
          <div key={c.id} className="card">
            <div className="small">{c.user.username ?? c.user.email ?? "unknown"} • {new Date(c.createdAt).toLocaleString()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
          </div>
        ))}
        {comments.length === 0 ? <div className="small">No comments yet.</div> : null}
      </div>
    </div>
  );
}
