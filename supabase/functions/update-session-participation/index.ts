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

function parseGuestCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 20) return null;
  return parsed;
}

function parsePlayerIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const unique = new Set<string>();
  for (const rawId of value) {
    if (typeof rawId !== "string") continue;
    const id = rawId.trim();
    if (!id) continue;
    unique.add(id);
  }
  return Array.from(unique);
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
    return new Response(JSON.stringify({ ok: false, error: "missing_supabase_service_role" }), {
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

  const body = (await req.json().catch(() => null)) as {
    sessionId?: unknown;
    playerIds?: unknown;
    guestCount?: unknown;
  } | null;

  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const playerIds = parsePlayerIds(body?.playerIds);
  const guestCount = parseGuestCount(body?.guestCount);

  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_session_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!playerIds) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_players" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (guestCount === null) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_guest_count" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id,status")
    .eq("id", sessionId)
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

  if (playerIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("active", true)
      .in("id", playerIds);

    if (playersError) {
      return new Response(JSON.stringify({ ok: false, error: "players_lookup_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const foundIds = new Set((players ?? []).map((player) => player.id));
    if (foundIds.size !== playerIds.length) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_players" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  const { data: existingParticipants, error: existingError } = await supabase
    .from("session_participants")
    .select("player_id")
    .eq("session_id", sessionId);

  if (existingError) {
    return new Response(JSON.stringify({ ok: false, error: "participants_lookup_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const selectedSet = new Set(playerIds);
  const toDelete = (existingParticipants ?? [])
    .map((row) => row.player_id)
    .filter((playerId) => !selectedSet.has(playerId));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("session_participants")
      .delete()
      .eq("session_id", sessionId)
      .in("player_id", toDelete);

    if (deleteError) {
      return new Response(JSON.stringify({ ok: false, error: "update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  if (playerIds.length > 0) {
    const rows = playerIds.map((playerId) => ({ session_id: sessionId, player_id: playerId }));
    const { error: upsertError } = await supabase
      .from("session_participants")
      .upsert(rows, { onConflict: "session_id,player_id" });

    if (upsertError) {
      return new Response(JSON.stringify({ ok: false, error: "update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  const { error: guestUpdateError } = await supabase
    .from("sessions")
    .update({ guest_count: guestCount, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (guestUpdateError) {
    return new Response(JSON.stringify({ ok: false, error: "guest_update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const participantSelectCandidates = [
    "session_id, player:players(id, name, avatar_path)",
    "session_id, player:players(id, name)"
  ] as const;

  let participantsQuery = await supabase
    .from("session_participants")
    .select(participantSelectCandidates[0])
    .eq("session_id", sessionId);

  for (let i = 1; i < participantSelectCandidates.length && participantsQuery.error; i += 1) {
    const message = participantsQuery.error.message ?? "";
    if (!message.includes("avatar_path")) break;
    participantsQuery = await supabase
      .from("session_participants")
      .select(participantSelectCandidates[i])
      .eq("session_id", sessionId);
  }

  if (participantsQuery.error) {
    return new Response(JSON.stringify({ ok: false, error: "participants_lookup_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
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
      sessionId,
      guestCount,
      participants
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
});

