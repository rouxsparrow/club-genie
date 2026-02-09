import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/lib/crypto";

describe("sha256Hex", () => {
  it("hashes a string to sha256 hex", () => {
    expect(sha256Hex("club-genie")).toBe("498b4d4cf88465384996ad2e9c8533769ef39a6b17332defabc456c0a2fcf84d");
  });
});
