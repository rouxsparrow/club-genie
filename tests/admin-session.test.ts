import { describe, expect, it, beforeAll } from "vitest";
import { createAdminSessionValue, verifyAdminSessionValue } from "../src/lib/admin-session";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret";
});

describe("admin session signing", () => {
  it("creates a signed session value and verifies it", () => {
    const value = createAdminSessionValue();
    expect(value).toContain(".");
    expect(verifyAdminSessionValue(value)).toBe(true);
  });

  it("rejects a tampered session value", () => {
    const value = createAdminSessionValue();
    const [payload, signature] = value.split(".");
    const tampered = `${payload}x.${signature}`;
    expect(verifyAdminSessionValue(tampered)).toBe(false);
  });
});
