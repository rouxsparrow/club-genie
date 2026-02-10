import { NextResponse } from "next/server";
import { getAdminSessionCookieName, getAdminSessionCookieOptions } from "../../../../lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0
  });
  return response;
}
