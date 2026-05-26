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
  const resolved = await resolveClubFromToken(supabase, token);
  return resolved.ok ? resolved : null;
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

  const selectCandidates = [
    "active, player:players(id, name, avatar_path)",
    "active, player:players(id, name)"
  ] as const;

  let query = await supabase
    .from("club_players")
    .select(selectCandidates[0])
    .eq("club_id", resolved.clubId)
    .eq("active", true);
  for (let i = 1; i < selectCandidates.length && query.error; i += 1) {
    const message = query.error.message ?? "";
    if (!message.includes("avatar_path")) break;
    query = await supabase
      .from("club_players")
      .select(selectCandidates[i])
      .eq("club_id", resolved.clubId)
      .eq("active", true);
  }

  if (query.error) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const players = (query.data ?? [])
    .map((row) => {
      const record = row as { player?: { id?: string; name?: string; avatar_path?: string | null } | null } | null;
      const player = record?.player ?? null;
      if (!player || typeof player.id !== "string" || typeof player.name !== "string") return null;
      const avatarPath = typeof player.avatar_path === "string" && player.avatar_path.trim() ? player.avatar_path : null;
      return {
        id: player.id,
        name: player.name,
        active: true,
        avatar_url: avatarPathToPublicUrl(supabaseUrl, avatarPath)
      };
    })
    .filter((p): p is { id: string; name: string; active: boolean; avatar_url: string | null } => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));

  return new Response(JSON.stringify({ ok: true, players: players ?? [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
