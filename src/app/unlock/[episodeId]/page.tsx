"use client";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function UnlockPage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const [status, setStatus] = useState("");

  if (!episodeId) return <div className="card">Missing episodeId</div>;

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Unlock Episode</h2>
      <p className="small">Unlock episode menggunakan credits. Jika kamu premium, episode akan otomatis bisa diakses.</p>
      <div className="row">
        <button className="btn" onClick={async () => {
          setStatus("Unlocking...");
          const r = await fetch(`/api/episodes/${episodeId}/unlock`, { method: "POST" });
          const j = await r.json();
          setStatus(r.ok ? "Success! Redirecting..." : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/episode/${episodeId}`;
        }}>Unlock now</button>
        <a className="btn secondary" href={`/episode/${episodeId}`}>Back</a>
      </div>
      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
