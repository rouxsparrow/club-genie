import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { timingSafeEqual } from "./automation-auth.ts";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string) {
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export type ClubAuthResult =
  | { ok: true; clubId: string; clubName: string | null; tokenHash: string }
  | { ok: false };

export async function resolveClubFromToken(supabase: SupabaseClient, token: string): Promise<ClubAuthResult> {
  const tokenHash = await sha256Hex(token);

  // Prefer new multi-club table; fall back to legacy club_settings for older DBs.
  const { data: clubToken, error: clubTokenError } = await supabase
    .from("club_tokens")
    .select("club_id, token_hash, clubs(name)")
    .eq("is_current", true)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!clubTokenError && clubToken?.token_hash && typeof clubToken.club_id === "string") {
    const valid = timingSafeEqual(String(clubToken.token_hash), tokenHash);
    if (!valid) return { ok: false };
    const clubs = (clubToken as unknown as { clubs?: { name?: unknown } | null }).clubs;
    const clubName = typeof clubs?.name === "string" ? clubs.name : null;
    return { ok: true, clubId: clubToken.club_id, clubName, tokenHash };
  }

  const message = clubTokenError?.message ?? "";
  if (message && !message.includes("club_tokens")) {
    return { ok: false };
  }

  const { data: legacy, error: legacyError } = await supabase
    .from("club_settings")
    .select("token_hash")
    .order("token_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyError || !legacy?.token_hash) return { ok: false };
  const legacyValid = timingSafeEqual(String(legacy.token_hash), tokenHash);
  if (!legacyValid) return { ok: false };
  return { ok: true, clubId: "00000000-0000-0000-0000-000000000000", clubName: null, tokenHash };
}

