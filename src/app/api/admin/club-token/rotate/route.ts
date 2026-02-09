import crypto from "crypto";
import { NextResponse } from "next/server";
import { sha256Hex } from "../../../../../lib/crypto";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function POST() {
  const supabaseAdmin = getSupabaseAdmin();
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256Hex(token);

  const { error } = await supabaseAdmin.from("club_settings").insert({
    token_hash: tokenHash,
    rotated_at: new Date().toISOString()
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token });
}
