import { NextResponse } from "next/server";
import { resolveAdminIdentityFromRequest } from "../../../../../../lib/admin-identity";
import { hashPassword, validateAdminPassword } from "../../../../../../lib/password-hash";
import { getSupabaseAdmin } from "../../../../../../lib/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await resolveAdminIdentityFromRequest(request).catch(() => null);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const accountId = (id ?? "").trim();
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Missing account id." }, { status: 400 });
  }
  if (identity.id && identity.id === accountId) {
    return NextResponse.json({ ok: false, error: "Use Change Password for your own account." }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as { password?: string; mustChangePassword?: boolean } | null;
  const password = typeof payload?.password === "string" ? payload.password : "";
  const mustChangePassword = payload?.mustChangePassword !== false;
  const validation = validateAdminPassword(password);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: target, error: lookupError } = await supabaseAdmin
    .from("admin_users")
    .select("id,session_version")
    .eq("id", accountId)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  }
  if (!target?.id) {
    return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
  }

  const passwordHash = await hashPassword(password);
  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({
      password_hash: passwordHash,
      must_change_password: mustChangePassword,
      session_version: (target.session_version ?? 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", accountId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
