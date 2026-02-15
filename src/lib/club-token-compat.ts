export type ClubTokenWarningCode =
  | "migration_missing_token_value"
  | "token_not_recoverable"
  | "token_value_not_persisted";

type ErrorLike = {
  code?: unknown;
  message?: unknown;
} | null | undefined;

export function normalizeTokenValue(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isMissingTokenValueColumnError(error: unknown) {
  const value = error as ErrorLike;
  if (!value || typeof value !== "object") return false;
  const code = typeof value.code === "string" ? value.code : "";
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  return code === "42703" && message.includes("token_value");
}

export function warningMessageForCode(code: ClubTokenWarningCode) {
  if (code === "migration_missing_token_value") {
    return "Current token cannot be retrieved yet. Apply migration 20260215200000_admin_token_and_gmail_config.sql.";
  }
  if (code === "token_not_recoverable") {
    return "No recoverable current token found. Rotate once to generate a copyable token.";
  }
  return "Token rotated, but token_value was not persisted in this environment. Apply migration 20260215200000_admin_token_and_gmail_config.sql to enable current-token retrieval.";
}
