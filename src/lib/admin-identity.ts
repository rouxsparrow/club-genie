import type { SupabaseClient } from "@supabase/supabase-js";
import { getBreakglassConfig, isBreakglassActive } from "./admin-breakglass";
import { readAdminSessionValue } from "./admin-session";
import { ADMIN_COOKIE_NAME } from "./admin-session-contract";
import { getSupabaseAdmin } from "./supabase/admin";

type AdminUserRow = {
  id: string;
  username: string;
  active: boolean;
  session_version: number;
  must_change_password: boolean;
};

export type AdminIdentity = {
  id: string | null;
  username: string;
  isBreakglass: boolean;
  sessionVersion: number;
  mustChangePassword: boolean;
};

function extractCookieValue(cookieHeader: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function loadAdminUser(supabaseAdmin: SupabaseClient, id: string): Promise<AdminUserRow | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id,username,active,session_version,must_change_password")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminUserRow;
}

export async function resolveAdminIdentityFromRequest(request: Request, supabaseAdmin?: SupabaseClient) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieValue = extractCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
  if (!cookieValue) return null;

  const payload = readAdminSessionValue(cookieValue);
  if (!payload) return null;

  if (payload.bg) {
    const breakglass = getBreakglassConfig();
    if (!isBreakglassActive(breakglass)) return null;
    if (breakglass.username !== payload.un) return null;
    return {
      id: null,
      username: payload.un,
      isBreakglass: true,
      sessionVersion: payload.sv,
      mustChangePassword: false
    } satisfies AdminIdentity;
  }

  if (!payload.uid) return null;
  const adminClient = supabaseAdmin ?? getSupabaseAdmin();
  const admin = await loadAdminUser(adminClient, payload.uid);
  if (!admin?.active) return null;
  if (admin.session_version !== payload.sv) return null;

  return {
    id: admin.id,
    username: admin.username,
    isBreakglass: false,
    sessionVersion: admin.session_version,
    mustChangePassword: Boolean(admin.must_change_password)
  } satisfies AdminIdentity;
}
