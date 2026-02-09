import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json()) as { name?: string; active?: boolean };

  const updates: Record<string, unknown> = {};
  if (typeof payload.name === "string") {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ ok: false, error: "Name cannot be empty." }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if (typeof payload.active === "boolean") {
    updates.active = payload.active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .update(updates)
    .eq("id", id)
    .select("id,name,active")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: data });
}
