import { describe, expect, it } from "vitest";
import { isAutomationSecretValid } from "../supabase/functions/_shared/automation-auth";
import {
  aggregateReceiptsForSessionDate,
  buildGmailQueryFromKeywords,
  toIsoFromLocalTime
} from "../supabase/functions/_shared/ingestion-utils";

describe("automation auth", () => {
  it("validates matching automation secret", () => {
    expect(isAutomationSecretValid("club-secret", "club-secret")).toBe(true);
  });

  it("rejects missing or non-matching secret", () => {
    expect(isAutomationSecretValid("club-secret", null)).toBe(false);
    expect(isAutomationSecretValid("club-secret", "wrong-secret")).toBe(false);
  });
});

describe("ingestion query and timezone utilities", () => {
  it("builds Gmail query from subject keywords", () => {
    expect(buildGmailQueryFromKeywords(["Playtomic", "Receipt"])).toBe(
      'newer_than:30d subject:"Playtomic" subject:"Receipt"'
    );
  });

  it("converts local SGT time to ISO UTC", () => {
    expect(toIsoFromLocalTime("2026-02-10", "10:00", "Asia/Singapore")).toBe("2026-02-10T02:00:00.000Z");
  });
});

describe("receipt aggregation", () => {
  it("sums fee and dedupes courts across same-day receipts", () => {
    const aggregate = aggregateReceiptsForSessionDate([
      {
        parsed_total_fee: 120,
        parsed_courts: [
          {
            court_label: "Court 1",
            start_time: "2026-02-10T02:00:00.000Z",
            end_time: "2026-02-10T04:00:00.000Z"
          }
        ]
      },
      {
        parsed_total_fee: "80",
        parsed_courts: [
          {
            court_label: "Court 1",
            start_time: "2026-02-10T02:00:00.000Z",
            end_time: "2026-02-10T04:00:00.000Z"
          },
          {
            court_label: "Court 2",
            start_time: "2026-02-10T04:00:00.000Z",
            end_time: "2026-02-10T06:00:00.000Z"
          }
        ]
      }
    ]);

    expect(aggregate).not.toBeNull();
    expect(aggregate?.totalFee).toBe(200);
    expect(aggregate?.startTime).toBe("2026-02-10T02:00:00.000Z");
    expect(aggregate?.endTime).toBe("2026-02-10T06:00:00.000Z");
    expect(aggregate?.courts).toHaveLength(2);
  });
});
