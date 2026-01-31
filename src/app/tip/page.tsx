"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function TipPage() {
  const sp = useSearchParams();
  const episodeId = sp.get("episodeId");
  const toUserId = sp.get("to");
  const [amount, setAmount] = useState(1);
  const [status, setStatus] = useState("");

  if (!episodeId || !toUserId) {
    return <div className="card">Missing parameters.</div>;
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Tip Creator</h2>
      <p className="small">Kirim tip dalam bentuk credits untuk support kreator.</p>

      <label className="small">Amount (credits)</label>
      <input
        className="input"
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value || "1", 10)))}
        style={{ maxWidth: 180 }}
      />

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={async () => {
          setStatus("Sending...");
          const r = await fetch(`/api/tip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toUserId, episodeId, amount }),
          });
          const j = await r.json();
          setStatus(r.ok ? "Tip sent!" : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/episode/${episodeId}`;
        }}>Send Tip</button>
        <a className="btn secondary" href={`/episode/${episodeId}`}>Back</a>
      </div>

      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
