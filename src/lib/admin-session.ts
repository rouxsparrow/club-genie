import crypto from "crypto";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SECONDS, type AdminSessionPayload } from "./admin-session-contract";

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signPayload(payload: string) {
  const secret = getAdminSessionSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function decodePayload(encodedPayload: string) {
  const padded = encodedPayload + "=".repeat((4 - (encodedPayload.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

export function createAdminSessionValue(input: {
  uid: string | null;
  username: string;
  sessionVersion: number;
  isBreakglass: boolean;
  nowMs?: number;
}) {
  const now = input.nowMs ?? Date.now();
  const payload: AdminSessionPayload = {
    uid: input.uid,
    un: input.username,
    sv: input.sessionVersion,
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    bg: input.isBreakglass
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function readAdminSessionValue(value: string): AdminSessionPayload | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }
  const expected = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

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

export function verifyAdminSessionValue(value: string) {
  return Boolean(readAdminSessionValue(value));
}

export function getAdminSessionCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  };
}
