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

  if (!sessionId || typeof sessionId !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Missing sessionId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, club_id, session_date, status, start_time, end_time, total_fee, location, remarks, splitwise_status, payer_player_id, guest_count")
    .eq("id", sessionId)
    .eq("club_id", resolved.clubId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, court_label, start_time, end_time")
    .eq("session_id", sessionId)
    .order("start_time", { ascending: true });

  if (courtsError) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, session, courts: courts ?? [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
