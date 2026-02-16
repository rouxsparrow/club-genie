import { NextResponse } from "next/server";

function getSplitwiseGroupUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL");
  }
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/splitwise-get-group`;
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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const raw = id?.trim();
  const groupId = Number(raw);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid group id." }, { status: 400 });
  }

  const url = getSplitwiseGroupUrl();
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
    body: JSON.stringify({ groupId })
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return NextResponse.json(data ?? { ok: false, error: "splitwise_group_failed" }, { status: response.status });
  }

  return NextResponse.json(data ?? { ok: true });
}

