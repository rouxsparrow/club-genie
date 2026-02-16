import { type AdminSessionPayload } from "./admin-session-contract";

const encoder = new TextEncoder();

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  return secret;
}

function base64UrlEncode(input: string) {
  return btoa(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signPayload(payload: string) {
  const secret = getAdminSessionSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);
  let base64 = "";
  for (const byte of bytes) {
    base64 += String.fromCharCode(byte);
  }
  return base64UrlEncode(base64);
}

function decodePayload(encodedPayload: string) {
  const padded = encodedPayload + "=".repeat((4 - (encodedPayload.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

export async function readAdminSessionValueEdge(value: string): Promise<AdminSessionPayload | null> {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expected = await signPayload(payload);
  if (expected.length !== signature.length) {
    return null;
  }
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const parsed = JSON.parse(decodePayload(payload)) as Partial<AdminSessionPayload>;
    const username = typeof parsed.un === "string" ? parsed.un.trim() : "";
    const uid = typeof parsed.uid === "string" ? parsed.uid : null;
    const sv = typeof parsed.sv === "number" && Number.isInteger(parsed.sv) && parsed.sv >= 0 ? parsed.sv : -1;
    const iat = typeof parsed.iat === "number" && Number.isFinite(parsed.iat) ? parsed.iat : -1;
    const exp = typeof parsed.exp === "number" && Number.isFinite(parsed.exp) ? parsed.exp : -1;
    const bg = parsed.bg === true;
    if (!username || sv < 0 || iat <= 0 || exp <= 0 || exp <= Date.now()) {
      return null;
    }
    return { uid, un: username, sv, iat, exp, bg };
  } catch {
    return null;
  }
}

export async function verifyAdminSessionValueEdge(value: string) {
  return Boolean(await readAdminSessionValueEdge(value));
}
