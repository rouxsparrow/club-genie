import { NextResponse } from "next/server";
import { getBreakglassConfig, isBreakglassActive, normalizeAdminUsername } from "../../../../lib/admin-breakglass";
import {
  createAdminSessionValue,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions
} from "../../../../lib/admin-session";
import { verifyPassword } from "../../../../lib/password-hash";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

type AdminUserRow = {
  id: string;
  username: string;
  password_hash: string;
  active: boolean;
  session_version: number;
  must_change_password: boolean;
};

export async function POST(request: Request) {
  const form = await request.formData();
  const usernameRaw = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const normalizedUsername = normalizeAdminUsername(usernameRaw);

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id,username,password_hash,active,session_version,must_change_password")
    .eq("username", normalizedUsername)
    .maybeSingle();
  const account = (data ?? null) as AdminUserRow | null;

  if (error && !error.message.includes("admin_users")) {
    return NextResponse.json({ ok: false, error: "Failed to read admin account." }, { status: 500 });
  }

  let sessionValue: string | null = null;
  if (account?.active && (await verifyPassword(password, account.password_hash))) {
    sessionValue = createAdminSessionValue({
      uid: account.id,
      username: account.username,
      sessionVersion: account.session_version,
      isBreakglass: false
    });
    await supabaseAdmin.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", account.id);
  }

  if (!sessionValue) {
    const breakglass = getBreakglassConfig();
    if (isBreakglassActive(breakglass) && breakglass.username === normalizedUsername && breakglass.password === password) {
      sessionValue = createAdminSessionValue({
        uid: null,
        username: breakglass.username as string,
        sessionVersion: 0,
        isBreakglass: true
      });
    }
  }

  if (!sessionValue) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  response.cookies.set(getAdminSessionCookieName(), sessionValue, getAdminSessionCookieOptions());
  return response;
}
