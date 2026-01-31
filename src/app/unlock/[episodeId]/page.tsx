"use client";

import { useState } from "react";

export default function UnlockPage({ params }: { params: { episodeId: string } }) {
  const [status, setStatus] = useState<string>("");

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Unlock Episode</h2>
      <p className="small">Unlock episode menggunakan credits. Jika kamu premium, episode akan otomatis bisa diakses.</p>
      <div className="row">
        <button className="btn" onClick={async () => {
          setStatus("Unlocking...");
          const r = await fetch(`/api/episodes/${params.episodeId}/unlock`, { method: "POST" });
          const j = await r.json();
          setStatus(r.ok ? "Success! Redirecting..." : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/episode/${params.episodeId}`;
        }}>Unlock now</button>
        <a className="btn secondary" href={`/episode/${params.episodeId}`}>Back</a>
      </div>
      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
