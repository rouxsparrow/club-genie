import { NextResponse } from "next/server";
import { resolveAdminIdentityFromRequest } from "../../../../lib/admin-identity";
import { normalizeAdminUsername } from "../../../../lib/admin-breakglass";
import { hashPassword, validateAdminPassword } from "../../../../lib/password-hash";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function GET(request: Request) {
  const identity = await resolveAdminIdentityFromRequest(request).catch(() => null);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id,username,active,must_change_password,last_login_at,created_at")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, accounts: data ?? [] });
}

export async function POST(request: Request) {
  const identity = await resolveAdminIdentityFromRequest(request).catch(() => null);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { username?: string; password?: string; active?: boolean }
    | null;
  const normalizedUsername = normalizeAdminUsername(payload?.username ?? "");
  if (!normalizedUsername) {
    return NextResponse.json({ ok: false, error: "Username is required." }, { status: 400 });
  }
  const password = typeof payload?.password === "string" ? payload.password : "";
  const passwordValidation = validateAdminPassword(password);
  if (!passwordValidation.ok) {
    return NextResponse.json({ ok: false, error: passwordValidation.error }, { status: 400 });
  }
  const active = payload?.active !== false;
  const passwordHash = await hashPassword(password);

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .insert({
      username: normalizedUsername,
      password_hash: passwordHash,
      active,
      created_by: identity.id
    })
    .select("id,username,active,must_change_password,last_login_at,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Username already exists." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, account: data });
}
