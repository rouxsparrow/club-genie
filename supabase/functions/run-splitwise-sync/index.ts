import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isAutomationSecretValid } from "../_shared/automation-auth.ts";
import {
  buildSplitwiseBySharesPayload,
  computeSgtDateWindowLast24h,
  parseMoneyToCents,
  renderDescriptionTemplate
} from "../_shared/splitwise-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-automation-secret, content-type"
};

type SplitwiseSettingsRow = {
  group_id: number | null;
  currency_code: string | null;
  enabled: boolean | null;
  description_template?: string | null;
  date_format?: string | null;
  location_replacements?: unknown;
};

type SessionRow = {
  id: string;
  session_date: string;
  status: string;
  splitwise_status?: string | null;
  payer_player_id?: string | null;
  total_fee?: unknown;
  location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type ExpenseRow = {
  id: string;
  session_id: string;
  status: string | null;
  splitwise_expense_id: string | null;
  updated_at: string | null;
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function isWithinRecentWindow(updatedAtIso: string | null, minutes: number) {
  if (!updatedAtIso) return false;
  const ts = new Date(updatedAtIso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < minutes * 60 * 1000;
}

function computeExpenseDateIso() {
  // Use API runtime "now" as requested for Splitwise expense date.
  return new Date().toISOString();
}

async function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

async function requireAutomationSecret(req: Request) {
  const provided = req.headers.get("x-automation-secret")?.trim() ?? null;
  const expected = Deno.env.get("AUTOMATION_SECRET");
  return isAutomationSecretValid(expected, provided) ? (provided as string) : null;
}

async function loadSplitwiseSettings(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("splitwise_settings")
    .select("group_id,currency_code,enabled,description_template,date_format,location_replacements")
    .eq("id", 1)
    .maybeSingle();

  const row = (data ?? null) as SplitwiseSettingsRow | null;
  const locationReplacementsRaw = row?.location_replacements;
  const locationReplacements =
    Array.isArray(locationReplacementsRaw) ?
      locationReplacementsRaw
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const record = entry as Record<string, unknown>;
          const from = typeof record.from === "string" ? record.from.trim() : "";
          const to = typeof record.to === "string" ? record.to.trim() : "";
          if (!from || !to) return null;
          return { from, to };
        })
        .filter((v): v is { from: string; to: string } => Boolean(v))
    : [];
  return {
    enabled: typeof row?.enabled === "boolean" ? row.enabled : true,
    groupId: typeof row?.group_id === "number" ? row.group_id : 0,
    currencyCode: typeof row?.currency_code === "string" && row.currency_code.trim() ? row.currency_code.trim() : "SGD",
    descriptionTemplate:
      typeof row?.description_template === "string" && row.description_template.trim()
        ? row.description_template.trim()
        : "Badminton {session_date} - {location}",
    dateFormat:
      typeof row?.date_format === "string" && row.date_format.trim()
        ? row.date_format.trim()
        : "DD/MM/YY",
    locationReplacements
  };
}

async function loadDefaultPayer(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("players")
    .select("id, splitwise_user_id")
    .eq("is_default_payer", true)
    .limit(2);

  if (error) throw new Error("payer_lookup_failed");
  const rows = (data ?? []) as Array<{ id: string; splitwise_user_id: number | null }>;
  if (rows.length === 0) return { ok: false as const, error: "missing_default_payer" };
  if (rows.length > 1) return { ok: false as const, error: "multiple_default_payers" };
  const payer = rows[0];
  if (typeof payer.splitwise_user_id !== "number") return { ok: false as const, error: "payer_missing_splitwise_user_id" };
  return { ok: true as const, playerId: payer.id, splitwiseUserId: payer.splitwise_user_id };
}

async function loadPayerByPlayerId(supabase: ReturnType<typeof createClient>, playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id, splitwise_user_id")
    .eq("id", playerId)
    .maybeSingle();

  if (error) {
    throw new Error("session_payer_lookup_failed");
  }
  if (!data?.id) {
    return { ok: false as const, error: "session_payer_not_found" };
  }
  if (typeof data.splitwise_user_id !== "number") {
    return { ok: false as const, error: "session_payer_missing_splitwise_user_id" };
  }
  return { ok: true as const, playerId: data.id, splitwiseUserId: data.splitwise_user_id };
}

async function resolvePayerForSession(supabase: ReturnType<typeof createClient>, session: SessionRow) {
  const sessionPayerId =
    typeof session.payer_player_id === "string" && session.payer_player_id.trim() ? session.payer_player_id.trim() : null;

  if (sessionPayerId) {
    const payer = await loadPayerByPlayerId(supabase, sessionPayerId);
    if (!payer.ok) {
      return payer;
    }
    return { ...payer, source: "session" as const };
  }

  const fallback = await loadDefaultPayer(supabase);
  if (!fallback.ok) return fallback;
  return { ...fallback, source: "default" as const };
}

async function loadParticipants(supabase: ReturnType<typeof createClient>, sessionId: string) {
  const { data, error } = await supabase
    .from("session_participants")
    .select("player:players(id,name,splitwise_user_id)")
    .eq("session_id", sessionId);

  if (error) throw new Error("participants_lookup_failed");
  const rows = (data ?? []) as Array<{ player: { id: string; name: string; splitwise_user_id: number | null } | null }>;
  const players = rows.map((row) => row.player).filter((p): p is { id: string; name: string; splitwise_user_id: number | null } => Boolean(p));
  return players;
}

async function markSessionSplitwiseFailed(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  amount: unknown,
  errorCode: string,
  message: string,
  requestPayload?: Record<string, unknown> | null,
  responsePayload?: Record<string, unknown> | null
) {
  await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);

  const cents = parseMoneyToCents(amount);
  const numericAmount = cents !== null ? Number((cents / 100).toFixed(2)) : null;

  const { data: existing } = await supabase.from("expenses").select("id").eq("session_id", sessionId).maybeSingle();
  if (!existing) {
    await supabase.from("expenses").insert({
      session_id: sessionId,
      amount: numericAmount,
      status: "FAILED",
      last_error: `${errorCode}:${message}`,
      request_payload: requestPayload ?? null,
      response_payload: responsePayload ?? null,
      updated_at: new Date().toISOString()
    });
    return;
  }

  await supabase
    .from("expenses")
    .update({
      amount: numericAmount,
      status: "FAILED",
      last_error: `${errorCode}:${message}`,
      request_payload: requestPayload ?? null,
      response_payload: responsePayload ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("session_id", sessionId);
}

async function acquireExpenseLock(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  amount: unknown
): Promise<{ ok: true; mode: "new" | "existing"; expense?: ExpenseRow } | { ok: false; skipReason: "in_progress" | "already_created" }> {
  const { data: existing } = await supabase
    .from("expenses")
    .select("id,session_id,status,splitwise_expense_id,updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const row = (existing ?? null) as ExpenseRow | null;
  if (row?.status === "CREATED" && row.splitwise_expense_id) {
    return { ok: false, skipReason: "already_created" };
  }

  if (row?.status === "PENDING" && isWithinRecentWindow(row.updated_at, 10)) {
    return { ok: false, skipReason: "in_progress" };
  }

  const cents = parseMoneyToCents(amount);
  const numericAmount = cents !== null ? Number((cents / 100).toFixed(2)) : null;

  if (!row) {
    const { data: inserted, error } = await supabase
      .from("expenses")
      .insert({
        session_id: sessionId,
        amount: numericAmount,
        status: "PENDING",
        updated_at: new Date().toISOString()
      })
      .select("id,session_id,status,splitwise_expense_id,updated_at")
      .single();
    if (error || !inserted) {
      return { ok: false, skipReason: "in_progress" };
    }
    return { ok: true, mode: "new", expense: inserted as ExpenseRow };
  }

  await supabase
    .from("expenses")
    .update({ status: "PENDING", last_error: null, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  return { ok: true, mode: "existing", expense: row };
}

async function createSplitwiseExpense(apiKey: string, payload: Record<string, unknown>) {
  const response = await fetch("https://secure.splitwise.com/api/v3.0/create_expense", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return { ok: false as const, error: "splitwise_http_error", status: response.status, data };
  }

  const errors = (data?.errors ?? null) as Record<string, unknown> | null;
  if (errors && typeof errors === "object" && Object.keys(errors).length > 0) {
    return { ok: false as const, error: "splitwise_api_error", status: 200, data };
  }

  const expenses = (data?.expenses ?? null) as Array<Record<string, unknown>> | null;
  const first = Array.isArray(expenses) ? expenses[0] : null;
  const id = typeof first?.id === "number" || typeof first?.id === "string" ? String(first?.id) : null;
  if (!id) {
    return { ok: false as const, error: "missing_expense_id", status: 200, data };
  }

  return { ok: true as const, splitwiseExpenseId: id, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = await requireAutomationSecret(req);
  if (!secret) {
    return json(403, { ok: false, error: "unauthorized" });
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return json(500, { ok: false, error: "missing_supabase_service_role" });
  }

  const body = (await req.json().catch(() => null)) as { sessionIds?: unknown; dryRun?: unknown } | null;
  const sessionIds =
    Array.isArray(body?.sessionIds) ? body?.sessionIds.filter((v) => typeof v === "string" && v.trim()) : null;
  const dryRun = body?.dryRun === true;

  const { startDateSgt, endDateSgt } = computeSgtDateWindowLast24h(new Date());

  let closedUpdated = 0;
  let closeSkipped = 0;
  let splitwiseCreated = 0;
  let splitwiseSkipped = 0;
  let splitwiseFailed = 0;
  const errors: Array<{ session_id: string; session_date: string; code: string; message: string }> = [];

  const settings = await loadSplitwiseSettings(supabase);
  const apiKey = Deno.env.get("SPLITWISE_API_KEY") ?? null;

  if (!dryRun && !sessionIds) {
    const { data: openSessions, error: openError } = await supabase
      .from("sessions")
      .select("id")
      .eq("status", "OPEN")
      .gte("session_date", startDateSgt)
      .lte("session_date", endDateSgt);

    if (openError) {
      return json(500, { ok: false, error: "close_lookup_failed" });
    }

    const ids = (openSessions ?? []).map((row) => row.id).filter(Boolean);
    if (ids.length === 0) {
      closeSkipped = 0;
    } else if (dryRun) {
      closeSkipped = ids.length;
    } else {
      const { data: updated, error: closeError } = await supabase
        .from("sessions")
        .update({ status: "CLOSED", updated_at: new Date().toISOString() })
        .in("id", ids)
        .select("id");
      if (closeError) {
        return json(500, { ok: false, error: "close_update_failed" });
      }
      closedUpdated = (updated ?? []).length;
    }
  }

  const candidatesQuery = supabase
    .from("sessions")
    .select("id,session_date,status,splitwise_status,payer_player_id,total_fee,location,start_time,end_time")
    .eq("status", "CLOSED")
    .lte("session_date", endDateSgt)
    .in("splitwise_status", ["PENDING", "FAILED"]);

  const candidatesResult = sessionIds
    ? await candidatesQuery.in("id", sessionIds)
    : await candidatesQuery;

  const sessions = (candidatesResult.data ?? []) as SessionRow[];
  if (candidatesResult.error) {
    return json(500, { ok: false, error: "candidate_lookup_failed" });
  }

  for (const session of sessions) {
    const sessionId = session.id;
    if (!sessionId) continue;

    if (!settings.enabled) {
      splitwiseSkipped += 1;
      continue;
    }

    if (!apiKey) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "missing_splitwise_api_key", message: "Set SPLITWISE_API_KEY secret." });
      if (!dryRun) {
        await markSessionSplitwiseFailed(supabase, sessionId, session.total_fee, "missing_splitwise_api_key", "Set SPLITWISE_API_KEY secret.");
      }
      continue;
    }

    if (!Number.isInteger(settings.groupId) || settings.groupId <= 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "invalid_group_id", message: "Set splitwise_settings.group_id > 0." });
      if (!dryRun) {
        await markSessionSplitwiseFailed(supabase, sessionId, session.total_fee, "invalid_group_id", "Set splitwise_settings.group_id > 0.");
      }
      continue;
    }

    const costCents = parseMoneyToCents(session.total_fee);
    if (costCents === null || costCents <= 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "invalid_total_fee", message: "Session total_fee is missing or invalid." });
      if (!dryRun) {
        await markSessionSplitwiseFailed(supabase, sessionId, session.total_fee, "invalid_total_fee", "Session total_fee is missing or invalid.");
      }
      continue;
    }

    const payer = await resolvePayerForSession(supabase, session);
    if (!payer.ok) {
      splitwiseFailed += 1;
      const payerMessage =
        payer.error === "session_payer_not_found" || payer.error === "session_payer_missing_splitwise_user_id"
          ? "Fix this session payer mapping in Sessions edit."
          : "Fix default payer mapping in Players admin.";
      errors.push({ session_id: sessionId, session_date: session.session_date, code: payer.error, message: payerMessage });
      if (!dryRun) {
        await markSessionSplitwiseFailed(supabase, sessionId, session.total_fee, payer.error, payerMessage);
      }
      continue;
    }

    const participants = await loadParticipants(supabase, sessionId);
    if (participants.length === 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "missing_participants", message: "No participants joined." });
      if (!dryRun) {
        await markSessionSplitwiseFailed(supabase, sessionId, session.total_fee, "missing_participants", "No participants joined.");
      }
      continue;
    }

    const missing = participants.filter((p) => typeof p.splitwise_user_id !== "number");
    if (missing.length > 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "missing_player_splitwise_user_id", message: "Some joined players have no Splitwise user id." });
      if (!dryRun) {
        await markSessionSplitwiseFailed(
          supabase,
          sessionId,
          session.total_fee,
          "missing_player_splitwise_user_id",
          "Some joined players have no Splitwise user id."
        );
      }
      continue;
    }

    const participantUserIds = participants.map((p) => p.splitwise_user_id as number);
    const description = renderDescriptionTemplate(
      settings.descriptionTemplate,
      {
        session_date: session.session_date,
        location: session.location
      },
      {
        dateFormat: settings.dateFormat,
        locationReplacements: settings.locationReplacements
      }
    );
    const dateIso = computeExpenseDateIso();

    const built = buildSplitwiseBySharesPayload({
      groupId: settings.groupId,
      currencyCode: settings.currencyCode,
      description,
      costCents,
      dateIso,
      payerUserId: payer.splitwiseUserId,
      participantUserIds
    });

    if (!built.ok) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: built.error, message: "Failed to build Splitwise payload." });
      if (!dryRun) {
        await markSessionSplitwiseFailed(supabase, sessionId, session.total_fee, built.error, "Failed to build Splitwise payload.");
      }
      continue;
    }

    if (dryRun) {
      splitwiseSkipped += 1;
      continue;
    }

    const lock = await acquireExpenseLock(supabase, sessionId, session.total_fee);
    if (!lock.ok) {
      splitwiseSkipped += 1;
      if (lock.skipReason === "already_created") {
        await supabase.from("sessions").update({ splitwise_status: "CREATED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    const result = await createSplitwiseExpense(apiKey, built.payload as Record<string, unknown>);
    if (!result.ok) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: result.error, message: "Splitwise expense creation failed." });
      await supabase
        .from("expenses")
        .update({
          status: "FAILED",
          last_error: result.error,
          request_payload: built.payload,
          response_payload: result.data ?? null,
          updated_at: new Date().toISOString()
        })
        .eq("session_id", sessionId);
      await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      continue;
    }

    splitwiseCreated += 1;
    await supabase
      .from("expenses")
      .update({
        status: "CREATED",
        splitwise_expense_id: result.splitwiseExpenseId,
        last_error: null,
        request_payload: built.payload,
        response_payload: result.data ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);
    await supabase.from("sessions").update({ splitwise_status: "CREATED", updated_at: new Date().toISOString() }).eq("id", sessionId);
  }

  return json(200, {
    ok: true,
    window: { startDateSgt, endDateSgt },
    closed_updated: closedUpdated,
    close_skipped: closeSkipped,
    splitwise_created: splitwiseCreated,
    splitwise_skipped: splitwiseSkipped,
    splitwise_failed: splitwiseFailed,
    errors: errors.slice(0, 50)
  });
});
