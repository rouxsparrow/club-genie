import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-club-token, content-type"
};

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function hashToken(token: string) {
  const data = encoder.encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

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

async function validateClubToken(supabase: ReturnType<typeof createClient>, token: string) {
  const { data, error } = await supabase
    .from("club_settings")
    .select("token_hash")
    .order("token_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.token_hash) {
    return false;
  }

  const incomingHash = await hashToken(token);
  return timingSafeEqual(incomingHash, data.token_hash);
}

async function exchangeGmailMessages(accessToken: string, query: string) {
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
      parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string } }> }>;
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
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string } }> }>;
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
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: Array<{ mimeType?: string; body?: { data?: string } }> }>;
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

type GmailTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

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

async function callIngestReceipts(
  supabaseUrl: string,
  anonKey: string,
  clubToken: string,
  messageId: string,
  rawHtml: string,
  rawText?: string | null
) {
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/ingest-receipts`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "x-club-token": clubToken,
      "content-type": "application/json"
    },
    body: JSON.stringify({ messageId, rawHtml, rawText })
  });

  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = req.headers.get("x-club-token")?.trim();
  if (!token) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const valid = await validateClubToken(supabase, token);
  if (!valid) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const query = (await req.json().catch(() => null))?.query ?? 'subject:(Receipt Playtomic)';

  try {
    const { access_token } = await getGmailAccessToken();
    const list = await exchangeGmailMessages(access_token, query);
    const messageIds = list.messages?.map((message) => message.id) ?? [];

    let ingested = 0;
    for (const messageId of messageIds) {
      const message = await fetchMessage(access_token, messageId);
      const rawHtml = findHtmlPart(message.payload);
      const rawText = findTextPart(message.payload);
      if (!rawHtml && !rawText) {
        continue;
      }
      const ok = await callIngestReceipts(supabaseUrl, anonKey, token, messageId, rawHtml ?? "", rawText);
      if (ok) ingested += 1;
    }

    return new Response(JSON.stringify({ ok: true, ingested, total: messageIds.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "ingestion_failed";
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
