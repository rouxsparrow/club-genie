import { describe, expect, it } from "vitest";
import { formatCourtLabelForDisplay, formatCourtTimeRangeForDisplay } from "../src/lib/session-court-display";

describe("formatCourtLabelForDisplay", () => {
  it("removes a leading Court prefix", () => {
    expect(formatCourtLabelForDisplay("Court P2")).toBe("P2");
    expect(formatCourtLabelForDisplay("court B20")).toBe("B20");
  });

  it("keeps fallback when label is empty", () => {
    expect(formatCourtLabelForDisplay("Court")).toBe("Court");
    expect(formatCourtLabelForDisplay("")).toBe("Court");
    expect(formatCourtLabelForDisplay(null)).toBe("Court");
  });
});

describe("formatCourtTimeRangeForDisplay", () => {
  it("compacts same-period ranges to trailing period only", () => {
    expect(formatCourtTimeRangeForDisplay("2026-02-01T17:00:00", "2026-02-01T18:00:00")).toBe("5-6PM");
  });

  it("keeps both periods when range crosses meridiem", () => {
    expect(formatCourtTimeRangeForDisplay("2026-02-01T11:00:00", "2026-02-01T13:00:00")).toBe("11AM-1PM");
  });

  it("returns TBD fallbacks for invalid/missing times", () => {
    expect(formatCourtTimeRangeForDisplay(null, null)).toBe("TBD");
    expect(formatCourtTimeRangeForDisplay("2026-02-01T17:00:00", null)).toBe("5PM-TBD");
  });
});
