import { describe, expect, it } from "vitest";
import { MAX_GUEST_COUNT, normalizeGuestCount } from "../src/lib/session-guests";

describe("session guest helpers", () => {
  it("normalizes invalid values to zero", () => {
    expect(normalizeGuestCount(null)).toBe(0);
    expect(normalizeGuestCount(undefined)).toBe(0);
    expect(normalizeGuestCount("2")).toBe(0);
    expect(normalizeGuestCount(1.5)).toBe(0);
    expect(normalizeGuestCount(-3)).toBe(0);
  });

  it("clamps values to configured max", () => {
    expect(normalizeGuestCount(0)).toBe(0);
    expect(normalizeGuestCount(7)).toBe(7);
    expect(normalizeGuestCount(MAX_GUEST_COUNT + 2)).toBe(MAX_GUEST_COUNT);
    expect(normalizeGuestCount(12, 10)).toBe(10);
  });
});
