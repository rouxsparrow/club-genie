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

function parseGuestCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 20) return null;
  return parsed;
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

  const resolved = await validateClubToken(supabase, token);
  if (!resolved) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body = (await req.json().catch(() => null)) as { sessionId?: unknown; guestCount?: unknown } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const guestCount = parseGuestCount(body?.guestCount);

  if (!sessionId || guestCount === null) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_guest_count" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id,status")
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

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ guest_count: guestCount, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (updateError) {
    const message = updateError.message ?? "";
    if (message.includes("guest_count")) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "guest_count_column_missing",
          detail: "Apply migration 20260216190000_session_guests."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    return new Response(JSON.stringify({ ok: false, error: "guest_update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, sessionId, guestCount }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
