import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { avatarPathToPublicUrl } from "../../../../lib/player-avatar";

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

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const selectCandidates = [
    "id,name,active,splitwise_user_id,is_default_payer,avatar_path",
    "id,name,active,splitwise_user_id,is_default_payer",
    "id,name,active,avatar_path",
    "id,name,active"
  ] as const;

  let query = await supabaseAdmin.from("players").select(selectCandidates[0] as string).order("name", { ascending: true });
  for (let i = 1; i < selectCandidates.length && query.error; i += 1) {
    const message = query.error.message ?? "";
    if (!message.includes("splitwise_user_id") && !message.includes("is_default_payer") && !message.includes("avatar_path")) {
      break;
    }
    query = await supabaseAdmin.from("players").select(selectCandidates[i] as string).order("name", { ascending: true });
  }

  const data = query.data as unknown[] | null;
  const error = query.error;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const players = (data ?? []).map((row) => normalizePlayerRow(row));

  return NextResponse.json({ ok: true, players });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json()) as { name?: string };
  const name = payload.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .insert({ name })
    .select("id,name,active,splitwise_user_id,is_default_payer,avatar_path")
    .single();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("splitwise_user_id") || message.includes("is_default_payer") || message.includes("avatar_path")) {
      const fallback = await supabaseAdmin.from("players").insert({ name }).select("id,name,active").single();
      if (fallback.error) {
        return NextResponse.json({ ok: false, error: fallback.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, player: normalizePlayerRow(fallback.data) });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: normalizePlayerRow(data) });
}
