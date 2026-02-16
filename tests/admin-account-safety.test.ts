import { describe, expect, it } from "vitest";
import { validateDeactivateAdminAccount } from "../src/lib/admin-account-safety";

describe("admin account safety guard", () => {
  it("blocks self deactivation", () => {
    const result = validateDeactivateAdminAccount({
      isSelf: true,
      targetCurrentlyActive: true,
      activeAdminCount: 2
    });
    expect(result).toEqual({ ok: false, error: "cannot_deactivate_self" });
  });

  it("blocks deactivating last active admin", () => {
    const result = validateDeactivateAdminAccount({
      isSelf: false,
      targetCurrentlyActive: true,
      activeAdminCount: 1
    });
    expect(result).toEqual({ ok: false, error: "cannot_deactivate_last_active_admin" });
  });

  it("allows deactivation when target is not self and another admin exists", () => {
    const result = validateDeactivateAdminAccount({
      isSelf: false,
      targetCurrentlyActive: true,
      activeAdminCount: 2
    });
    expect(result).toEqual({ ok: true });
  });
});
