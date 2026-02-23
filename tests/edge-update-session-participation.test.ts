import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSessionParticipation } from "../src/lib/edge";

const ORIGINAL_ENV = { ...process.env };

describe("updateSessionParticipation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("returns success payload when edge function succeeds", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          sessionId: "session-1",
          guestCount: 2,
          participants: [{ session_id: "session-1", player: { id: "p1", name: "Alex", avatar_url: null } }]
        }),
        { status: 200 }
      )
    );

    const result = await updateSessionParticipation("club-token", {
      sessionId: "session-1",
      playerIds: ["p1"],
      guestCount: 2
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://demo.supabase.co/functions/v1/update-session-participation");
    expect(init.method).toBe("POST");
    expect(result).toEqual({
      ok: true,
      status: 200,
      sessionId: "session-1",
      guestCount: 2,
      participants: [{ session_id: "session-1", player: { id: "p1", name: "Alex", avatar_url: null } }]
    });
  });

  it("returns typed errors for non-404 failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "invalid_players" }), { status: 400 })
    );

    const result = await updateSessionParticipation("club-token", {
      sessionId: "session-1",
      playerIds: ["p999"],
      guestCount: 0
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "invalid_players",
      detail: undefined,
      unsupportedEndpoint: false
    });
  });

  it("flags 404 as unsupported endpoint for legacy fallback rollout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Not found", { status: 404 }));

    const result = await updateSessionParticipation("club-token", {
      sessionId: "session-1",
      playerIds: [],
      guestCount: 0
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "unsupported_endpoint",
      unsupportedEndpoint: true
    });
  });
});

