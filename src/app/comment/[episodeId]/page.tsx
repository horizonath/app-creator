"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function CommentPage() {
  const params = useParams<{ episodeId: string }>();
  const episodeId = params.episodeId;

  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  if (!episodeId) return <div className="card">Missing episodeId</div>;

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2>Add Comment</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="input"
        placeholder="Write your comment..."
        style={{ fontFamily: "inherit" }}
      />
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn"
          disabled={!content.trim()}
          onClick={async () => {
            setStatus("Posting...");
            const r = await fetch(`/api/episodes/${episodeId}/comment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            });
            const j = await r.json();
            setStatus(r.ok ? "Posted!" : `Failed: ${j.error ?? "unknown"}`);
            if (r.ok) window.location.href = `/episode/${episodeId}`;
          }}
        >
          Post
        </button>
        <a className="btn secondary" href={`/episode/${episodeId}`}>
          Back
        </a>
      </div>
      {status ? <p className="small" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}
