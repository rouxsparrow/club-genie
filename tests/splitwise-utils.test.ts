import { describe, expect, it } from "vitest";
import {
  buildCourtExpenseNote,
  buildShuttlecockExpenseNote,
  buildSplitwiseBySharesPayload,
  buildSplitwiseShuttlecockPayload,
  applyPercentageFeeCents,
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

  it("applies percentage fees to cents with cent rounding", () => {
    expect(applyPercentageFeeCents(10000, 1)).toBe(10100);
    expect(applyPercentageFeeCents(9999, 1)).toBe(10099);
    expect(applyPercentageFeeCents(10000, 0)).toBe(10000);
    expect(applyPercentageFeeCents(10000, -1)).toBeNull();
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

  it("assigns guest shares to payer when guests are present", () => {
    const built = buildSplitwiseBySharesPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Guests test",
      costCents: 10000,
      dateIso: "2026-02-01T14:00:00.000Z",
      payerUserId: 10,
      participantUserIds: [10, 20, 30, 40, 50, 60, 70],
      guestCount: 3
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const payload = built.payload as Record<string, unknown>;
    // 100.00 / 10 shares => 10.00 each, 3 guest shares added to payer.
    expect(payload["users__0__owed_share"]).toBe("40.00");
    expect(payload["users__1__owed_share"]).toBe("10.00");
    expect(payload["users__2__owed_share"]).toBe("10.00");
  });

  it("handles payer not in participants with guests", () => {
    const built = buildSplitwiseBySharesPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Guests test 2",
      costCents: 10000,
      dateIso: "2026-02-01T14:00:00.000Z",
      payerUserId: 999,
      participantUserIds: [10, 20, 30, 40, 50, 60, 70],
      guestCount: 3
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const payload = built.payload as Record<string, unknown>;
    // Payer not in participants => owes only guest shares.
    expect(payload["users__0__owed_share"]).toBe("30.00");
    expect(payload["users__1__owed_share"]).toBe("10.00");
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

  it("builds shuttlecock payload for OFF participants and ON recipients", () => {
    const built = buildSplitwiseShuttlecockPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Shuttlecock 2026-03-01",
      dateIso: "2026-03-01T14:00:00.000Z",
      participantOffUserIds: [10, 20, 30],
      recipientOnUserIds: [100, 200],
      perOffFeeCents: 400,
      sessionPayerUserId: 10
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const payload = built.payload as Record<string, unknown>;
    expect(payload.cost).toBe("12.00");
    // Recipients receive the collected amount via paid_share.
    expect(payload["users__3__user_id"]).toBe(100);
    expect(payload["users__3__paid_share"]).toBe("6.00");
    expect(payload["users__3__owed_share"]).toBe("0.00");
    expect(payload["users__4__user_id"]).toBe(200);
    expect(payload["users__4__paid_share"]).toBe("6.00");
    expect(payload["users__4__owed_share"]).toBe("0.00");
    // OFF users each owe 4.00.
    expect(payload["users__0__owed_share"]).toBe("4.00");
    expect(payload["users__1__owed_share"]).toBe("4.00");
    expect(payload["users__2__owed_share"]).toBe("4.00");
  });

  it("distributes shuttlecock recipient remainder deterministically by sorted user id", () => {
    const built = buildSplitwiseShuttlecockPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Shuttlecock remainder",
      dateIso: "2026-03-01T14:00:00.000Z",
      participantOffUserIds: [2],
      recipientOnUserIds: [30, 10, 20],
      perOffFeeCents: 100,
      sessionPayerUserId: 2
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const payload = built.payload as Record<string, unknown>;
    // Sorted recipient ids are 10,20,30 => 0.34, 0.33, 0.33.
    expect(payload["users__1__user_id"]).toBe(10);
    expect(payload["users__1__paid_share"]).toBe("0.34");
    expect(payload["users__2__user_id"]).toBe(20);
    expect(payload["users__2__paid_share"]).toBe("0.33");
    expect(payload["users__3__user_id"]).toBe(30);
    expect(payload["users__3__paid_share"]).toBe("0.33");
  });

  it("returns skip-style errors for shuttlecock payload with no OFF or no ON", () => {
    const noOff = buildSplitwiseShuttlecockPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Shuttlecock",
      dateIso: "2026-03-01T14:00:00.000Z",
      participantOffUserIds: [],
      recipientOnUserIds: [100],
      perOffFeeCents: 400,
      sessionPayerUserId: 100
    });
    expect(noOff.ok).toBe(false);
    if (!noOff.ok) expect(noOff.error).toBe("no_charge");

    const noOn = buildSplitwiseShuttlecockPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Shuttlecock",
      dateIso: "2026-03-01T14:00:00.000Z",
      participantOffUserIds: [100],
      recipientOnUserIds: [],
      perOffFeeCents: 400,
      sessionPayerUserId: 100
    });
    expect(noOn.ok).toBe(false);
    if (!noOn.ok) expect(noOn.error).toBe("missing_recipients");
  });

  it("charges guest shuttlecock shares to session payer", () => {
    const built = buildSplitwiseShuttlecockPayload({
      groupId: 11,
      currencyCode: "SGD",
      description: "Shuttlecock guests",
      dateIso: "2026-03-01T14:00:00.000Z",
      participantOffUserIds: [10, 20],
      recipientOnUserIds: [100, 200],
      perOffFeeCents: 400,
      guestCount: 2,
      sessionPayerUserId: 10
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.totalCostCents).toBe(1600);
    const payload = built.payload as Record<string, unknown>;
    // Payer owes own OFF fee + 2 guest shares => 12.00.
    expect(payload["users__0__user_id"]).toBe(10);
    expect(payload["users__0__owed_share"]).toBe("12.00");
    expect(payload["users__1__owed_share"]).toBe("4.00");
  });

  it("creates note strings for court and shuttlecock", () => {
    const courtNote = buildCourtExpenseNote({
      totalCostCents: 8800,
      joinedPlayersCount: 8,
      guestCount: 2,
      sessionPayerLabel: "Alex"
    });
    expect(courtNote).toBe("Total: 88.00\nJoined players: 8, Guests: 2\nSession payer: Alex");

    const courtNoteWithFee = buildCourtExpenseNote({
      totalCostCents: 10000,
      joinedPlayersCount: 4,
      guestCount: 0,
      sessionPayerLabel: "Alex",
      conversionFeePercent: 1,
      conversionFeeCents: 100,
      totalWithConversionFeeCents: 10100
    });
    expect(courtNoteWithFee).toBe(
      "Total: 100.00\nJoined players: 4, Guests: 0\nSession payer: Alex\nConversion fee: 1.00% (1.00)\nTotal with conversion fee: 101.00"
    );

    const shuttleNote = buildShuttlecockExpenseNote({
      totalCostCents: 1600,
      shuttleOffPlayersCount: 2,
      guestCount: 2,
      sessionPayerLabel: "Alex"
    });
    expect(shuttleNote).toBe("Total: 16.00\nShuttle OFF players: 2, Guests: 2\nSession payer: Alex");
  });
});
