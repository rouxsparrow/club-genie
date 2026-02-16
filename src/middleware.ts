import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getBreakglassConfig, isBreakglassActive } from "./lib/admin-breakglass";
import { readAdminSessionValueEdge } from "./lib/admin-session-edge";

const ADMIN_LOGIN_PATH = "/admin/login";

async function loadAdminUserForMiddleware(id: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const url = new URL("/rest/v1/admin_users", supabaseUrl);
  url.searchParams.set("select", "id,active,session_version");
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    },
    cache: "no-store"
  }).catch(() => null);
  if (!response?.ok) return null;
  const rows = (await response.json().catch(() => null)) as
    | Array<{ id?: string; active?: boolean; session_version?: number }>
    | null;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (typeof row?.id !== "string") return null;
  if (typeof row?.active !== "boolean") return null;
  if (typeof row?.session_version !== "number" || !Number.isInteger(row.session_version)) return null;
  return row;
}

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

  const payload = await readAdminSessionValueEdge(cookieValue);
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  if (payload.bg) {
    const breakglass = getBreakglassConfig();
    if (!isBreakglassActive(breakglass) || breakglass.username !== payload.un) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN_PATH;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!payload.uid) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const admin = await loadAdminUserForMiddleware(payload.uid);
  if (!admin || !admin.active || admin.session_version !== payload.sv) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
