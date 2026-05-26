import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { resolveClubFromToken } from "../_shared/club-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, content-type"
};


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

async function validateClubToken(supabase: ReturnType<typeof createClient>, token: string) {
  const resolved = await resolveClubFromToken(supabase, token);
  return resolved.ok ? resolved : null;
}

function formatPlayerList(names: string[]) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
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

  const resolved = await validateClubToken(supabase, token);
  if (!resolved) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body = await req.json().catch(() => null);
  const sessionId = body?.sessionId;
  const playerIds = body?.playerIds;

  if (!sessionId || !Array.isArray(playerIds) || playerIds.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "Missing sessionId or playerIds" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("club_id", resolved.clubId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response(JSON.stringify({ ok: false, error: "session_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (session.status !== "OPEN") {
    return new Response(JSON.stringify({ ok: false, error: "session_not_open" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name")
    .in("id", playerIds);

  if (playersError) {
    return new Response(JSON.stringify({ ok: false, error: "players_lookup_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const playerById = new Map((players ?? []).map((player) => [player.id, player.name ?? player.id]));

  const { data: existingRows, error: existingError } = await supabase
    .from("session_participants")
    .select("player_id")
    .eq("session_id", sessionId)
    .in("player_id", playerIds);

  if (existingError) {
    return new Response(JSON.stringify({ ok: false, error: "participants_lookup_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const joinedIdSet = new Set((existingRows ?? []).map((row) => row.player_id));
  const notJoinedNames = playerIds
    .filter((playerId) => !joinedIdSet.has(playerId))
    .map((playerId) => playerById.get(playerId) ?? playerId);

  if (notJoinedNames.length > 0) {
    const namesText = formatPlayerList(notJoinedNames);
    const subject = notJoinedNames.length > 1 ? "Players" : "Player";
    const suffix = notJoinedNames.length > 1 ? "have" : "has";
    return new Response(
      JSON.stringify({ ok: false, error: `${subject} ${namesText} ${suffix} not joined this session.` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  const { error: deleteError } = await supabase
    .from("session_participants")
    .delete()
    .eq("session_id", sessionId)
    .in("player_id", playerIds);

  if (deleteError) {
    return new Response(JSON.stringify({ ok: false, error: "withdraw_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
