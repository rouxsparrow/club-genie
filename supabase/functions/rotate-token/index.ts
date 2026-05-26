import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { resolveClubFromToken, sha256Hex } from "../_shared/club-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, content-type"
};

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const resolved = await resolveClubFromToken(supabase, token);
  if (!resolved.ok) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const newToken = generateToken();
  const newHash = await sha256Hex(newToken);

  const { data: latest, error: latestError } = await supabase
    .from("club_tokens")
    .select("token_version")
    .eq("club_id", resolved.clubId)
    .eq("is_current", true)
    .limit(1)
    .maybeSingle();

  const nextVersion = (latestError ? 0 : (latest?.token_version ?? 0)) + 1;

  await supabase.from("club_tokens").update({ is_current: false }).eq("club_id", resolved.clubId).eq("is_current", true);

  const { error: insertError } = await supabase.from("club_tokens").insert({
    club_id: resolved.clubId,
    token_hash: newHash,
    token_version: nextVersion,
    token_value: newToken,
    is_current: true,
    rotated_at: new Date().toISOString()
  });

  if (insertError) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, token: newToken }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
