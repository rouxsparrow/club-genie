import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSessionValueEdge } from "./lib/admin-session-edge";

const ADMIN_LOGIN_PATH = "/admin/login";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(ADMIN_LOGIN_PATH) || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get("admin_session")?.value;
  if (!cookieValue) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const valid = await verifyAdminSessionValueEdge(cookieValue);
  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
