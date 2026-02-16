import { NextResponse } from "next/server";
import { validateDeactivateAdminAccount } from "../../../../../lib/admin-account-safety";
import { resolveAdminIdentityFromRequest } from "../../../../../lib/admin-identity";
import { normalizeAdminUsername } from "../../../../../lib/admin-breakglass";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await resolveAdminIdentityFromRequest(request).catch(() => null);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const accountId = (id ?? "").trim();
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Missing account id." }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { username?: string; active?: boolean }
    | null;
  const updates: Record<string, unknown> = {};

  if (typeof payload?.username === "string") {
    const username = normalizeAdminUsername(payload.username);
    if (!username) {
      return NextResponse.json({ ok: false, error: "Username cannot be empty." }, { status: 400 });
    }
    updates.username = username;
  }
  if (typeof payload?.active === "boolean") {
    updates.active = payload.active;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: target, error: lookupError } = await supabaseAdmin
    .from("admin_users")
    .select("id,active")
    .eq("id", accountId)
    .maybeSingle();
  if (lookupError) {
    return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  }
  if (!target?.id) {
    return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
  }

  if (updates.active === false) {
    const { count, error: countError } = await supabaseAdmin
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    if (countError) {
      return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
    }
    const guard = validateDeactivateAdminAccount({
      isSelf: Boolean(identity.id && identity.id === target.id),
      targetCurrentlyActive: Boolean(target.active),
      activeAdminCount: count ?? 0
    });
    if (!guard.ok) {
      const message =
        guard.error === "cannot_deactivate_self"
          ? "You cannot deactivate your own account."
          : "Cannot deactivate the last active admin.";
      return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .update(updates)
    .eq("id", accountId)
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
