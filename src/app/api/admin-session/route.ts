import { NextResponse } from "next/server";
import { verifyAdminSessionValue } from "../../../lib/admin-session";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  if (!match?.[1]) {
    return NextResponse.json({ ok: false });
  }

  const valid = verifyAdminSessionValue(match[1]);
  return NextResponse.json({ ok: valid });
}
