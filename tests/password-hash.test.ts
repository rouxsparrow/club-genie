import { describe, expect, it } from "vitest";
import { hashPassword, validateAdminPassword, verifyPassword } from "../src/lib/password-hash";

describe("password hashing", () => {
  it("hashes and verifies a valid password", async () => {
    const password = "adminpass123";
    const hash = await hashPassword(password);
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("adminpass123");
    await expect(verifyPassword("wrongpass456", hash)).resolves.toBe(false);
  });

  it("rejects malformed stored hash safely", async () => {
    await expect(verifyPassword("anything", "bad-format")).resolves.toBe(false);
  });

  it("enforces baseline password policy", () => {
    expect(validateAdminPassword("short1").ok).toBe(false);
    expect(validateAdminPassword("onlylettersxx").ok).toBe(false);
    expect(validateAdminPassword("12345678901").ok).toBe(false);
    expect(validateAdminPassword("letters12345").ok).toBe(true);
  });
});
