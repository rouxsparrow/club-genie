import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

type RunHistoryStatus = "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
type RunHistorySource = "GITHUB_CRON" | "ADMIN_MANUAL" | "API" | "UNKNOWN";

function normalizeStatus(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "RUNNING" || normalized === "SUCCESS" || normalized === "FAILED" || normalized === "SKIPPED") {
    return normalized as RunHistoryStatus;
  }
  return null;
}

function normalizeSource(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "GITHUB_CRON" || normalized === "ADMIN_MANUAL" || normalized === "API" || normalized === "UNKNOWN") {
    return normalized as RunHistorySource;
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = normalizeStatus(url.searchParams.get("status"));
  const source = normalizeSource(url.searchParams.get("source"));
  const limitRaw = (url.searchParams.get("limit") ?? "").trim();
  const limit = Math.min(100, Math.max(1, Number(limitRaw || "30") || 30));

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from("automation_run_history")
    .select("id,job_type,run_source,status,started_at,finished_at,duration_ms,summary,error_message,created_at")
    .eq("job_type", "SPLITWISE")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }
  if (source) {
    query = query.eq("run_source", source);
  }

  const { data, error } = await query;
  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("automation_run_history")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Run history table missing. Apply migration 20260216233000_automation_run_history.sql."
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, runs: data ?? [] });
}
