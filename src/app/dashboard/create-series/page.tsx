"use client";

import { useState } from "react";

export default function CreateSeriesPage() {
  const [type, setType] = useState<"COMIC"|"NOVEL">("COMIC");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState("");

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2>Create Series</h2>

      <label className="small">Type</label>
      <select className="input" value={type} onChange={(e) => setType(e.target.value as any)} style={{ maxWidth: 240 }}>
        <option value="COMIC">COMIC</option>
        <option value="NOVEL">NOVEL</option>
      </select>

      <label className="small">Title</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label className="small">Description</label>
      <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} style={{ fontFamily: "inherit" }} />

      <label className="small">Genre</label>
      <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Fantasy, Romance, Horror..." />

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" disabled={!title.trim()} onClick={async () => {
          setStatus("Creating...");
          const r = await fetch("/api/series", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, title, description, genre }),
          });
          const j = await r.json();
          setStatus(r.ok ? "Created!" : `Failed: ${j.error ?? "unknown"}`);
          if (r.ok) window.location.href = `/series/${j.id}`;
        }}>Create</button>
        <a className="btn secondary" href="/dashboard">Cancel</a>
      </div>

      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
