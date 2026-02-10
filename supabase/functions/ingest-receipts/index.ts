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

type ParsedReceipt = {
  messageId: string;
  sessionDate: string;
  courts: Array<{
    courtLabel?: string;
    startTime: string;
    endTime: string;
  }>;
  totalFee: number;
};

function parseSessionDate(raw: string) {
  const match = raw.match(/Session Date:\s*(\d{4}-\d{2}-\d{2})/i);
  return match?.[1] ?? null;
}

function parseTotalFee(raw: string) {
  const match = raw.match(/Total Fee:\s*([0-9]+(?:\.[0-9]{2})?)/i);
  if (!match) return null;
  return Number(match[1]);
}

function parseCourts(raw: string, sessionDate: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  const courts: ParsedReceipt["courts"] = [];

  for (const line of lines) {
    const match = line.match(/Court\s*([A-Za-z0-9]+)\s*\|\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
    if (!match) continue;
    const label = `Court ${match[1]}`;
    const start = `${sessionDate}T${match[2]}:00Z`;
    const end = `${sessionDate}T${match[3]}:00Z`;
    courts.push({ courtLabel: label, startTime: start, endTime: end });
  }

  return courts;
}

function parseReceipt(rawHtml: string, rawText?: string | null): ParsedReceipt {
  const raw = [rawHtml, rawText].filter(Boolean).join("\n");
  const sessionDate = parseSessionDate(raw);
  const totalFee = parseTotalFee(raw);

  if (!sessionDate) {
    throw new Error("missing_session_date");
  }

  if (totalFee === null || Number.isNaN(totalFee) || totalFee <= 0) {
    throw new Error("invalid_total_fee");
  }

  const courts = parseCourts(raw, sessionDate);
  if (courts.length === 0) {
    throw new Error("missing_courts");
  }

  return {
    messageId: "",
    sessionDate,
    courts,
    totalFee
  };
}

function deriveSessionWindow(courts: ParsedReceipt["courts"]) {
  const starts = courts.map((court) => new Date(court.startTime).getTime());
  const ends = courts.map((court) => new Date(court.endTime).getTime());
  return {
    startTime: new Date(Math.min(...starts)).toISOString(),
    endTime: new Date(Math.max(...ends)).toISOString()
  };
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

  const body = await req.json().catch(() => null);
  const rawHtml = body?.rawHtml;
  const rawText = body?.rawText ?? null;
  const messageId = body?.messageId;

  if (!rawHtml || !messageId) {
    return new Response(JSON.stringify({ ok: false, error: "Missing messageId or rawHtml" }), {
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

  let parsed: ParsedReceipt | null = null;
  let parseError: string | null = null;
  let sessionDate: string | null = null;

  try {
    parsed = parseReceipt(rawHtml, rawText);
    sessionDate = parsed.sessionDate;
  } catch (error) {
    parseError = error instanceof Error ? error.message : "parse_failed";
    sessionDate = parseSessionDate(rawHtml) ?? parseSessionDate(rawText ?? "");
  }

  if (!parsed) {
    await supabase.from("email_receipts").insert({
      gmail_message_id: messageId,
      received_at: new Date().toISOString(),
      raw_html: rawHtml,
      parse_status: "FAILED",
      parse_error: parseError ?? "parse_failed"
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

    console.log("admin_notification_stub", { messageId, parseError, sessionDate });

    return new Response(JSON.stringify({ ok: false, error: "parse_failed" }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { startTime, endTime } = deriveSessionWindow(parsed.courts);

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .upsert(
      {
        session_date: parsed.sessionDate,
        status: "OPEN",
        start_time: startTime,
        end_time: endTime,
        total_fee: parsed.totalFee,
        updated_at: new Date().toISOString()
      },
      { onConflict: "session_date" }
    )
    .select("id")
    .single();

  if (sessionError || !session) {
    return new Response(JSON.stringify({ ok: false, error: "session_upsert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const courtRows = parsed.courts.map((court) => ({
    session_id: session.id,
    court_label: court.courtLabel ?? null,
    start_time: court.startTime,
    end_time: court.endTime
  }));

  if (courtRows.length > 0) {
    const { error: courtError } = await supabase.from("courts").insert(courtRows);
    if (courtError) {
      return new Response(JSON.stringify({ ok: false, error: "court_insert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  await supabase.from("email_receipts").insert({
    gmail_message_id: messageId,
    received_at: new Date().toISOString(),
    raw_html: rawHtml,
    parse_status: "SUCCESS"
  });

  return new Response(JSON.stringify({ ok: true, sessionId: session.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
