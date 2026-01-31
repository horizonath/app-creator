import "./globals.css";
import Link from "next/link";
import { auth, signOut } from "@/auth";

export const metadata = {
  title: "Creator Hub",
  description: "Komik & Novel creator platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="id">
      <body>
        <div className="container">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/"><strong>Creator Hub</strong></Link>
            <div className="row" style={{ alignItems: "center" }}>
              <Link className="badge" href="/leaderboard">Leaderboard</Link>
              <Link className="badge" href="/dashboard">Dashboard</Link>
              {session?.user ? (
                <form action={async () => { "use server"; await signOut(); }}>
                  <button className="btn secondary" type="submit">Logout</button>
                </form>
              ) : (
                <Link className="btn" href="/login">Login</Link>
              )}
            </div>
          </div>
          <hr />
          {children}
        </div>
      </body>
    </html>
  );
}
