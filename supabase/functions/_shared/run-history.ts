import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SupabaseClient = ReturnType<typeof createClient>;

type RunHistoryJobType = "INGESTION" | "SPLITWISE";
type RunHistoryStatus = "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
type RunHistorySource = "GITHUB_CRON" | "ADMIN_MANUAL" | "API" | "UNKNOWN";

type StartRunHistoryInput = {
  jobType: RunHistoryJobType;
  runSource: RunHistorySource;
  requestPayload?: Record<string, unknown> | null;
};

type StartedRunHistory = {
  id: string;
  startedAtMs: number;
};

type FinalizeRunHistoryInput = {
  status: RunHistoryStatus;
  summary?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

const allowedSources = new Set<RunHistorySource>(["GITHUB_CRON", "ADMIN_MANUAL", "API", "UNKNOWN"]);

export function resolveRunSource(value: string | null | undefined): RunHistorySource {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) return "UNKNOWN";
  if (allowedSources.has(normalized as RunHistorySource)) {
    return normalized as RunHistorySource;
  }
  return "UNKNOWN";
}

export async function startRunHistory(
  supabase: SupabaseClient,
  input: StartRunHistoryInput
): Promise<StartedRunHistory | null> {
  const startedAtIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("automation_run_history")
    .insert({
      job_type: input.jobType,
      run_source: input.runSource,
      status: "RUNNING",
      request_payload: input.requestPayload ?? null,
      started_at: startedAtIso,
      finished_at: null,
      duration_ms: null,
      summary: null,
      error_message: null
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return null;
  }

  return {
    id: data.id,
    startedAtMs: Date.parse(startedAtIso)
  };
}

export async function finalizeRunHistory(
  supabase: SupabaseClient,
  run: StartedRunHistory | null,
  input: FinalizeRunHistoryInput
) {
  if (!run) return;

  const finishedAt = new Date();
  const durationMs = Math.max(0, finishedAt.getTime() - run.startedAtMs);

  await supabase
    .from("automation_run_history")
    .update({
      status: input.status,
      summary: input.summary ?? null,
      error_message: input.errorMessage ?? null,
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      updated_at: new Date().toISOString()
    })
    .eq("id", run.id);
}
