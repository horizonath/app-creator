"use client";

import { useEffect, useState } from "react";

export default function ClaimCreditsPage() {
  const [status, setStatus] = useState("Claiming...");
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/credits/claim", { method: "POST" });
      const j = await r.json();
      setStatus(r.ok ? `Success! +${j.added} credits. Balance: ${j.balance}` : `Failed: ${j.error ?? "unknown"}`);
      setTimeout(() => { window.location.href = "/dashboard"; }, 900);
    })();
  }, []);

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Credits Faucet</h2>
      <p className="small">{status}</p>
    </div>
  );
}
