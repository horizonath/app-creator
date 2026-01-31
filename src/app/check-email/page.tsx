export default function CheckEmailPage() {
  const configured = !!process.env.RESEND_API_KEY;

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2>Check your email</h2>

      {!configured ? (
        <p className="small">
          Email login belum dikonfigurasi (RESEND_API_KEY belum ada).
          Set env <code>RESEND_API_KEY</code> dan <code>EMAIL_FROM</code> di Vercel / .env lalu redeploy.
        </p>
      ) : (
        <p className="small">
          Kami sudah mengirim link login ke email kamu. Silakan cek inbox/spam.
        </p>
      )}
    </div>
  );
}

