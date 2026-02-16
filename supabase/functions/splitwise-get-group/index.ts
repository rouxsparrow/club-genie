import { isAutomationSecretValid } from "../_shared/automation-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-automation-secret, content-type"
};

async function requireAutomationSecret(req: Request) {
  const provided = req.headers.get("x-automation-secret")?.trim() ?? null;
  const expected = Deno.env.get("AUTOMATION_SECRET");
  return isAutomationSecretValid(expected, provided) ? (provided as string) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = await requireAutomationSecret(req);
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = Deno.env.get("SPLITWISE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_splitwise_api_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body = (await req.json().catch(() => null)) as { groupId?: unknown } | null;
  const raw = typeof body?.groupId === "string" ? body?.groupId.trim() : body?.groupId;
  const groupId = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_group_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const response = await fetch(`https://secure.splitwise.com/api/v3.0/get_group/${groupId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  const jsonBody = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, error: "splitwise_request_failed", status: response.status }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const group = jsonBody?.group ?? null;
  return new Response(JSON.stringify({ ok: true, group, raw: jsonBody }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});

