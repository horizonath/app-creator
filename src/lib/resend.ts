import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // jangan throw saat build collect page data
    // biar route auth/email yang butuh saja yang error runtime kalau env belum ada
    return null;
  }
  if (!cached) cached = new Resend(key);
  return cached;
}
