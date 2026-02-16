import { NextResponse } from "next/server";

function getRunIngestionUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL");
  }
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/run-ingestion`;
}

function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return anonKey;
}

function getAutomationSecret() {
  const secret = process.env.AUTOMATION_SECRET;
  if (!secret) {
    throw new Error("Missing AUTOMATION_SECRET");
  }
  return secret;
}

export async function POST() {
  const url = getRunIngestionUrl();
  const anonKey = getSupabaseAnonKey();
  const automationSecret = getAutomationSecret();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "x-automation-secret": automationSecret,
      "x-run-source": "ADMIN_MANUAL",
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return NextResponse.json(data ?? { ok: false, error: "run_ingestion_failed" }, { status: response.status });
  }

  return NextResponse.json(data ?? { ok: true });
}
