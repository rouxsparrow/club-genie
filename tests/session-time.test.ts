import { describe, expect, it } from "vitest";
import { combineDateAndTimeToIso, isQuarterHourTime, toLocalTime } from "../src/lib/session-time";

describe("session-time helpers", () => {
  it("extracts local HH:mm from ISO", () => {
    expect(toLocalTime("2026-11-02T07:30:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("combines date + time into ISO", () => {
    expect(combineDateAndTimeToIso("2026-11-02", "15:45")).toContain("T");
  });

  it("validates quarter-hour increments", () => {
    expect(isQuarterHourTime("10:00")).toBe(true);
    expect(isQuarterHourTime("10:15")).toBe(true);
    expect(isQuarterHourTime("10:45")).toBe(true);
    expect(isQuarterHourTime("10:10")).toBe(false);
    expect(isQuarterHourTime("25:00")).toBe(false);
  });
});
