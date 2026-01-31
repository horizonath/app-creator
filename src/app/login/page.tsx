"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Login</h2>
      <p className="small">Masukkan email. Kami akan kirim magic link untuk login.</p>
      <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" />
      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={async () => {
            setLoading(true);
            await signIn("email", { email, callbackUrl: "/" });
            setLoading(false);
          }}
          disabled={!email || loading}
        >
          {loading ? "Sending..." : "Send login link"}
        </button>
      </div>
    </div>
  );
}
