type BridgeAction = "manual_ingest" | "preview";

type BridgePayload = {
  query?: string;
  limit?: number;
};

type BridgeResponse = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

function readRequiredEnv(name: "APPS_SCRIPT_BRIDGE_URL" | "APPS_SCRIPT_BRIDGE_SECRET") {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name}`);
  }
  return value.trim();
}

function getBridgeConfig() {
  return {
    url: readRequiredEnv("APPS_SCRIPT_BRIDGE_URL"),
    secret: readRequiredEnv("APPS_SCRIPT_BRIDGE_SECRET")
  };
}

export async function callAppsScriptBridge(action: BridgeAction, payload?: BridgePayload) {
  const config = getBridgeConfig();
  const requestPayload = {
    action,
    secret: config.secret,
    ...(payload ?? {})
  };

  const response = await fetch(config.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestPayload)
  });

  const data = (await response.json().catch(() => null)) as BridgeResponse | null;
  return { response, data };
}
