import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isAutomationSecretValid } from "../_shared/automation-auth.ts";
import { resolveGmailOauthConfig } from "../_shared/gmail-config.ts";
import {
  buildGmailQueryFromKeywords,
  ingestionDefaults,
  normalizeSubjectKeywords
} from "../_shared/ingestion-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, x-automation-secret, content-type"
};

type AutomationSettings = {
  subjectKeywords: string[];
  timezone: string;
  enabled: boolean;
};

type GmailTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type IngestOutcome = {
  ok: boolean;
  deduped: boolean;
  parseFailed: boolean;
};

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

async function getAutomationSettings(supabase: ReturnType<typeof createClient>): Promise<AutomationSettings> {
  const { data } = await supabase
    .from("automation_settings")
    .select("subject_keywords, timezone, enabled")
    .eq("id", 1)
    .maybeSingle();

  return {
    subjectKeywords: normalizeSubjectKeywords(data?.subject_keywords),
    timezone:
      typeof data?.timezone === "string" && data.timezone.trim() ? data.timezone : ingestionDefaults.timezone,
    enabled: typeof data?.enabled === "boolean" ? data.enabled : true
  };
}

async function getGmailAccessToken(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("gmail_oauth_config")
    .select("client_id,client_secret,refresh_token")
    .eq("id", 1)
    .maybeSingle();

  const resolved = resolveGmailOauthConfig(data, {
    GMAIL_CLIENT_ID: Deno.env.get("GMAIL_CLIENT_ID"),
    GMAIL_CLIENT_SECRET: Deno.env.get("GMAIL_CLIENT_SECRET"),
    GMAIL_REFRESH_TOKEN: Deno.env.get("GMAIL_REFRESH_TOKEN")
  });

  if (!resolved) {
    throw new Error("missing_gmail_oauth_config");
  }

  const body = new URLSearchParams({
    client_id: resolved.clientId,
    client_secret: resolved.clientSecret,
    refresh_token: resolved.refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("gmail_token_failed");
  }

  return (await response.json()) as GmailTokenResponse;
}

async function listGmailMessages(accessToken: string, query: string) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error("gmail_list_failed");
  }

  return (await response.json()) as { messages?: Array<{ id: string }> };
}

async function fetchMessage(accessToken: string, messageId: string) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error("gmail_fetch_failed");
  }

  return (await response.json()) as {
    id: string;
    payload?: {
      mimeType?: string;
      body?: { data?: string };
      parts?: Array<{
        mimeType?: string;
        body?: { data?: string };
        parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
      }>;
    };
  };
}

function decodeBody(data?: string) {
  if (!data) return null;
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function findHtmlPart(payload?: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{
    mimeType?: string;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  }>;
}) {
  if (!payload) return null;
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  const stack = [...(payload.parts ?? [])];
  while (stack.length > 0) {
    const part = stack.shift();
    if (!part) continue;
    if (part.mimeType === "text/html" && part.body?.data) {
      return decodeBody(part.body.data);
    }
    if (part.parts) {
      stack.push(...part.parts);
    }
  }

  return null;
}

function findTextPart(payload?: {
  mimeType?: string;
  body?: { data?: string };
  parts?: Array<{
    mimeType?: string;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  }>;
}) {
  if (!payload) return null;
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  const stack = [...(payload.parts ?? [])];
  while (stack.length > 0) {
    const part = stack.shift();
    if (!part) continue;
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBody(part.body.data);
    }
    if (part.parts) {
      stack.push(...part.parts);
    }
  }

  return null;
}

async function callIngestReceipts(
  supabaseUrl: string,
  anonKey: string,
  automationSecret: string,
  messageId: string,
  rawHtml: string,
  rawText: string | null,
  timezone: string
): Promise<IngestOutcome> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/ingest-receipts`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "x-automation-secret": automationSecret,
      "content-type": "application/json"
    },
    body: JSON.stringify({ messageId, rawHtml, rawText, timezone })
  });

  const data = (await response.json().catch(() => null)) as { deduped?: boolean; error?: string } | null;

  if (response.ok) {
    return {
      ok: true,
      deduped: Boolean(data?.deduped),
      parseFailed: false
    };
  }

  if (response.status === 422 && data?.error === "parse_failed") {
    return {
      ok: false,
      deduped: false,
      parseFailed: true
    };
  }

  return {
    ok: false,
    deduped: false,
    parseFailed: false
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const providedSecret = req.headers.get("x-automation-secret")?.trim() ?? null;
  const expectedSecret = Deno.env.get("AUTOMATION_SECRET");
  if (!isAutomationSecretValid(expectedSecret, providedSecret)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const automationSecret = providedSecret as string;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ ok: false, error: "missing_supabase_config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const headerApiKey = req.headers.get("apikey")?.trim() ?? "";
  const authHeader = req.headers.get("authorization")?.trim() ?? "";
  const bearerPrefix = "bearer ";
  const authToken = authHeader.toLowerCase().startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length).trim()
    : "";
  const anonKey = headerApiKey || authToken;
  if (!anonKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_request_api_key" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false, error: "missing_supabase_service_role" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const settings = await getAutomationSettings(supabase);
  if (!settings.enabled) {
    return new Response(
      JSON.stringify({ ok: true, total: 0, ingested: 0, deduped: 0, parse_failed: 0, fetch_failed: 0, skipped: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  const requestBody = (await req.json().catch(() => null)) as { query?: string } | null;
  const query =
    typeof requestBody?.query === "string" && requestBody.query.trim()
      ? requestBody.query.trim()
      : buildGmailQueryFromKeywords(settings.subjectKeywords);

  try {
    const { access_token } = await getGmailAccessToken(supabase);
    const list = await listGmailMessages(access_token, query);
    const messageIds = list.messages?.map((message) => message.id) ?? [];

    let ingested = 0;
    let deduped = 0;
    let parseFailed = 0;
    let fetchFailed = 0;

    for (const messageId of messageIds) {
      try {
        const message = await fetchMessage(access_token, messageId);
        const rawHtml = findHtmlPart(message.payload);
        const rawText = findTextPart(message.payload);
        if (!rawHtml && !rawText) {
          fetchFailed += 1;
          continue;
        }

        const outcome = await callIngestReceipts(
          supabaseUrl,
          anonKey,
          automationSecret,
          messageId,
          rawHtml ?? "",
          rawText,
          settings.timezone
        );

        if (outcome.deduped) {
          deduped += 1;
        } else if (outcome.ok) {
          ingested += 1;
        } else if (outcome.parseFailed) {
          parseFailed += 1;
        } else {
          fetchFailed += 1;
        }
      } catch {
        fetchFailed += 1;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: messageIds.length,
        ingested,
        deduped,
        parse_failed: parseFailed,
        fetch_failed: fetchFailed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "ingestion_failed";
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
