import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

function normalizeName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length > 0 ? name : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = normalizeName(payload?.name);
  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,name,created_at,updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "club_not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, club: data });
}

