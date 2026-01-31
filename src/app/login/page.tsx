"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card" style={{ maxWidth: 560, margin: "24px auto" }}>
      <h2>Login</h2>
      <p className="small">Masukkan email. Kami akan kirim magic link untuk login.</p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setStatus("sending");

          try {
            // ✅ providerId sesuai /api/auth/providers => "resend"
            const res = await signIn("resend", {
              email,
              redirect: true,
              callbackUrl: "/dashboard",
            });

            // Note: kalau redirect true, biasanya langsung pindah ke /check-email.
            // res bisa null (tergantung next-auth version), jadi kita set sent juga.
            setStatus("sent");
          } catch (err: any) {
            setStatus("error");
            setError(err?.message ?? "Failed to send login link.");
          }
        }}
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          type="email"
          required
          style={{ width: "100%", marginTop: 10 }}
        />

        <button className="btn" style={{ marginTop: 10 }} disabled={status === "sending"}>
          {status === "sending" ? "Sending..." : "Send login link"}
        </button>
      </form>

      {status === "sent" && (
        <p className="small" style={{ marginTop: 12 }}>
          Kalau tidak redirect otomatis, cek email kamu (Inbox/Spam).
        </p>
      )}

      {status === "error" && (
        <p className="small" style={{ marginTop: 12 }}>
          Error: {error}
        </p>
      )}
    </div>
  );
}
