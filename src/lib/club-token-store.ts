import { getClubTokenStorageKey } from "./edge";

export const CLUB_TOKENS_STORAGE_KEY = "club_tokens";

function normalizeToken(value: unknown) {
  const token = typeof value === "string" ? value.trim() : "";
  return token ? token : null;
}

export function readClubTokensFromStorage(): string[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(CLUB_TOKENS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeToken).filter((t): t is string => Boolean(t));
      }
    } catch {
      // fall through to legacy migration
    }
  }

  const legacy = window.localStorage.getItem(getClubTokenStorageKey());
  const legacyToken = normalizeToken(legacy);
  if (!legacyToken) return [];

  const tokens = [legacyToken];
  window.localStorage.setItem(CLUB_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  return tokens;
}

export function writeClubTokensToStorage(tokens: string[]) {
  if (typeof window === "undefined") return;
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  window.localStorage.setItem(CLUB_TOKENS_STORAGE_KEY, JSON.stringify(unique));
}

export function addClubTokenToStorage(token: string) {
  const normalized = normalizeToken(token);
  if (!normalized) return readClubTokensFromStorage();
  const existing = readClubTokensFromStorage();
  const next = [...new Set([...existing, normalized])];
  writeClubTokensToStorage(next);
  return next;
}

export function removeClubTokenFromStorage(token: string) {
  const normalized = normalizeToken(token);
  if (!normalized) return readClubTokensFromStorage();
  const existing = readClubTokensFromStorage();
  const next = existing.filter((t) => t !== normalized);
  writeClubTokensToStorage(next);
  return next;
}

