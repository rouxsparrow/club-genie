import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { avatarPathToPublicUrl } from "../../../../../lib/player-avatar";

function normalizePlayerRow(row: unknown) {
  const record = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<string, unknown>;
  const avatarPath = typeof record.avatar_path === "string" && record.avatar_path.trim() ? record.avatar_path : null;
  return {
    ...record,
    splitwise_user_id: typeof record.splitwise_user_id === "number" ? record.splitwise_user_id : null,
    is_default_payer: typeof record.is_default_payer === "boolean" ? record.is_default_payer : false,
    avatar_path: avatarPath,
    avatar_url: avatarPathToPublicUrl(process.env.SUPABASE_URL, avatarPath)
  };
}

async function fetchPlayerById(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const selectCandidates = [
    "id,name,active,splitwise_user_id,is_default_payer,avatar_path",
    "id,name,active,splitwise_user_id,is_default_payer",
    "id,name,active,avatar_path",
    "id,name,active"
  ] as const;

  let query = await supabaseAdmin.from("players").select(selectCandidates[0] as string).eq("id", id).maybeSingle();
  for (let i = 1; i < selectCandidates.length && query.error; i += 1) {
    const message = query.error.message ?? "";
    if (!message.includes("splitwise_user_id") && !message.includes("is_default_payer") && !message.includes("avatar_path")) {
      break;
    }
    query = await supabaseAdmin.from("players").select(selectCandidates[i] as string).eq("id", id).maybeSingle();
  }

  return query;
}

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

  const { error } = await supabaseAdmin
    .from("players")
    .update(updates)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("splitwise_user_id") || message.includes("is_default_payer") || message.includes("avatar_path")) {
      return NextResponse.json(
        { ok: false, error: "Player columns missing; apply migrations 20260215230000 and 20260216170000." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const fetched = await fetchPlayerById(supabaseAdmin, id);
  if (fetched.error) {
    return NextResponse.json({ ok: false, error: fetched.error.message }, { status: 500 });
  }
  if (!fetched.data) {
    return NextResponse.json({ ok: false, error: "player_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, player: normalizePlayerRow(fetched.data) });
}
