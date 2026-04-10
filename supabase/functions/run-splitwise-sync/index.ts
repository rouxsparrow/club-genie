import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isAutomationSecretValid } from "../_shared/automation-auth.ts";
import {
  buildCourtExpenseNote,
  buildShuttlecockExpenseNote,
  applyPercentageFeeCents,
  buildSplitwiseBySharesPayload,
  buildSplitwiseShuttlecockPayload,
  computeSgtDateWindowLast24h,
  parseMoneyToCents,
  renderDescriptionTemplate
} from "../_shared/splitwise-utils.ts";
import { finalizeRunHistory, resolveRunSource, startRunHistory } from "../_shared/run-history.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-automation-secret, x-run-source, content-type"
};

type ExpenseType = "COURT" | "SHUTTLECOCK";

type SplitwiseSettingsRow = {
  group_id: number | null;
  currency_code: string | null;
  enabled: boolean | null;
  description_template?: string | null;
  date_format?: string | null;
  location_replacements?: unknown;
  shuttlecock_fee?: unknown;
  court_conversion_fee_percent?: unknown;
};

type SessionRow = {
  id: string;
  session_date: string;
  status: string;
  splitwise_status?: string | null;
  payer_player_id?: string | null;
  guest_count?: number | null;
  total_fee?: unknown;
  location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type ExpenseRow = {
  id: string;
  session_id: string;
  expense_type?: ExpenseType | null;
  status: string | null;
  splitwise_expense_id: string | null;
  updated_at: string | null;
};

type SessionParticipantRow = {
  id: string;
  name: string;
  splitwise_user_id: number | null;
  shuttlecock_paid: boolean;
};

type ActiveOnRecipientRow = {
  id: string;
  splitwise_user_id: number;
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
  return new Date().toISOString();
}

function normalizeGuestCount(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) return 0;
  if (value < 0) return 0;
  if (value > 20) return 20;
  return value;
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
  const selectCandidates = [
    "group_id,currency_code,enabled,description_template,date_format,location_replacements,shuttlecock_fee,court_conversion_fee_percent",
    "group_id,currency_code,enabled,description_template,date_format,location_replacements,shuttlecock_fee",
    "group_id,currency_code,enabled,description_template,date_format,location_replacements"
  ] as const;

  let query = await supabase.from("splitwise_settings").select(selectCandidates[0]).eq("id", 1).maybeSingle();
  for (const candidate of selectCandidates.slice(1)) {
    if (!query.error) break;
    const message = query.error.message ?? "";
    if (!message.includes("shuttlecock_fee") && !message.includes("court_conversion_fee_percent")) break;
    query = await supabase.from("splitwise_settings").select(candidate).eq("id", 1).maybeSingle();
  }

  const row = (query.data ?? null) as SplitwiseSettingsRow | null;
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

  const shuttlecockFeeCents = parseMoneyToCents(row?.shuttlecock_fee ?? "4.00") ?? 400;
  const rawConversionFeePercent = row?.court_conversion_fee_percent;
  const parsedConversionFeePercent =
    typeof rawConversionFeePercent === "number"
      ? rawConversionFeePercent
      : typeof rawConversionFeePercent === "string"
        ? Number(rawConversionFeePercent.trim())
        : 1;
  const courtConversionFeePercent =
    Number.isFinite(parsedConversionFeePercent) && parsedConversionFeePercent >= 0 ? parsedConversionFeePercent : 1;

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
    locationReplacements,
    shuttlecockFeeCents,
    courtConversionFeePercent
  };
}

async function loadDefaultPayer(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, splitwise_user_id")
    .eq("is_default_payer", true)
    .limit(2);

  if (error) throw new Error("payer_lookup_failed");
  const rows = (data ?? []) as Array<{ id: string; name: string | null; splitwise_user_id: number | null }>;
  if (rows.length === 0) return { ok: false as const, error: "missing_default_payer" };
  if (rows.length > 1) return { ok: false as const, error: "multiple_default_payers" };
  const payer = rows[0];
  if (typeof payer.splitwise_user_id !== "number") return { ok: false as const, error: "payer_missing_splitwise_user_id" };
  return { ok: true as const, playerId: payer.id, playerName: payer.name ?? null, splitwiseUserId: payer.splitwise_user_id };
}

async function loadPayerByPlayerId(supabase: ReturnType<typeof createClient>, playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, splitwise_user_id")
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
  return { ok: true as const, playerId: data.id, playerName: data.name ?? null, splitwiseUserId: data.splitwise_user_id };
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
  const selectCandidates = [
    "player:players(id,name,splitwise_user_id,shuttlecock_paid)",
    "player:players(id,name,splitwise_user_id)"
  ] as const;

  let query = await supabase
    .from("session_participants")
    .select(selectCandidates[0])
    .eq("session_id", sessionId);
  if (query.error) {
    const message = query.error.message ?? "";
    if (message.includes("shuttlecock_paid")) {
      query = await supabase
        .from("session_participants")
        .select(selectCandidates[1])
        .eq("session_id", sessionId);
    }
  }

  if (query.error) throw new Error("participants_lookup_failed");

  const rows = (query.data ?? []) as Array<{
    player:
      | {
          id: string;
          name: string;
          splitwise_user_id: number | null;
          shuttlecock_paid?: boolean | null;
        }
      | null;
  }>;

  return rows
    .map((row) => row.player)
    .filter((p): p is { id: string; name: string; splitwise_user_id: number | null; shuttlecock_paid?: boolean | null } => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      splitwise_user_id: p.splitwise_user_id,
      shuttlecock_paid: p.shuttlecock_paid === true
    })) as SessionParticipantRow[];
}

async function loadActiveShuttlecockRecipients(supabase: ReturnType<typeof createClient>) {
  const query = await supabase
    .from("players")
    .select("id,splitwise_user_id,active,shuttlecock_paid")
    .eq("active", true)
    .eq("shuttlecock_paid", true);

  if (query.error) {
    const message = query.error.message ?? "";
    if (message.includes("shuttlecock_paid")) {
      // Backward compatibility (pre-migration): no recipients.
      return [] as ActiveOnRecipientRow[];
    }
    throw new Error("shuttlecock_recipient_lookup_failed");
  }

  const rows = (query.data ?? []) as Array<{ id: string; splitwise_user_id: number | null }>;
  return rows
    .filter((row): row is { id: string; splitwise_user_id: number } => typeof row.splitwise_user_id === "number")
    .map((row) => ({ id: row.id, splitwise_user_id: row.splitwise_user_id }));
}

async function markExpenseFailed(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  expenseType: ExpenseType,
  amount: unknown,
  errorCode: string,
  message: string,
  requestPayload?: Record<string, unknown> | null,
  responsePayload?: Record<string, unknown> | null
) {
  const cents = parseMoneyToCents(amount);
  const numericAmount = cents !== null ? Number((cents / 100).toFixed(2)) : null;

  const { data: existing } = await supabase
    .from("expenses")
    .select("id")
    .eq("session_id", sessionId)
    .eq("expense_type", expenseType)
    .maybeSingle();

  if (!existing) {
    await supabase.from("expenses").insert({
      session_id: sessionId,
      expense_type: expenseType,
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
    .eq("session_id", sessionId)
    .eq("expense_type", expenseType);
}

async function acquireExpenseLock(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  expenseType: ExpenseType,
  amount: unknown
): Promise<{ ok: true; mode: "new" | "existing"; expense?: ExpenseRow } | { ok: false; skipReason: "in_progress" | "already_created" }> {
  const { data: existing } = await supabase
    .from("expenses")
    .select("id,session_id,expense_type,status,splitwise_expense_id,updated_at")
    .eq("session_id", sessionId)
    .eq("expense_type", expenseType)
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
        expense_type: expenseType,
        amount: numericAmount,
        status: "PENDING",
        updated_at: new Date().toISOString()
      })
      .select("id,session_id,expense_type,status,splitwise_expense_id,updated_at")
      .single();
    if (error || !inserted) {
      return { ok: false, skipReason: "in_progress" };
    }
    return { ok: true, mode: "new", expense: inserted as ExpenseRow };
  }

  await supabase
    .from("expenses")
    .update({ status: "PENDING", last_error: null, amount: numericAmount, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("expense_type", expenseType);

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

async function processExpenseCreation(input: {
  supabase: ReturnType<typeof createClient>;
  apiKey: string;
  sessionId: string;
  sessionDate: string;
  expenseType: ExpenseType;
  amount: unknown;
  payload: Record<string, unknown>;
  dryRun: boolean;
  errors: Array<{ session_id: string; session_date: string; code: string; message: string }>;
}) {
  const { supabase, apiKey, sessionId, sessionDate, expenseType, amount, payload, dryRun, errors } = input;

  if (dryRun) {
    return { kind: "skip" as const };
  }

  const lock = await acquireExpenseLock(supabase, sessionId, expenseType, amount);
  if (!lock.ok) {
    if (lock.skipReason === "in_progress") {
      return { kind: "in_progress" as const };
    }
    return { kind: "already_created" as const };
  }

  const result = await createSplitwiseExpense(apiKey, payload);
  if (!result.ok) {
    errors.push({
      session_id: sessionId,
      session_date: sessionDate,
      code: `${expenseType.toLowerCase()}_${result.error}`,
      message: `${expenseType} expense creation failed.`
    });
    await supabase
      .from("expenses")
      .update({
        status: "FAILED",
        last_error: result.error,
        request_payload: payload,
        response_payload: result.data ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId)
      .eq("expense_type", expenseType);
    return { kind: "failed" as const };
  }

  await supabase
    .from("expenses")
    .update({
      status: "CREATED",
      splitwise_expense_id: result.splitwiseExpenseId,
      last_error: null,
      request_payload: payload,
      response_payload: result.data ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("session_id", sessionId)
    .eq("expense_type", expenseType);

  return { kind: "created" as const };
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
  const runSource = resolveRunSource(req.headers.get("x-run-source"));
  const run = await startRunHistory(supabase, {
    jobType: "SPLITWISE",
    runSource,
    requestPayload: body ?? {}
  });

  const { startDateSgt, endDateSgt } = computeSgtDateWindowLast24h(new Date());

  let closedUpdated = 0;
  let closeSkipped = 0;
  let splitwiseCreated = 0;
  let splitwiseSkipped = 0;
  let splitwiseFailed = 0;
  const errors: Array<{ session_id: string; session_date: string; code: string; message: string }> = [];
  const buildSummary = () => ({
    closed_updated: closedUpdated,
    close_skipped: closeSkipped,
    splitwise_created: splitwiseCreated,
    splitwise_skipped: splitwiseSkipped,
    splitwise_failed: splitwiseFailed,
    errors
  });

  const respondWithHistory = async (
    statusCode: number,
    payload: Record<string, unknown>,
    status: "SUCCESS" | "FAILED" | "SKIPPED",
    errorMessage: string | null = null
  ) => {
    await finalizeRunHistory(supabase, run, {
      status,
      summary: buildSummary(),
      errorMessage
    });
    return json(statusCode, payload);
  };

  const settings = await loadSplitwiseSettings(supabase);
  const apiKey = Deno.env.get("SPLITWISE_API_KEY") ?? null;

  let activeOnRecipients: ActiveOnRecipientRow[] = [];
  try {
    activeOnRecipients = await loadActiveShuttlecockRecipients(supabase);
  } catch {
    return await respondWithHistory(500, { ok: false, error: "shuttlecock_recipient_lookup_failed" }, "FAILED", "shuttlecock_recipient_lookup_failed");
  }

  if (!dryRun && !sessionIds) {
    const { data: openSessions, error: openError } = await supabase
      .from("sessions")
      .select("id")
      .eq("status", "OPEN")
      .gte("session_date", startDateSgt)
      .lte("session_date", endDateSgt);

    if (openError) {
      return await respondWithHistory(500, { ok: false, error: "close_lookup_failed" }, "FAILED", "close_lookup_failed");
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
        return await respondWithHistory(500, { ok: false, error: "close_update_failed" }, "FAILED", "close_update_failed");
      }
      closedUpdated = (updated ?? []).length;
    }
  }

  const candidateSelects = [
    "id,session_date,status,splitwise_status,payer_player_id,guest_count,total_fee,location,start_time,end_time",
    "id,session_date,status,splitwise_status,payer_player_id,total_fee,location,start_time,end_time"
  ] as const;

  let candidatesResult = await supabase
    .from("sessions")
    .select(candidateSelects[0])
    .eq("status", "CLOSED")
    .lte("session_date", endDateSgt)
    .in("splitwise_status", ["PENDING", "FAILED"]);
  if (sessionIds) {
    candidatesResult = await supabase
      .from("sessions")
      .select(candidateSelects[0])
      .eq("status", "CLOSED")
      .lte("session_date", endDateSgt)
      .in("splitwise_status", ["PENDING", "FAILED"])
      .in("id", sessionIds);
  }

  if (candidatesResult.error) {
    const message = candidatesResult.error.message ?? "";
    if (message.includes("guest_count")) {
      candidatesResult = await supabase
        .from("sessions")
        .select(candidateSelects[1])
        .eq("status", "CLOSED")
        .lte("session_date", endDateSgt)
        .in("splitwise_status", ["PENDING", "FAILED"]);
      if (sessionIds) {
        candidatesResult = await supabase
          .from("sessions")
          .select(candidateSelects[1])
          .eq("status", "CLOSED")
          .lte("session_date", endDateSgt)
          .in("splitwise_status", ["PENDING", "FAILED"])
          .in("id", sessionIds);
      }
    }
  }

  const sessions = ((candidatesResult.data ?? []) as SessionRow[]).map((session) => ({
    ...session,
    guest_count: normalizeGuestCount(session.guest_count)
  }));
  if (candidatesResult.error) {
    return await respondWithHistory(
      500,
      { ok: false, error: "candidate_lookup_failed" },
      "FAILED",
      "candidate_lookup_failed"
    );
  }

  for (const session of sessions) {
    const sessionId = session.id;
    if (!sessionId) continue;

    let sessionHasFailure = false;
    let sessionHasInProgress = false;

    if (!settings.enabled) {
      splitwiseSkipped += 1;
      continue;
    }

    if (!apiKey) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "missing_splitwise_api_key", message: "Set SPLITWISE_API_KEY secret." });
      if (!dryRun) {
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    if (!Number.isInteger(settings.groupId) || settings.groupId <= 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "invalid_group_id", message: "Set splitwise_settings.group_id > 0." });
      if (!dryRun) {
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    if (!Number.isInteger(settings.shuttlecockFeeCents) || settings.shuttlecockFeeCents <= 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "invalid_shuttlecock_fee", message: "Set splitwise_settings.shuttlecock_fee > 0." });
      if (!dryRun) {
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    const costCents = parseMoneyToCents(session.total_fee);
    if (costCents === null || costCents <= 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "invalid_total_fee", message: "Session total_fee is missing or invalid." });
      if (!dryRun) {
        await markExpenseFailed(supabase, sessionId, "COURT", session.total_fee, "invalid_total_fee", "Session total_fee is missing or invalid.");
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }
    const courtCostCents = applyPercentageFeeCents(costCents, settings.courtConversionFeePercent);
    if (courtCostCents === null || courtCostCents <= 0) {
      splitwiseFailed += 1;
      errors.push({
        session_id: sessionId,
        session_date: session.session_date,
        code: "invalid_court_conversion_fee",
        message: "Set splitwise_settings.court_conversion_fee_percent >= 0."
      });
      if (!dryRun) {
        await markExpenseFailed(
          supabase,
          sessionId,
          "COURT",
          session.total_fee,
          "invalid_court_conversion_fee",
          "Set splitwise_settings.court_conversion_fee_percent >= 0."
        );
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
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
        await markExpenseFailed(supabase, sessionId, "COURT", session.total_fee, payer.error, payerMessage);
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    const participants = await loadParticipants(supabase, sessionId);
    if (participants.length === 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "missing_participants", message: "No participants joined." });
      if (!dryRun) {
        await markExpenseFailed(supabase, sessionId, "COURT", session.total_fee, "missing_participants", "No participants joined.");
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    const missing = participants.filter((p) => typeof p.splitwise_user_id !== "number");
    if (missing.length > 0) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: "missing_player_splitwise_user_id", message: "Some joined players have no Splitwise user id." });
      if (!dryRun) {
        await markExpenseFailed(
          supabase,
          sessionId,
          "COURT",
          session.total_fee,
          "missing_player_splitwise_user_id",
          "Some joined players have no Splitwise user id."
        );
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    const participantUserIds = participants.map((p) => p.splitwise_user_id as number);
    const guestCount = normalizeGuestCount(session.guest_count);
    const payerLabel = payer.playerName && payer.playerName.trim() ? payer.playerName.trim() : payer.playerId;
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

    // 1) COURT expense (legacy logic)
    const courtBuilt = buildSplitwiseBySharesPayload({
      groupId: settings.groupId,
      currencyCode: settings.currencyCode,
      description,
      costCents: courtCostCents,
      dateIso,
      payerUserId: payer.splitwiseUserId,
      participantUserIds,
      guestCount
    });

    if (!courtBuilt.ok) {
      splitwiseFailed += 1;
      errors.push({ session_id: sessionId, session_date: session.session_date, code: courtBuilt.error, message: "Failed to build COURT expense payload." });
      if (!dryRun) {
        await markExpenseFailed(supabase, sessionId, "COURT", session.total_fee, courtBuilt.error, "Failed to build COURT expense payload.");
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    const courtAmount = Number((courtCostCents / 100).toFixed(2));
    const courtConversionFeeCents = courtCostCents - costCents;
    (courtBuilt.payload as Record<string, unknown>).details = buildCourtExpenseNote({
      totalCostCents: costCents,
      joinedPlayersCount: participants.length,
      guestCount,
      sessionPayerLabel: payerLabel,
      conversionFeePercent: settings.courtConversionFeePercent,
      conversionFeeCents: courtConversionFeeCents,
      totalWithConversionFeeCents: courtCostCents
    });
    const courtCreated = await processExpenseCreation({
      supabase,
      apiKey,
      sessionId,
      sessionDate: session.session_date,
      expenseType: "COURT",
      amount: courtAmount,
      payload: courtBuilt.payload as Record<string, unknown>,
      dryRun,
      errors
    });
    if (courtCreated.kind === "failed") {
      sessionHasFailure = true;
    } else if (courtCreated.kind === "in_progress") {
      sessionHasInProgress = true;
    }

    // 2) SHUTTLECOCK expense
    const offParticipantUserIds = participants
      .filter((entry) => !entry.shuttlecock_paid)
      .map((entry) => entry.splitwise_user_id as number);
    const shuttleChargeUnits = offParticipantUserIds.length + guestCount;

    const shuttleRecipientsUserIds = activeOnRecipients.map((entry) => entry.splitwise_user_id);
    const shuttleBuilt = buildSplitwiseShuttlecockPayload({
      groupId: settings.groupId,
      currencyCode: settings.currencyCode,
      description: `${description} - Shuttlecock`,
      dateIso,
      participantOffUserIds: offParticipantUserIds,
      recipientOnUserIds: shuttleRecipientsUserIds,
      perOffFeeCents: settings.shuttlecockFeeCents,
      guestCount,
      sessionPayerUserId: payer.splitwiseUserId
    });

    if (!shuttleBuilt.ok) {
      if (shuttleBuilt.error === "no_charge" || shuttleBuilt.error === "missing_recipients") {
        // Optional expense: no OFF participants or no valid ON recipients.
      } else {
        sessionHasFailure = true;
        errors.push({
          session_id: sessionId,
          session_date: session.session_date,
          code: `shuttlecock_${shuttleBuilt.error}`,
          message: "Failed to build SHUTTLECOCK expense payload."
        });
        if (!dryRun) {
          await markExpenseFailed(
            supabase,
            sessionId,
            "SHUTTLECOCK",
            Number(((shuttleChargeUnits * settings.shuttlecockFeeCents) / 100).toFixed(2)),
            `shuttlecock_${shuttleBuilt.error}`,
            "Failed to build SHUTTLECOCK expense payload."
          );
        }
      }
    } else {
      const shuttleAmount = Number((shuttleBuilt.totalCostCents / 100).toFixed(2));
      (shuttleBuilt.payload as Record<string, unknown>).details = buildShuttlecockExpenseNote({
        totalCostCents: shuttleBuilt.totalCostCents,
        shuttleOffPlayersCount: offParticipantUserIds.length,
        guestCount,
        sessionPayerLabel: payerLabel
      });
      const shuttleCreated = await processExpenseCreation({
        supabase,
        apiKey,
        sessionId,
        sessionDate: session.session_date,
        expenseType: "SHUTTLECOCK",
        amount: shuttleAmount,
        payload: shuttleBuilt.payload as Record<string, unknown>,
        dryRun,
        errors
      });

      if (shuttleCreated.kind === "failed") {
        sessionHasFailure = true;
      } else if (shuttleCreated.kind === "in_progress") {
        sessionHasInProgress = true;
      }
    }

    if (sessionHasFailure) {
      splitwiseFailed += 1;
      if (!dryRun) {
        await supabase.from("sessions").update({ splitwise_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
      continue;
    }

    if (sessionHasInProgress) {
      splitwiseSkipped += 1;
      continue;
    }

    splitwiseCreated += 1;
    if (!dryRun) {
      await supabase.from("sessions").update({ splitwise_status: "CREATED", updated_at: new Date().toISOString() }).eq("id", sessionId);
    }
  }

  const summary = buildSummary();
  const historyStatus =
    !settings.enabled ? "SKIPPED"
    : splitwiseFailed > 0 ? "FAILED"
    : "SUCCESS";
  await finalizeRunHistory(supabase, run, {
    status: historyStatus,
    summary,
    errorMessage: historyStatus === "FAILED" ? "splitwise_sync_failed" : null
  });

  return json(200, {
    ok: true,
    ...summary
  });
});
