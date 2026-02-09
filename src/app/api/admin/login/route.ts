import { NextResponse } from "next/server";
import {
  createAdminSessionValue,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions
} from "../../../../lib/admin-session";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  response.cookies.set(getAdminSessionCookieName(), createAdminSessionValue(), getAdminSessionCookieOptions());
  return response;
}
