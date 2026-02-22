import { describe, expect, it } from "vitest";
import {
  formatParticipantSummary,
  groupSessionsByMonth,
  parseSessionDateToLocalDate,
  shouldIncludeSessionInFilter,
  toSessionViewStatus
} from "../src/lib/sessions-v2-view";

describe("sessions-v2 view helpers", () => {
  it("maps backend statuses to V2 statuses", () => {
    expect(toSessionViewStatus("OPEN")).toBe("open");
    expect(toSessionViewStatus("FULL")).toBe("full");
    expect(toSessionViewStatus("CLOSED")).toBe("closed");
    expect(toSessionViewStatus("DRAFT")).toBe("draft");
    expect(toSessionViewStatus(null)).toBe("open");
  });

  it("applies public and admin filter rules", () => {
    expect(shouldIncludeSessionInFilter("open", "upcoming", false)).toBe(true);
    expect(shouldIncludeSessionInFilter("full", "upcoming", false)).toBe(true);
    expect(shouldIncludeSessionInFilter("draft", "upcoming", true)).toBe(false);
    expect(shouldIncludeSessionInFilter("closed", "past", false)).toBe(true);
    expect(shouldIncludeSessionInFilter("draft", "past", false)).toBe(false);
    expect(shouldIncludeSessionInFilter("draft", "past", true)).toBe(true);
  });

  it("groups sessions by month in chronological order", () => {
    const sessions = [
      { id: "b", date: new Date(2026, 2, 1) },
      { id: "a", date: new Date(2026, 1, 10) },
      { id: "c", date: new Date(2026, 2, 8) }
    ];

    const grouped = groupSessionsByMonth(sessions);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.sessions.map((session) => session.id)).toEqual(["a"]);
    expect(grouped[1]?.sessions.map((session) => session.id)).toEqual(["b", "c"]);
  });

  it("formats participant summaries with guests", () => {
    expect(formatParticipantSummary(1, 0)).toBe("1 player joined");
    expect(formatParticipantSummary(4, 0)).toBe("4 players joined");
    expect(formatParticipantSummary(6, 2)).toBe("6 players joined | Guests x2");
  });

  it("parses YYYY-MM-DD dates in local time", () => {
    const parsed = parseSessionDateToLocalDate("2026-02-20");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(20);
  });
});
