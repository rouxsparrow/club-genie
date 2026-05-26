import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminMock } = vi.hoisted(() => {
  return {
    getSupabaseAdminMock: vi.fn()
  };
});

vi.mock("../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock
}));

import { GET, POST } from "../src/app/api/admin/players/route";
import { PATCH } from "../src/app/api/admin/players/[id]/route";

function makeSupabaseAdmin(handlers: {
  listPlayers?: () => { data: unknown; error: unknown };
  createPlayer?: (payload: Record<string, unknown>) => { data: unknown; error: unknown };
  updatePlayer?: (payload: Record<string, unknown>) => { error: unknown };
  fetchPlayer?: () => { data: unknown; error: unknown };
}) {
  return {
    from: (table: string) => {
      if (table !== "players") return {};

      return {
        select: () => ({
          order: async () => handlers.listPlayers?.() ?? { data: [], error: null },
          eq: () => ({
            maybeSingle: async () => handlers.fetchPlayer?.() ?? { data: null, error: null }
          })
        }),
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async () => handlers.createPlayer?.(payload) ?? { data: null, error: null }
          })
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => handlers.updatePlayer?.(payload) ?? { error: null }
            })
          })
        })
      };
    }
  };
}

describe("admin players global routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSupabaseAdminMock.mockReset();
  });

  it("GET includes membership clubs", async () => {
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin({
        listPlayers: () => ({
          data: [
            {
              id: "p1",
              name: "Alice",
              active: true,
              splitwise_user_id: 123,
              avatar_path: null,
              club_players: [{ club_id: "c1", clubs: { name: "Club A" } }]
            }
          ],
          error: null
        })
      })
    );

    const response = await GET(new Request("http://localhost/api/admin/players"));
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    const players = body.players as Array<Record<string, unknown>>;
    expect(players[0]?.clubs).toEqual([{ id: "c1", name: "Club A" }]);
  });

  it("POST returns 400 when duplicate name", async () => {
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin({
        createPlayer: () => ({
          data: null,
          error: { code: "23505", message: "duplicate key value violates unique constraint" }
        })
      })
    );

    const response = await POST(
      new Request("http://localhost/api/admin/players", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Alice" })
      })
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Player name already exists.");
  });

  it("PATCH returns 400 on invalid splitwiseUserId", async () => {
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin({
        updatePlayer: () => ({ error: null }),
        fetchPlayer: () => ({ data: { id: "p1", name: "Alice", active: true }, error: null })
      })
    );

    const response = await PATCH(
      new Request("http://localhost/api/admin/players/p1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ splitwiseUserId: "nope" })
      }),
      { params: Promise.resolve({ id: "p1" }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });
});
