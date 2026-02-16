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

  const response = await fetch("https://secure.splitwise.com/api/v3.0/get_current_user", {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return new Response(JSON.stringify({ ok: false, error: "splitwise_request_failed", status: response.status }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const user = (body?.user ?? null) as Record<string, unknown> | null;
  const id = typeof user?.id === "number" ? user.id : null;
  const firstName = typeof user?.first_name === "string" ? user.first_name : null;
  const lastName = typeof user?.last_name === "string" ? user.last_name : null;

  return new Response(
    JSON.stringify({
      ok: true,
      currentUser: {
        id,
        first_name: firstName,
        last_name: lastName
      }
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
});

