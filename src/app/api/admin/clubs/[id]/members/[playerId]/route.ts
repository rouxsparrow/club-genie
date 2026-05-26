import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../../lib/supabase/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: clubId, playerId } = await context.params;
  const payload = (await request.json().catch(() => null)) as
    | { active?: unknown; isDefaultPayer?: unknown; shuttlecockPaid?: unknown }
    | null;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (payload?.active !== undefined) {
    if (typeof payload.active !== "boolean") return NextResponse.json({ ok: false, error: "active must be boolean." }, { status: 400 });
    updates.active = payload.active;
  }

  if (payload?.shuttlecockPaid !== undefined) {
    if (typeof payload.shuttlecockPaid !== "boolean") {
      return NextResponse.json({ ok: false, error: "shuttlecockPaid must be boolean." }, { status: 400 });
    }
    updates.shuttlecock_paid = payload.shuttlecockPaid;
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (payload?.isDefaultPayer !== undefined) {
    if (typeof payload.isDefaultPayer !== "boolean") {
      return NextResponse.json({ ok: false, error: "isDefaultPayer must be boolean." }, { status: 400 });
    }
    if (payload.isDefaultPayer) {
      const { error: clearError } = await supabaseAdmin
        .from("club_players")
        .update({ is_default_payer: false })
        .eq("club_id", clubId)
        .eq("is_default_payer", true);
      if (clearError) return NextResponse.json({ ok: false, error: clearError.message }, { status: 500 });
      updates.is_default_payer = true;
    } else {
      updates.is_default_payer = false;
    }
  }

  const keys = Object.keys(updates).filter((k) => k !== "updated_at");
  if (keys.length === 0) return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("club_players")
    .update(updates)
    .eq("club_id", clubId)
    .eq("player_id", playerId)
    .select("player_id")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; playerId: string }> }) {
  const { id: clubId, playerId } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("club_players").delete().eq("club_id", clubId).eq("player_id", playerId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

