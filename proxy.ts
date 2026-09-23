import { NextRequest, NextResponse } from "next/server";
import { getAuth0 } from "./lib/auth0";
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const expected = process.env.APP_BASE_URL;
    const origin = request.headers.get("origin");
    if (!expected || origin !== new URL(expected).origin) return NextResponse.json({ error: "A same-origin browser request is required" }, { status: 403 });
  }
  if (pathname === "/mcp" || pathname.startsWith("/.well-known/") || pathname === "/api/health") return NextResponse.next();
  const auth0 = getAuth0();
  if (!auth0) {
    if (pathname.startsWith("/auth/")) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }
  return auth0.middleware(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
