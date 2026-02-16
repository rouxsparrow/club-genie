import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isAutomationSecretValid } from "../_shared/automation-auth.ts";
import { resolveRunSource } from "../_shared/run-history.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-automation-secret, x-run-source, content-type"
};

type RunStatus = "SUCCESS" | "FAILED" | "SKIPPED";

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function normalizeStatus(value: unknown): RunStatus {
  if (typeof value !== "string") return "FAILED";
  const normalized = value.trim().toUpperCase();
  if (normalized === "SUCCESS" || normalized === "FAILED" || normalized === "SKIPPED") {
    return normalized;
  }
  return "FAILED";
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeErrorMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ts = Date.parse(trimmed);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
}

function normalizeDurationMs(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

async function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const expectedSecret = Deno.env.get("AUTOMATION_SECRET");
  const providedSecret = req.headers.get("x-automation-secret")?.trim() ?? null;
  if (!isAutomationSecretValid(expectedSecret, providedSecret)) {
    return json(403, { ok: false, error: "unauthorized" });
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return json(500, { ok: false, error: "missing_supabase_service_role" });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const status = normalizeStatus(body?.status);
  const summary = normalizeObject(body?.summary);
  const requestPayload = normalizeObject(body?.requestPayload);
  const errorMessage = normalizeErrorMessage(body?.errorMessage);

  const startedAt = normalizeDate(body?.startedAt) ?? new Date();
  const finishedAt = normalizeDate(body?.finishedAt) ?? new Date();
  const fallbackDuration = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  const durationMs = normalizeDurationMs(body?.durationMs, fallbackDuration);
  const runSource = resolveRunSource(req.headers.get("x-run-source"));

  const { error } = await supabase.from("automation_run_history").insert({
    job_type: "INGESTION",
    run_source: runSource,
    status,
    request_payload: requestPayload,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: durationMs,
    summary,
    error_message: errorMessage
  });

  if (error) {
    return json(500, { ok: false, error: error.message ?? "run_history_insert_failed" });
  }

  return json(200, { ok: true });
});
