import { describe, expect, it } from "vitest";
import {
  buildParticipationUpdatePayload,
  buildSelectedParticipantRows,
  computeParticipationDiff,
  replaceParticipantsForSession
} from "../src/lib/session-participation-submit";

describe("session participation submit helpers", () => {
  it("detects no-change and changed states", () => {
    const unchanged = computeParticipationDiff(["p1", "p2"], ["p1", "p2"], 1, 1);
    expect(unchanged.hasChanges).toBe(false);
    expect(unchanged.toJoin).toEqual([]);
    expect(unchanged.toWithdraw).toEqual([]);
    expect(unchanged.guestChanged).toBe(false);

    const changed = computeParticipationDiff(["p1", "p3"], ["p1", "p2"], 2, 1);
    expect(changed.hasChanges).toBe(true);
    expect(changed.toJoin).toEqual(["p3"]);
    expect(changed.toWithdraw).toEqual(["p2"]);
    expect(changed.guestChanged).toBe(true);
  });

  it("builds payload with unique player ids", () => {
    const payload = buildParticipationUpdatePayload("session-1", [" p1 ", "p2", "p1", " "], 3);
    expect(payload).toEqual({
      sessionId: "session-1",
      playerIds: ["p1", "p2"],
      guestCount: 3
    });
  });

  it("builds selected rows and replaces only target session participants", () => {
    const nextRows = buildSelectedParticipantRows(
      "session-1",
      [
        { id: "p1", name: "Alex", avatar_url: "a.png" },
        { id: "p2", name: "Ben", avatar_url: null },
        { id: "p3", name: "Cara", avatar_url: null }
      ],
      ["p2", "p3"]
    );

    expect(nextRows).toEqual([
      { session_id: "session-1", player: { id: "p2", name: "Ben", avatar_url: null } },
      { session_id: "session-1", player: { id: "p3", name: "Cara", avatar_url: null } }
    ]);

    const merged = replaceParticipantsForSession(
      [
        { session_id: "session-1", player: { id: "p1", name: "Alex", avatar_url: "a.png" } },
        { session_id: "session-2", player: { id: "p4", name: "Drew", avatar_url: null } }
      ],
      "session-1",
      nextRows
    );

    expect(merged).toEqual([
      { session_id: "session-2", player: { id: "p4", name: "Drew", avatar_url: null } },
      { session_id: "session-1", player: { id: "p2", name: "Ben", avatar_url: null } },
      { session_id: "session-1", player: { id: "p3", name: "Cara", avatar_url: null } }
    ]);
  });
});

