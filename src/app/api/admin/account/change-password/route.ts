import { NextResponse } from "next/server";
import { resolveAdminIdentityFromRequest } from "../../../../../lib/admin-identity";
import {
  createAdminSessionValue,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions
} from "../../../../../lib/admin-session";
import { hashPassword, validateAdminPassword, verifyPassword } from "../../../../../lib/password-hash";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function POST(request: Request) {
  const identity = await resolveAdminIdentityFromRequest(request).catch(() => null);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (identity.isBreakglass || !identity.id) {
    return NextResponse.json(
      { ok: false, error: "Break-glass users cannot change password. Sign in with a DB account first." },
      { status: 400 }
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | { currentPassword?: string; newPassword?: string }
    | null;
  const currentPassword = typeof payload?.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword = typeof payload?.newPassword === "string" ? payload.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ ok: false, error: "Current password and new password are required." }, { status: 400 });
  }
  const validation = validateAdminPassword(newPassword);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: user, error: lookupError } = await supabaseAdmin
    .from("admin_users")
    .select("id,username,password_hash,session_version")
    .eq("id", identity.id)
    .maybeSingle();
  if (lookupError || !user?.id) {
    return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
  }

  const currentValid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!currentValid) {
    return NextResponse.json({ ok: false, error: "Current password is incorrect." }, { status: 400 });
  }

  const nextSessionVersion = (user.session_version as number) + 1;
  const passwordHash = await hashPassword(newPassword);
  const { error: updateError } = await supabaseAdmin
    .from("admin_users")
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      session_version: nextSessionVersion,
      updated_at: new Date().toISOString()
    })
    .eq("id", identity.id);
  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    getAdminSessionCookieName(),
    createAdminSessionValue({
      uid: identity.id,
      username: String(user.username),
      sessionVersion: nextSessionVersion,
      isBreakglass: false
    }),
    getAdminSessionCookieOptions()
  );
  return response;
}
