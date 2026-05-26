import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { avatarPathToPublicUrl } from "../../../../lib/player-avatar";

function normalizePlayerRow(row: unknown) {
  const record = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<string, unknown>;
  const avatarPath = typeof record.avatar_path === "string" && record.avatar_path.trim() ? record.avatar_path : null;
  const memberships = Array.isArray(record.club_players) ? record.club_players : [];
  const clubs = memberships
    .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((entry) => {
      const clubId = typeof entry?.club_id === "string" ? entry.club_id : "";
      const clubObj = entry?.clubs && typeof entry.clubs === "object" ? (entry.clubs as Record<string, unknown>) : null;
      const clubName = typeof clubObj?.name === "string" ? clubObj.name : "";
      if (!clubId || !clubName) return null;
      return { id: clubId, name: clubName };
    })
    .filter((c): c is { id: string; name: string } => Boolean(c));
  return {
    ...record,
    splitwise_user_id: typeof record.splitwise_user_id === "number" ? record.splitwise_user_id : null,
    avatar_path: avatarPath,
    avatar_url: avatarPathToPublicUrl(process.env.SUPABASE_URL, avatarPath),
    clubs
  };
}

export async function GET(_request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const selectCandidates = [
    "id,name,active,splitwise_user_id,avatar_path,club_players(club_id, clubs(name))",
    "id,name,active,splitwise_user_id,club_players(club_id, clubs(name))",
    "id,name,active,avatar_path,club_players(club_id, clubs(name))",
    "id,name,active,club_players(club_id, clubs(name))"
  ] as const;

  let query = await supabaseAdmin.from("players").select(selectCandidates[0] as string).order("name", { ascending: true });
  for (let i = 1; i < selectCandidates.length && query.error; i += 1) {
    const message = query.error.message ?? "";
    if (!message.includes("avatar_path") && !message.includes("splitwise_user_id")) break;
    query = await supabaseAdmin.from("players").select(selectCandidates[i] as string).order("name", { ascending: true });
  }

  if (query.error) {
    return NextResponse.json({ ok: false, error: query.error.message }, { status: 500 });
  }

  const players = (query.data as unknown[] | null ?? []).map((row) => normalizePlayerRow(row));

  return NextResponse.json({ ok: true, players });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json().catch(() => null)) as { name?: unknown; splitwiseUserId?: unknown } | null;
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  const splitwiseUserIdRaw = payload?.splitwiseUserId;
  const splitwiseUserId =
    splitwiseUserIdRaw === null || splitwiseUserIdRaw === undefined || splitwiseUserIdRaw === ""
      ? null
      : typeof splitwiseUserIdRaw === "number"
        ? splitwiseUserIdRaw
        : Number(typeof splitwiseUserIdRaw === "string" ? splitwiseUserIdRaw.trim() : splitwiseUserIdRaw);
  if (splitwiseUserId !== null && (!Number.isInteger(splitwiseUserId) || splitwiseUserId <= 0)) {
    return NextResponse.json({ ok: false, error: "splitwiseUserId must be a positive integer or null." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .insert({ name, ...(splitwiseUserId ? { splitwise_user_id: splitwiseUserId } : {}) })
    .select("id,name,active,splitwise_user_id,avatar_path")
    .single();

  if (error) {
    const code = (error as unknown as { code?: string }).code ?? "";
    const message = error.message ?? "";
    if (code === "23505" || message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
      return NextResponse.json({ ok: false, error: "Player name already exists." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, player: normalizePlayerRow(data) });
}
