import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Very light protection: block obvious abuse patterns can be added here.
  // Keep it simple for MVP. For stronger limits, use Upstash Ratelimit.
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/credits/claim")) {
    // Require POST only
    if (req.method !== "POST") return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
