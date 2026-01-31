"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CreateEpisodePage() {
  const sp = useSearchParams();
  const seriesId = sp.get("seriesId");
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockType, setUnlockType] = useState<"FREE"|"CREDIT"|"MEMBERSHIP_ONLY">("FREE");
  const [creditCost, setCreditCost] = useState(1);
  const [novelBody, setNovelBody] = useState("");
  const [status, setStatus] = useState("");

  if (!seriesId) return <div className="card">Missing seriesId</div>;

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <h2>Create Episode</h2>
      <p className="small">Untuk komik: buat episode dulu, lalu tambahkan image URLs (MVP). Untuk novel: isi body text.</p>

      <label className="small">Title</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label className="small">Number</label>
      <input className="input" type="number" min={1} value={number} onChange={(e) => setNumber(parseInt(e.target.value||"1",10))} style={{ maxWidth: 200 }} />

      <div className="row" style={{ alignItems: "center" }}>
        <label className="small">
          <input type="checkbox" checked={isLocked} onChange={(e)=>setIsLocked(e.target.checked)} /> Locked
        </label>

        <select className="input" value={unlockType} onChange={(e)=>setUnlockType(e.target.value as any)} style={{ maxWidth: 220 }}>
          <option value="FREE">FREE</option>
          <option value="CREDIT">CREDIT</option>
          <option value="MEMBERSHIP_ONLY">MEMBERSHIP_ONLY</option>
        </select>

        <input className="input" type="number" min={1} value={creditCost} onChange={(e)=>setCreditCost(Math.max(1, parseInt(e.target.value||"1",10)))} style={{ maxWidth: 160 }} />
      </div>

      <label className="small">Novel Body (optional)</label>
      <textarea className="input" rows={10} value={novelBody} onChange={(e)=>setNovelBody(e.target.value)} style={{ fontFamily: "inherit" }} />

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!title.trim()} onClick={async ()=>{
          setStatus("Creating...");
          const r = await fetch("/api/episodes", {
            method:"POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ seriesId, title, number, isLocked, unlockType, creditCost, novelBody, publish: true }),
          });
          const j = await r.json();
          setStatus(r.ok ? "Created!" : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/episode/${j.id}`;
        }}>Create & Publish</button>
        <a className="btn secondary" href="/dashboard">Cancel</a>
      </div>

      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
