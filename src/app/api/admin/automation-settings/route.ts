import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

function normalizeKeywords(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];

  const keywords = [...new Set(raw.map((entry) => String(entry).trim()).filter(Boolean))];
  return keywords;
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("automation_settings")
    .select("id,subject_keywords,timezone,enabled,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    settings: data ?? {
      id: 1,
      subject_keywords: ["Playtomic", "Receipt"],
      timezone: "Asia/Singapore",
      enabled: true,
      updated_at: null
    }
  });
}

export async function PATCH(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json()) as { subjectKeywords?: unknown; enabled?: unknown };

  const updates: Record<string, unknown> = {};
  if (payload.subjectKeywords !== undefined) {
    const keywords = normalizeKeywords(payload.subjectKeywords);
    if (keywords.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one subject keyword is required." }, { status: 400 });
    }
    updates.subject_keywords = keywords;
  }
  if (payload.enabled !== undefined) {
    if (typeof payload.enabled !== "boolean") {
      return NextResponse.json({ ok: false, error: "enabled must be boolean." }, { status: 400 });
    }
    updates.enabled = payload.enabled;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });
  }

  updates.id = 1;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("automation_settings")
    .upsert(updates, { onConflict: "id" })
    .select("id,subject_keywords,timezone,enabled,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: data });
}
