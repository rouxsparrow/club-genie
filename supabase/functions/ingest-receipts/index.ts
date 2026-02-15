import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isAutomationSecretValid } from "../_shared/automation-auth.ts";
import {
  aggregateReceiptsForSessionDate,
  ingestionDefaults,
  parseReceipt,
  parseSessionDate
} from "../_shared/ingestion-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, x-automation-secret, content-type"
};

type ParsedCourtRow = {
  courtLabel: string;
  startTime: string;
  endTime: string;
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

async function getAutomationTimezone(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("automation_settings")
    .select("timezone")
    .eq("id", 1)
    .maybeSingle();

  if (typeof data?.timezone === "string" && data.timezone.trim()) {
    return data.timezone;
  }

  return ingestionDefaults.timezone;
}

async function requireIngestionAuth(req: Request) {
  const providedAutomationSecret = req.headers.get("x-automation-secret")?.trim() ?? null;
  const expectedAutomationSecret = Deno.env.get("AUTOMATION_SECRET");

  if (isAutomationSecretValid(expectedAutomationSecret, providedAutomationSecret)) {
    return true;
  }
  return false;
}

function toCourtJson(courts: ParsedCourtRow[]) {
  return courts.map((court) => ({
    court_label: court.courtLabel,
    start_time: court.startTime,
    end_time: court.endTime
  }));
}

async function recomputeSessionForDate(supabase: ReturnType<typeof createClient>, sessionDate: string) {
  const { data: receipts, error: receiptsError } = await supabase
    .from("email_receipts")
    .select("parsed_total_fee, parsed_courts, parsed_location")
    .eq("parse_status", "SUCCESS")
    .eq("parsed_session_date", sessionDate);

  if (receiptsError) {
    throw new Error("receipt_aggregation_failed");
  }

  const aggregate = aggregateReceiptsForSessionDate(receipts ?? []);
  if (!aggregate) {
    throw new Error("invalid_receipt_aggregate");
  }

  const { data: existing } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("session_date", sessionDate)
    .maybeSingle();

  const nextStatus = existing?.status === "CLOSED" ? "CLOSED" : "OPEN";

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .upsert(
      {
        session_date: sessionDate,
        status: nextStatus,
        start_time: aggregate.startTime,
        end_time: aggregate.endTime,
        total_fee: aggregate.totalFee,
        location: aggregate.location,
        updated_at: new Date().toISOString()
      },
      { onConflict: "session_date" }
    )
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error("session_upsert_failed");
  }

  const { error: deleteCourtsError } = await supabase.from("courts").delete().eq("session_id", session.id);
  if (deleteCourtsError) {
    throw new Error("court_delete_failed");
  }

  const rows = aggregate.courts.map((court) => ({
    session_id: session.id,
    court_label: court.courtLabel,
    start_time: court.startTime,
    end_time: court.endTime
  }));

  if (rows.length > 0) {
    const { error: insertCourtsError } = await supabase.from("courts").insert(rows);
    if (insertCourtsError) {
      throw new Error("court_insert_failed");
    }
  }

  return session.id;
}

function normalizeLocation(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function hasLocationConflict(
  supabase: ReturnType<typeof createClient>,
  sessionDate: string,
  location: string
) {
  const { data, error } = await supabase
    .from("email_receipts")
    .select("parsed_location")
    .eq("parse_status", "SUCCESS")
    .eq("parsed_session_date", sessionDate);

  if (error) {
    throw new Error("location_consistency_check_failed");
  }

  const incomingLocation = normalizeLocation(location);
  for (const receipt of data ?? []) {
    if (typeof receipt.parsed_location !== "string") continue;
    const existingLocation = normalizeLocation(receipt.parsed_location);
    if (existingLocation && existingLocation !== incomingLocation) {
      return true;
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false, error: "missing_supabase_service_role" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const authorized = await requireIngestionAuth(req);
  if (!authorized) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body = await req.json().catch(() => null);
  const rawHtml = typeof body?.rawHtml === "string" ? body.rawHtml : "";
  const rawText = typeof body?.rawText === "string" ? body.rawText : null;
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const timezone =
    typeof body?.timezone === "string" && body.timezone.trim() ? body.timezone : await getAutomationTimezone(supabase);

  if (!messageId || (!rawHtml && !rawText)) {
    return new Response(JSON.stringify({ ok: false, error: "Missing messageId or receipt body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: existingReceipt } = await supabase
    .from("email_receipts")
    .select("id")
    .eq("gmail_message_id", messageId)
    .maybeSingle();

  if (existingReceipt) {
    return new Response(JSON.stringify({ ok: true, deduped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const persistedRawBody = rawHtml || rawText || "";

  let parsed: ReturnType<typeof parseReceipt> | null = null;
  try {
    parsed = parseReceipt(rawHtml, rawText, timezone);
  } catch (error) {
    const parseError = error instanceof Error ? error.message : "parse_failed";
    const sessionDate = parseSessionDate(`${rawHtml}\n${rawText ?? ""}`);

    await supabase.from("email_receipts").insert({
      gmail_message_id: messageId,
      received_at: new Date().toISOString(),
      raw_html: persistedRawBody,
      parse_status: "FAILED",
      parse_error: parseError,
      parsed_session_date: sessionDate,
      parsed_total_fee: null,
      parsed_courts: null,
      parsed_location: null
    });

    if (sessionDate) {
      await supabase
        .from("sessions")
        .upsert(
          {
            session_date: sessionDate,
            status: "DRAFT",
            updated_at: new Date().toISOString()
          },
          { onConflict: "session_date" }
        );
    }

    return new Response(JSON.stringify({ ok: false, error: "parse_failed" }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const locationConflict = await hasLocationConflict(supabase, parsed.sessionDate, parsed.location);
  if (locationConflict) {
    await supabase.from("email_receipts").insert({
      gmail_message_id: messageId,
      received_at: new Date().toISOString(),
      raw_html: persistedRawBody,
      parse_status: "FAILED",
      parse_error: "location_conflict",
      parsed_session_date: parsed.sessionDate,
      parsed_total_fee: null,
      parsed_courts: null,
      parsed_location: parsed.location
    });

    await supabase
      .from("sessions")
      .upsert(
        {
          session_date: parsed.sessionDate,
          status: "DRAFT",
          updated_at: new Date().toISOString()
        },
        { onConflict: "session_date" }
      );

    return new Response(JSON.stringify({ ok: false, error: "parse_failed", reason: "location_conflict" }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { error: insertReceiptError } = await supabase.from("email_receipts").insert({
    gmail_message_id: messageId,
    received_at: new Date().toISOString(),
    raw_html: persistedRawBody,
    parse_status: "SUCCESS",
    parsed_session_date: parsed.sessionDate,
    parsed_total_fee: parsed.totalFee,
    parsed_courts: toCourtJson(parsed.courts),
    parsed_location: parsed.location
  });

  if (insertReceiptError) {
    return new Response(JSON.stringify({ ok: false, error: "receipt_insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const sessionId = await recomputeSessionForDate(supabase, parsed.sessionDate);

    return new Response(JSON.stringify({ ok: true, sessionId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "session_recompute_failed";
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
