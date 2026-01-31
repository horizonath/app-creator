"use client";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function LikePage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const [status, setStatus] = useState("");

  if (!episodeId) return <div className="card">Missing episodeId</div>;

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Like Episode</h2>
      <div className="row">
        <button className="btn" onClick={async () => {
          setStatus("Liking...");
          const r = await fetch(`/api/episodes/${episodeId}/like`, { method: "POST" });
          const j = await r.json();
          setStatus(r.ok ? "Liked!" : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/episode/${episodeId}`;
        }}>Like</button>
        <a className="btn secondary" href={`/episode/${episodeId}`}>Back</a>
      </div>
      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
