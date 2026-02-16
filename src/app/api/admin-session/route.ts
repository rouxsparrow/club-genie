import { NextResponse } from "next/server";
import { resolveAdminIdentityFromRequest } from "../../../lib/admin-identity";

export async function GET(request: Request) {
  const identity = await resolveAdminIdentityFromRequest(request).catch(() => null);
  if (!identity) {
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: identity.id,
      username: identity.username,
      isBreakglass: identity.isBreakglass,
      mustChangePassword: identity.mustChangePassword
    }
  });
}
