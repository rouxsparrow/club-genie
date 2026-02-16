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
    "id, name, active, avatar_path",
    "id, name, active"
  ] as const;

  let query = await supabase.from("players").select(selectCandidates[0]).eq("active", true).order("name", { ascending: true });
  for (let i = 1; i < selectCandidates.length && query.error; i += 1) {
    const message = query.error.message ?? "";
    if (!message.includes("avatar_path")) break;
    query = await supabase.from("players").select(selectCandidates[i]).eq("active", true).order("name", { ascending: true });
  }

  if (query.error) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const players = (query.data ?? []).map((player) => ({
    ...player,
    avatar_url:
      "avatar_path" in player
        ? avatarPathToPublicUrl(
            supabaseUrl,
            typeof player.avatar_path === "string" && player.avatar_path.trim() ? player.avatar_path : null
          )
        : null
  }));

  return new Response(JSON.stringify({ ok: true, players: players ?? [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
