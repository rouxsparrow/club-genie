import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

function normalizeName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length > 0 ? name : null;
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("clubs").select("id,name,created_at,updated_at").order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, clubs: data ?? [] });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = normalizeName(payload?.name);
  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clubs")
    .insert({ name, updated_at: new Date().toISOString() })
    .select("id,name,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Ensure per-club splitwise settings row exists.
  await supabaseAdmin.from("club_splitwise_settings").upsert({ club_id: data.id }, { onConflict: "club_id" });

  return NextResponse.json({ ok: true, club: data });
}

