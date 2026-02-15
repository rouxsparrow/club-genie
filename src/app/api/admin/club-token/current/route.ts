import { NextResponse } from "next/server";
import { isMissingTokenValueColumnError, normalizeTokenValue, warningMessageForCode } from "../../../../../lib/club-token-compat";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("club_settings")
    .select("token_value,token_version,rotated_at,created_at")
    .order("token_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isMissingTokenValueColumnError(error)) {
    const { data: metadata } = await supabaseAdmin
      .from("club_settings")
      .select("token_version,rotated_at,created_at")
      .order("token_version", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      token: null,
      tokenVersion: metadata?.token_version ?? null,
      rotatedAt: metadata?.rotated_at ?? null,
      warningCode: "migration_missing_token_value",
      warningMessage: warningMessageForCode("migration_missing_token_value")
    });
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const token = normalizeTokenValue(data?.token_value);
  if (!token) {
    return NextResponse.json({
      ok: true,
      token: null,
      tokenVersion: data?.token_version ?? null,
      rotatedAt: data?.rotated_at ?? null,
      warningCode: "token_not_recoverable",
      warningMessage: warningMessageForCode("token_not_recoverable")
    });
  }

  return NextResponse.json({
    ok: true,
    token,
    tokenVersion: data?.token_version ?? null,
    rotatedAt: data?.rotated_at ?? null
  });
}
