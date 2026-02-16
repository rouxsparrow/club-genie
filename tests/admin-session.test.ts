import { describe, expect, it, beforeAll } from "vitest";
import { createAdminSessionValue, readAdminSessionValue, verifyAdminSessionValue } from "../src/lib/admin-session";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret";
});

describe("admin session signing", () => {
  it("creates a signed session value and verifies it", () => {
    const value = createAdminSessionValue({
      uid: "00000000-0000-0000-0000-000000000001",
      username: "admin-one",
      sessionVersion: 3,
      isBreakglass: false
    });
    expect(value).toContain(".");
    expect(verifyAdminSessionValue(value)).toBe(true);
    const payload = readAdminSessionValue(value);
    expect(payload?.uid).toBe("00000000-0000-0000-0000-000000000001");
    expect(payload?.un).toBe("admin-one");
    expect(payload?.sv).toBe(3);
    expect(payload?.bg).toBe(false);
  });

  it("rejects a tampered session value", () => {
    const value = createAdminSessionValue({
      uid: null,
      username: "breakglass",
      sessionVersion: 0,
      isBreakglass: true
    });
    const [payload, signature] = value.split(".");
    const tampered = `${payload}x.${signature}`;
    expect(verifyAdminSessionValue(tampered)).toBe(false);
  });

  it("rejects an expired signed session value", () => {
    const now = Date.now();
    const value = createAdminSessionValue({
      uid: "00000000-0000-0000-0000-000000000001",
      username: "admin-one",
      sessionVersion: 1,
      isBreakglass: false,
      nowMs: now - 8 * 24 * 60 * 60 * 1000
    });
    expect(verifyAdminSessionValue(value)).toBe(false);
    expect(readAdminSessionValue(value)).toBeNull();
  });
});
