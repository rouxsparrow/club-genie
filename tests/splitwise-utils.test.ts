import { describe, expect, it } from "vitest";
import {
  buildSplitwiseBySharesPayload,
  centsToMoneyString,
  computeSgtDateWindowLast24h,
  parseMoneyToCents,
  renderDescriptionTemplate
} from "../supabase/functions/_shared/splitwise-utils";

describe("splitwise utils", () => {
  it("parses money to cents", () => {
    expect(parseMoneyToCents(29)).toBe(2900);
    expect(parseMoneyToCents(29.1)).toBe(2910);
    expect(parseMoneyToCents("29")).toBe(2900);
    expect(parseMoneyToCents("29.00")).toBe(2900);
    expect(parseMoneyToCents("29.5")).toBe(2950);
    expect(parseMoneyToCents("0")).toBe(0);
    expect(parseMoneyToCents("bad")).toBeNull();
  });

  it("formats cents to money string", () => {
    expect(centsToMoneyString(0)).toBe("0.00");
    expect(centsToMoneyString(1)).toBe("0.01");
    expect(centsToMoneyString(2900)).toBe("29.00");
    expect(centsToMoneyString(2910)).toBe("29.10");
  });

  it("computes SGT last-24h window date strings deterministically", () => {
    // 2026-02-15T14:00:00Z == 2026-02-15T22:00:00+08:00
    const now = new Date("2026-02-15T14:00:00.000Z");
    const window = computeSgtDateWindowLast24h(now);
    expect(window.endDateSgt).toBe("2026-02-15");
    expect(window.startDateSgt).toBe("2026-02-14");
  });

  it("builds by-shares payload with equal split", () => {
    const built = buildSplitwiseBySharesPayload({
      groupId: 123,
      currencyCode: "SGD",
      description: "Badminton 2026-02-01 - Club X",
      costCents: 8800,
      dateIso: "2026-02-01T14:00:00.000Z",
      payerUserId: 10,
      participantUserIds: [10, 20, 30, 40]
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const payload = built.payload as Record<string, unknown>;
    expect(payload.group_id).toBe(123);
    expect(payload.currency_code).toBe("SGD");
    expect(payload.cost).toBe("88.00");

    // Payer row index 0
    expect(payload.users__0__user_id).toBe(10);
    expect(payload.users__0__paid_share).toBe("88.00");
    expect(payload.users__0__owed_share).toBe("22.00");
    // Non-payer row example
    expect(payload.users__1__paid_share).toBe("0.00");
  });

  it("distributes remainder cents deterministically", () => {
    const built = buildSplitwiseBySharesPayload({
      groupId: 1,
      currencyCode: "SGD",
      description: "X",
      costCents: 100,
      dateIso: "2026-02-01T14:00:00.000Z",
      payerUserId: 1,
      participantUserIds: [1, 2, 3]
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    // 1.00 split among 3 => 0.34, 0.33, 0.33 (userId sort order)
    const payload = built.payload as Record<string, unknown>;
    expect(payload["users__0__owed_share"]).toBe("0.34");
    expect(payload["users__1__owed_share"]).toBe("0.33");
    expect(payload["users__2__owed_share"]).toBe("0.33");
  });

  it("renders description template placeholders safely", () => {
    expect(
      renderDescriptionTemplate(
        "Badminton {session_date} - {location}",
        {
          session_date: "2026-02-01",
          location: "Club X"
        },
        { dateFormat: "DD/MM/YY" }
      )
    ).toBe("Badminton 01/02/26 - Club X");

    // Location fallback + whitespace normalization.
    expect(
      renderDescriptionTemplate(
        "  Badminton   {session_date}   -   {location}  ",
        {
          session_date: "2026-02-01",
          location: ""
        },
        { dateFormat: "DD/MM/YY" }
      )
    ).toBe("Badminton 01/02/26 - Session");
  });

  it("applies location replacements case-insensitively", () => {
    expect(
      renderDescriptionTemplate(
        "Badminton {session_date} - {location}",
        { session_date: "2026-02-01", location: "Club Sbh East Coast @ Expo" },
        {
          dateFormat: "DD/MM/YY",
          locationReplacements: [{ from: "Club Sbh East Coast @ Expo", to: "Expo" }]
        }
      )
    ).toBe("Badminton 01/02/26 - Expo");
  });
});
