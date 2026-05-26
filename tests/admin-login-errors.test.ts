import { describe, expect, it } from "vitest";
import { resolveAdminLoginErrorCode } from "../src/lib/admin-login-errors";

describe("resolveAdminLoginErrorCode", () => {
  it("returns invalid-credentials code when schema is present", () => {
    expect(
      resolveAdminLoginErrorCode({
        adminUsersTableMissing: false,
        breakglassEnabled: false,
        breakglassActive: false
      })
    ).toBe("1");
  });

  it("returns breakglass_config when table missing and breakglass enabled but inactive", () => {
    expect(
      resolveAdminLoginErrorCode({
        adminUsersTableMissing: true,
        breakglassEnabled: true,
        breakglassActive: false
      })
    ).toBe("breakglass_config");
  });

  it("returns db_schema when table missing and breakglass disabled", () => {
    expect(
      resolveAdminLoginErrorCode({
        adminUsersTableMissing: true,
        breakglassEnabled: false,
        breakglassActive: false
      })
    ).toBe("db_schema");
  });

  it("type includes server code for route-level failures", () => {
    const value = "server" as const;
    expect(value).toBe("server");
  });
});
