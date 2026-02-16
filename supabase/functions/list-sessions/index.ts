import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, content-type"
};

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hashToken(token: string) {
  const data = encoder.encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

async function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

function avatarPathToPublicUrl(supabaseUrl: string | undefined, avatarPath: string | null | undefined) {
  if (!supabaseUrl || !avatarPath) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  const encodedPath = avatarPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/storage/v1/object/public/player-avatars/${encodedPath}`;
}

async function validateClubToken(supabase: ReturnType<typeof createClient>, token: string) {
  const { data, error } = await supabase
    .from("club_settings")
    .select("token_hash")
    .order("token_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.token_hash) {
    return false;
  }

  const incomingHash = await hashToken(token);
  return timingSafeEqual(incomingHash, data.token_hash);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = req.headers.get("x-club-token")?.trim();
  if (!token) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const valid = await validateClubToken(supabase, token);
  if (!valid) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const selectCandidates = [
    "id, session_date, status, splitwise_status, payer_player_id, guest_count, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, splitwise_status, payer_player_id, guest_count, start_time, end_time, total_fee, remarks",
    "id, session_date, status, splitwise_status, payer_player_id, guest_count, start_time, end_time, total_fee, location",
    "id, session_date, status, splitwise_status, payer_player_id, guest_count, start_time, end_time, total_fee",
    "id, session_date, status, splitwise_status, guest_count, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, splitwise_status, guest_count, start_time, end_time, total_fee, remarks",
    "id, session_date, status, splitwise_status, guest_count, start_time, end_time, total_fee, location",
    "id, session_date, status, splitwise_status, guest_count, start_time, end_time, total_fee",
    "id, session_date, status, payer_player_id, guest_count, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, payer_player_id, guest_count, start_time, end_time, total_fee, remarks",
    "id, session_date, status, payer_player_id, guest_count, start_time, end_time, total_fee, location",
    "id, session_date, status, payer_player_id, guest_count, start_time, end_time, total_fee",
    "id, session_date, status, guest_count, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, guest_count, start_time, end_time, total_fee, remarks",
    "id, session_date, status, guest_count, start_time, end_time, total_fee, location",
    "id, session_date, status, guest_count, start_time, end_time, total_fee",
    "id, session_date, status, splitwise_status, payer_player_id, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, splitwise_status, payer_player_id, start_time, end_time, total_fee, remarks",
    "id, session_date, status, splitwise_status, payer_player_id, start_time, end_time, total_fee, location",
    "id, session_date, status, splitwise_status, payer_player_id, start_time, end_time, total_fee",
    "id, session_date, status, splitwise_status, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, splitwise_status, start_time, end_time, total_fee, remarks",
    "id, session_date, status, splitwise_status, start_time, end_time, total_fee, location",
    "id, session_date, status, splitwise_status, start_time, end_time, total_fee",
    "id, session_date, status, payer_player_id, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, payer_player_id, start_time, end_time, total_fee, remarks",
    "id, session_date, status, payer_player_id, start_time, end_time, total_fee, location",
    "id, session_date, status, payer_player_id, start_time, end_time, total_fee",
    "id, session_date, status, start_time, end_time, total_fee, location, remarks",
    "id, session_date, status, start_time, end_time, total_fee, remarks",
    "id, session_date, status, start_time, end_time, total_fee, location",
    "id, session_date, status, start_time, end_time, total_fee"
  ] as const;

  let sessionsQuery = await supabase.from("sessions").select(selectCandidates[0]).order("session_date", { ascending: true });
  for (let i = 1; i < selectCandidates.length && sessionsQuery.error; i += 1) {
    const message = sessionsQuery.error.message ?? "";
    if (
      !message.includes("location") &&
      !message.includes("remarks") &&
      !message.includes("splitwise_status") &&
      !message.includes("payer_player_id") &&
      !message.includes("guest_count")
    ) {
      break;
    }
    sessionsQuery = await supabase.from("sessions").select(selectCandidates[i]).order("session_date", { ascending: true });
  }

  const sessions = (sessionsQuery.data ?? []).map((session) => ({
    ...session,
    location: "location" in session ? session.location : null,
    remarks: "remarks" in session ? session.remarks : null,
    splitwise_status: "splitwise_status" in session ? session.splitwise_status : null,
    payer_player_id: "payer_player_id" in session ? session.payer_player_id : null,
    guest_count: "guest_count" in session && typeof session.guest_count === "number" ? session.guest_count : 0
  }));

  if (sessionsQuery.error) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: courts } = await supabase
    .from("courts")
    .select("id, session_id, court_label, start_time, end_time")
    .in("session_id", sessionIds.length > 0 ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

  const participantSessionIds = sessionIds.length > 0 ? sessionIds : ["00000000-0000-0000-0000-000000000000"];
  const participantSelectCandidates = [
    "session_id, player:players(id, name, avatar_path)",
    "session_id, player:players(id, name)"
  ] as const;
  let participantsQuery = await supabase
    .from("session_participants")
    .select(participantSelectCandidates[0])
    .in("session_id", participantSessionIds);
  for (let i = 1; i < participantSelectCandidates.length && participantsQuery.error; i += 1) {
    const message = participantsQuery.error.message ?? "";
    if (!message.includes("avatar_path")) break;
    participantsQuery = await supabase
      .from("session_participants")
      .select(participantSelectCandidates[i])
      .in("session_id", participantSessionIds);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const participants = (participantsQuery.data ?? []).map((entry) => {
    const player = entry.player as { id?: string; name?: string; avatar_path?: string | null } | null;
    if (!player || typeof player.id !== "string" || typeof player.name !== "string") {
      return { session_id: entry.session_id, player: null };
    }
    const avatarPath = typeof player.avatar_path === "string" && player.avatar_path.trim() ? player.avatar_path : null;
    return {
      session_id: entry.session_id,
      player: {
        id: player.id,
        name: player.name,
        avatar_url: avatarPathToPublicUrl(supabaseUrl, avatarPath)
      }
    };
  });

  return new Response(
    JSON.stringify({
      ok: true,
      sessions: sessions ?? [],
      courts: courts ?? [],
      participants: participants ?? []
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
});
