import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../lib/supabase/admin";
import { avatarPathToPublicUrl } from "../../../../../../lib/player-avatar";

function normalizeSplitwiseUserId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const raw = typeof value === "string" ? value.trim() : value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeMemberRow(row: unknown) {
  const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const player = (record.player && typeof record.player === "object" ? (record.player as Record<string, unknown>) : {}) as Record<string, unknown>;
  const avatarPath = typeof player.avatar_path === "string" && player.avatar_path.trim() ? player.avatar_path : null;
  return {
    player: {
      id: String(player.id ?? ""),
      name: String(player.name ?? ""),
      active: typeof player.active === "boolean" ? player.active : true,
      splitwise_user_id: typeof player.splitwise_user_id === "number" ? player.splitwise_user_id : null,
      avatar_path: avatarPath,
      avatar_url: avatarPathToPublicUrl(process.env.SUPABASE_URL, avatarPath),
    },
    membership: {
      active: record.active === true,
      is_default_payer: record.is_default_payer === true,
      shuttlecock_paid: record.shuttlecock_paid === true,
    },
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("club_players")
    .select("active,is_default_payer,shuttlecock_paid,player:players(id,name,active,splitwise_user_id,avatar_path)")
    .eq("club_id", clubId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const members = (data ?? [])
    .map((row) => normalizeMemberRow(row))
    .filter((row) => row.player.id && row.player.name)
    .sort((a, b) => a.player.name.localeCompare(b.player.name));

  return NextResponse.json({ ok: true, members });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await context.params;
  const payload = (await request.json().catch(() => null)) as
    | { playerId?: unknown; name?: unknown; splitwiseUserId?: unknown }
    | null;

  const supabaseAdmin = getSupabaseAdmin();

  const playerId = typeof payload?.playerId === "string" ? payload.playerId.trim() : "";
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const splitwiseRaw = payload?.splitwiseUserId;
  const splitwiseProvided = !(splitwiseRaw === undefined || splitwiseRaw === null || splitwiseRaw === "");
  const splitwiseUserId = normalizeSplitwiseUserId(splitwiseRaw);
  if (splitwiseProvided && splitwiseUserId === null) {
    return NextResponse.json({ ok: false, error: "splitwiseUserId must be a positive integer or null." }, { status: 400 });
  }

  let resolvedPlayerId: string | null = playerId || null;
  if (!resolvedPlayerId) {
    if (!name) return NextResponse.json({ ok: false, error: "Provide playerId or name." }, { status: 400 });
    const created = await supabaseAdmin
      .from("players")
      .insert({ name, ...(splitwiseUserId ? { splitwise_user_id: splitwiseUserId } : {}) })
      .select("id")
      .maybeSingle();
    if (created.error || !created.data?.id) {
      const message = created.error?.message ?? "";
      const code = (created.error as unknown as { code?: string } | null)?.code ?? "";
      if (code === "23505" || message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        return NextResponse.json({ ok: false, error: "Player name already exists." }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: created.error?.message ?? "player_create_failed" }, { status: 500 });
    }
    resolvedPlayerId = created.data.id as string;
  }

  const { error: memberError } = await supabaseAdmin.from("club_players").upsert(
    {
      club_id: clubId,
      player_id: resolvedPlayerId,
      active: true,
      is_default_payer: false,
      shuttlecock_paid: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id,player_id" },
  );
  if (memberError) return NextResponse.json({ ok: false, error: memberError.message }, { status: 500 });

  const { data: joined, error: joinedError } = await supabaseAdmin
    .from("club_players")
    .select("active,is_default_payer,shuttlecock_paid,player:players(id,name,active,splitwise_user_id,avatar_path)")
    .eq("club_id", clubId)
    .eq("player_id", resolvedPlayerId)
    .maybeSingle();
  if (joinedError || !joined) {
    return NextResponse.json({ ok: false, error: joinedError?.message ?? "member_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, member: normalizeMemberRow(joined) });
}
