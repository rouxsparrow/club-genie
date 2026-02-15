import { describe, expect, it } from "vitest";
import { isAutomationSecretValid } from "../supabase/functions/_shared/automation-auth";
import { resolveGmailOauthConfig } from "../supabase/functions/_shared/gmail-config";
import {
  aggregateReceiptsForSessionDate,
  buildGmailQueryFromKeywords,
  parseReceipt,
  parseSessionDate,
  parseTotalFee,
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

describe("gmail oauth config resolution", () => {
  it("prefers complete DB config over env values", () => {
    const resolved = resolveGmailOauthConfig(
      {
        client_id: "db-client",
        client_secret: "db-secret",
        refresh_token: "db-refresh"
      },
      {
        GMAIL_CLIENT_ID: "env-client",
        GMAIL_CLIENT_SECRET: "env-secret",
        GMAIL_REFRESH_TOKEN: "env-refresh"
      }
    );

    expect(resolved).toEqual({
      clientId: "db-client",
      clientSecret: "db-secret",
      refreshToken: "db-refresh"
    });
  });

  it("falls back to env config when DB config is incomplete", () => {
    const resolved = resolveGmailOauthConfig(
      {
        client_id: "db-client",
        client_secret: "",
        refresh_token: "db-refresh"
      },
      {
        GMAIL_CLIENT_ID: "env-client",
        GMAIL_CLIENT_SECRET: "env-secret",
        GMAIL_REFRESH_TOKEN: "env-refresh"
      }
    );

    expect(resolved).toEqual({
      clientId: "env-client",
      clientSecret: "env-secret",
      refreshToken: "env-refresh"
    });
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

  it("parses date with DD/MM primary and MM/DD fallback", () => {
    expect(parseSessionDate("Date 1/2/26")).toBe("2026-02-01");
    expect(parseSessionDate("Date 8/31/25")).toBe("2025-08-31");
  });

  it("parses paid fee from SGD and $ receipts", () => {
    expect(parseTotalFee("Paid SGD29.00 (which SGD2.39 TAX)")).toBe(29);
    expect(parseTotalFee("Paid $62.00 (which $5.12 TAX)")).toBe(62);
  });

  it("parses playtomic receipt text into session fields", () => {
    const parsed = parseReceipt(
      "",
      [
        "Booking confirmation / Receipt Match registration data",
        "Name Nhien Mai",
        "Date 1/2/26",
        "Time 5:00 pm-7:00 pm",
        "Club Sbh East Coast @ Expo , B20",
        "Payment data",
        "Paid $26.00 (which $2.15 TAX)"
      ].join("\n"),
      "Asia/Singapore"
    );

    expect(parsed.sessionDate).toBe("2026-02-01");
    expect(parsed.totalFee).toBe(26);
    expect(parsed.location).toBe("Club Sbh East Coast @ Expo");
    expect(parsed.courts).toEqual([
      {
        courtLabel: "Court B20",
        startTime: "2026-02-01T09:00:00.000Z",
        endTime: "2026-02-01T11:00:00.000Z"
      }
    ]);
  });

  it("parses fallback-format receipt sample with uppercase PM and SGD fee", () => {
    const parsed = parseReceipt(
      "",
      [
        "Booking confirmation / Receipt Match registration data",
        "Date 8/31/25",
        "Time 1:00 PM-2:00 PM",
        "Club Sbh East Coast @ Expo , A1",
        "Payment data",
        "Paid SGD29.00 (which SGD2.39 TAX)"
      ].join("\n"),
      "Asia/Singapore"
    );

    expect(parsed.sessionDate).toBe("2025-08-31");
    expect(parsed.totalFee).toBe(29);
    expect(parsed.location).toBe("Club Sbh East Coast @ Expo");
    expect(parsed.courts).toEqual([
      {
        courtLabel: "Court A1",
        startTime: "2025-08-31T05:00:00.000Z",
        endTime: "2025-08-31T06:00:00.000Z"
      }
    ]);
  });
});

describe("receipt aggregation", () => {
  it("sums fee and dedupes courts across same-day receipts with same location", () => {
    const aggregate = aggregateReceiptsForSessionDate([
      {
        parsed_total_fee: 120,
        parsed_location: "Club Sbh East Coast @ Expo",
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
        parsed_location: "Club Sbh East Coast @ Expo",
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
    expect(aggregate?.location).toBe("Club Sbh East Coast @ Expo");
    expect(aggregate?.courts).toHaveLength(2);
  });

  it("returns null when same-day receipts have conflicting locations", () => {
    const aggregate = aggregateReceiptsForSessionDate([
      {
        parsed_total_fee: 62,
        parsed_location: "Club Sbh East Coast @ Expo",
        parsed_courts: [
          {
            court_label: "Court A4",
            start_time: "2026-02-01T09:00:00.000Z",
            end_time: "2026-02-01T11:00:00.000Z"
          }
        ]
      },
      {
        parsed_total_fee: 26,
        parsed_location: "Club Another Venue",
        parsed_courts: [
          {
            court_label: "Court B20",
            start_time: "2026-02-01T09:00:00.000Z",
            end_time: "2026-02-01T10:00:00.000Z"
          }
        ]
      }
    ]);

    expect(aggregate).toBeNull();
  });
});
