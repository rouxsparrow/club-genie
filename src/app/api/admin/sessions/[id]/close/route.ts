import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../lib/supabase/admin";

function getRunSplitwiseSyncUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL");
  }
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/run-splitwise-sync`;
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

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sessionId = id?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error: closeError } = await supabaseAdmin
    .from("sessions")
    .update({ status: "CLOSED", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (closeError) {
    return NextResponse.json({ ok: false, error: closeError.message }, { status: 500 });
  }

  const url = getRunSplitwiseSyncUrl();
  const anonKey = getSupabaseAnonKey();
  const automationSecret = getAutomationSecret();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "x-automation-secret": automationSecret,
      "content-type": "application/json"
    },
    body: JSON.stringify({ sessionIds: [sessionId] })
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return NextResponse.json(data ?? { ok: false, error: "splitwise_sync_failed" }, { status: response.status });
  }

  return NextResponse.json({ ok: true, result: data });
}

