import crypto from "crypto";
import { NextResponse } from "next/server";
import { isMissingTokenValueColumnError, warningMessageForCode } from "../../../../../lib/club-token-compat";
import { sha256Hex } from "../../../../../lib/crypto";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

function getHost(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export async function POST() {
  const serverHost = getHost(process.env.SUPABASE_URL);
  const publicHost = getHost(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (serverHost && publicHost && serverHost !== publicHost) {
    return NextResponse.json(
      {
        ok: false,
        error: `Supabase project mismatch: SUPABASE_URL (${serverHost}) differs from NEXT_PUBLIC_SUPABASE_URL (${publicHost})`
      },
      { status: 500 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256Hex(token);
  const { data: latest, error: latestError } = await supabaseAdmin
    .from("club_settings")
    .select("token_version")
    .order("token_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return NextResponse.json({ ok: false, error: latestError.message }, { status: 500 });
  }

  const nextVersion = (latest?.token_version ?? 0) + 1;

  const { error } = await supabaseAdmin.from("club_settings").insert({
    token_hash: tokenHash,
    token_value: token,
    token_version: nextVersion,
    rotated_at: new Date().toISOString()
  });

  if (isMissingTokenValueColumnError(error)) {
    const { error: fallbackError } = await supabaseAdmin.from("club_settings").insert({
      token_hash: tokenHash,
      token_version: nextVersion,
      rotated_at: new Date().toISOString()
    });
    if (fallbackError) {
      return NextResponse.json({ ok: false, error: fallbackError.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      token,
      warningCode: "token_value_not_persisted",
      warningMessage: warningMessageForCode("token_value_not_persisted")
    });
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token });
}
