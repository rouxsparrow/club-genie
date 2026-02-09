import { describe, expect, it } from "vitest";
import { placeholder } from "../src/index";

describe("smoke", () => {
  it("returns placeholder", () => {
    expect(placeholder).toBe("club-genie");
  });
});
