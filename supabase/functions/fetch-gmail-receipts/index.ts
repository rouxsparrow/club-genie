import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { isAutomationSecretValid } from "../_shared/automation-auth.ts";
import {
  buildGmailQueryFromKeywords,
  ingestionDefaults,
  normalizeSubjectKeywords
} from "../_shared/ingestion-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, x-automation-secret, content-type"
};

type GmailTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
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

async function getAutomationSettings(supabase: ReturnType<typeof createClient>) {
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

async function getGmailAccessToken() {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("missing_gmail_oauth_config");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
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

async function fetchGmailMessage(accessToken: string, messageId: string) {
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
    snippet?: string;
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
}): string | null {
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
}): string | null {
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

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false, error: "missing_supabase_service_role" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const settings = await getAutomationSettings(supabase);
  if (!settings.enabled) {
    return new Response(JSON.stringify({ ok: true, messages: [], skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body = (await req.json().catch(() => null)) as { query?: string } | null;
  const query =
    typeof body?.query === "string" && body.query.trim()
      ? body.query.trim()
      : buildGmailQueryFromKeywords(settings.subjectKeywords);

  try {
    const { access_token } = await getGmailAccessToken();
    const list = await listGmailMessages(access_token, query);
    const messageIds = list.messages?.map((message) => message.id) ?? [];

    const messages = [] as Array<{ id: string; rawHtml?: string | null; rawText?: string | null }>;
    for (const messageId of messageIds) {
      const message = await fetchGmailMessage(access_token, messageId);
      const rawHtml = findHtmlPart(message.payload);
      const rawText = findTextPart(message.payload);
      messages.push({ id: message.id, rawHtml, rawText });
    }

    return new Response(JSON.stringify({ ok: true, messages, query, timezone: settings.timezone }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "gmail_fetch_failed";
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
