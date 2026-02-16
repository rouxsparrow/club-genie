import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json()) as {
    name?: string;
    active?: boolean;
    splitwiseUserId?: unknown;
    isDefaultPayer?: unknown;
  };

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
  if (payload.splitwiseUserId !== undefined) {
    if (payload.splitwiseUserId === null || payload.splitwiseUserId === "") {
      updates.splitwise_user_id = null;
    } else {
      const raw = typeof payload.splitwiseUserId === "string" ? payload.splitwiseUserId.trim() : payload.splitwiseUserId;
      const parsed = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json({ ok: false, error: "splitwiseUserId must be a positive integer or null." }, { status: 400 });
      }
      updates.splitwise_user_id = parsed;
    }
  }

  if (payload.isDefaultPayer !== undefined) {
    if (typeof payload.isDefaultPayer !== "boolean") {
      return NextResponse.json({ ok: false, error: "isDefaultPayer must be boolean." }, { status: 400 });
    }

    // Enforce "at most one default payer" and keep UX simple.
    if (payload.isDefaultPayer) {
      const { error: clearError } = await supabaseAdmin.from("players").update({ is_default_payer: false }).eq("is_default_payer", true);
      if (clearError) {
        return NextResponse.json({ ok: false, error: clearError.message }, { status: 500 });
      }
      updates.is_default_payer = true;
    } else {
      updates.is_default_payer = false;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .update(updates)
    .eq("id", id)
    .select("id,name,active,splitwise_user_id,is_default_payer")
    .single();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("splitwise_user_id") || message.includes("is_default_payer")) {
      return NextResponse.json({ ok: false, error: "Player Splitwise columns missing; apply migration 20260215230000." }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: data });
}
