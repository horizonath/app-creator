"use client";

import { useState } from "react";

export default function LikePage({ params }: { params: { episodeId: string } }) {
  const [status, setStatus] = useState<string>("");

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Like Episode</h2>
      <div className="row">
        <button className="btn" onClick={async () => {
          setStatus("Liking...");
          const r = await fetch(`/api/episodes/${params.episodeId}/like`, { method: "POST" });
          const j = await r.json();
          setStatus(r.ok ? "Liked!" : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/episode/${params.episodeId}`;
        }}>Like</button>
        <a className="btn secondary" href={`/episode/${params.episodeId}`}>Back</a>
      </div>
      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
