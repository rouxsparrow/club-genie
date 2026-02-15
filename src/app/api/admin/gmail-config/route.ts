import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

type GmailConfigRow = {
  id: number;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  updated_at: string | null;
};

function asString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getEnvConfig() {
  const clientId = asString(process.env.GMAIL_CLIENT_ID);
  const clientSecret = asString(process.env.GMAIL_CLIENT_SECRET);
  const refreshToken = asString(process.env.GMAIL_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  return {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  };
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("gmail_oauth_config")
    .select("id,client_id,client_secret,refresh_token,updated_at")
    .eq("id", 1)
    .maybeSingle<GmailConfigRow>();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rowClientId = asString(data?.client_id);
  const rowClientSecret = asString(data?.client_secret);
  const rowRefreshToken = asString(data?.refresh_token);
  if (rowClientId && rowClientSecret && rowRefreshToken) {
    return NextResponse.json({
      ok: true,
      source: "table",
      config: {
        id: data?.id ?? 1,
        client_id: rowClientId,
        client_secret: rowClientSecret,
        refresh_token: rowRefreshToken,
        updated_at: data?.updated_at ?? null
      }
    });
  }

  const envConfig = getEnvConfig();
  if (envConfig) {
    return NextResponse.json({
      ok: true,
      source: "env",
      config: {
        id: 1,
        client_id: envConfig.client_id,
        client_secret: envConfig.client_secret,
        refresh_token: envConfig.refresh_token,
        updated_at: data?.updated_at ?? null
      }
    });
  }

  return NextResponse.json({
    ok: true,
    source: "empty",
    config: data ?? {
      id: 1,
      client_id: "",
      client_secret: "",
      refresh_token: "",
      updated_at: null
    }
  });
}

export async function PATCH(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { clientId?: unknown; clientSecret?: unknown; refreshToken?: unknown }
    | null;

  const updates: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
  if (payload?.clientId !== undefined) {
    const value = asString(payload.clientId);
    if (!value) {
      return NextResponse.json({ ok: false, error: "clientId must be a non-empty string." }, { status: 400 });
    }
    updates.client_id = value;
  }
  if (payload?.clientSecret !== undefined) {
    const value = asString(payload.clientSecret);
    if (!value) {
      return NextResponse.json({ ok: false, error: "clientSecret must be a non-empty string." }, { status: 400 });
    }
    updates.client_secret = value;
  }
  if (payload?.refreshToken !== undefined) {
    const value = asString(payload.refreshToken);
    if (!value) {
      return NextResponse.json({ ok: false, error: "refreshToken must be a non-empty string." }, { status: 400 });
    }
    updates.refresh_token = value;
  }

  if (Object.keys(updates).length === 2) {
    return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("gmail_oauth_config")
    .upsert(updates, { onConflict: "id" })
    .select("id,client_id,client_secret,refresh_token,updated_at")
    .single<GmailConfigRow>();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config: data });
}
