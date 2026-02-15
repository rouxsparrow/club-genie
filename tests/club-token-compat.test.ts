import { describe, expect, it } from "vitest";
import {
  isMissingTokenValueColumnError,
  normalizeTokenValue,
  warningMessageForCode
} from "../src/lib/club-token-compat";

describe("club token compatibility helpers", () => {
  it("normalizes token values", () => {
    expect(normalizeTokenValue("  abc123  ")).toBe("abc123");
    expect(normalizeTokenValue("   ")).toBeNull();
    expect(normalizeTokenValue(null)).toBeNull();
  });

  it("detects missing token_value column postgres errors", () => {
    expect(isMissingTokenValueColumnError({ code: "42703", message: "column club_settings.token_value does not exist" })).toBe(true);
    expect(isMissingTokenValueColumnError({ code: "42703", message: "column something_else does not exist" })).toBe(false);
    expect(isMissingTokenValueColumnError({ code: "42P01", message: "relation club_settings does not exist" })).toBe(false);
  });

  it("returns actionable warning messages", () => {
    expect(warningMessageForCode("migration_missing_token_value")).toContain("Apply migration 20260215200000_admin_token_and_gmail_config.sql");
    expect(warningMessageForCode("token_not_recoverable")).toContain("Rotate once");
    expect(warningMessageForCode("token_value_not_persisted")).toContain("token_value was not persisted");
  });
});
