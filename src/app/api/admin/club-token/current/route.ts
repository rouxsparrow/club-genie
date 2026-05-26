import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function GET(request: Request) {
  const clubId = new URL(request.url).searchParams.get("clubId")?.trim() ?? "";
  if (!clubId) {
    return NextResponse.json({ ok: false, error: "clubId is required." }, { status: 400 });
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("club_tokens")
    .select("token_value,token_version,rotated_at,created_at")
    .eq("club_id", clubId)
    .eq("is_current", true)
    .order("token_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const token = typeof data?.token_value === "string" && data.token_value.trim() ? data.token_value.trim() : null;
  return NextResponse.json({
    ok: true,
    token,
    tokenVersion: data?.token_version ?? null,
    rotatedAt: data?.rotated_at ?? null
  });
}
