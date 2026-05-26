import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminMock } = vi.hoisted(() => {
  return {
    getSupabaseAdminMock: vi.fn()
  };
});

vi.mock("../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock
}));

import { POST } from "../src/app/api/admin/clubs/[id]/members/route";
import { PATCH, DELETE } from "../src/app/api/admin/clubs/[id]/members/[playerId]/route";

function makeSupabaseAdmin(handlers: {
  createPlayer?: (payload: Record<string, unknown>) => { data: unknown; error: unknown };
  upsertMember?: (payload: Record<string, unknown>) => { error: unknown };
  fetchMember?: () => { data: unknown; error: unknown };
  clearDefaultPayer?: () => { error: unknown };
  updateMember?: (updates: Record<string, unknown>) => { error: unknown };
  deleteMember?: () => { error: unknown };
}) {
  return {
    from: (table: string) => {
      if (table === "players") {
        return {
          insert: (payload: Record<string, unknown>) => ({
            select: () => ({
              maybeSingle: async () => handlers.createPlayer?.(payload) ?? { data: null, error: null }
            })
          })
        };
      }

      if (table === "club_players") {
        return {
          upsert: async (payload: Record<string, unknown>) => handlers.upsertMember?.(payload) ?? { error: null },
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => handlers.fetchMember?.() ?? { data: null, error: null }
              }),
              maybeSingle: async () => handlers.fetchMember?.() ?? { data: null, error: null }
            })
          }),
          update: (updates: Record<string, unknown>) => ({
            eq: () => {
              const isClearDefault =
                Object.keys(updates).length === 1 &&
                updates.is_default_payer === false;

              if (isClearDefault) {
                return {
                  eq: async () => handlers.clearDefaultPayer?.() ?? { error: null }
                };
              }

              return {
                eq: () => ({
                  select: () => ({
                    maybeSingle: async () => handlers.updateMember?.(updates) ?? { error: null }
                  })
                })
              };
            }
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => handlers.deleteMember?.() ?? { error: null }
            })
          })
        };
      }

      return {};
    }
  };
}

describe("admin club members routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSupabaseAdminMock.mockReset();
  });

  it("POST create+add returns 400 on invalid splitwiseUserId", async () => {
    getSupabaseAdminMock.mockReturnValue(makeSupabaseAdmin({}));
    const response = await POST(
      new Request("http://localhost/api/admin/clubs/c1/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Alice", splitwiseUserId: "nope" })
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("POST create+add returns 400 on duplicate player name", async () => {
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin({
        createPlayer: () => ({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } })
      })
    );

    const response = await POST(
      new Request("http://localhost/api/admin/clubs/c1/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Alice" })
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Player name already exists.");
  });

  it("PATCH setting isDefaultPayer clears previous default", async () => {
    const clearDefaultPayer = vi.fn(() => ({ error: null }));
    const updateMember = vi.fn(() => ({ error: null }));
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin({
        clearDefaultPayer,
        updateMember
      })
    );

    const response = await PATCH(
      new Request("http://localhost/api/admin/clubs/c1/members/p1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefaultPayer: true })
      }),
      { params: Promise.resolve({ id: "c1", playerId: "p1" }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(clearDefaultPayer).toHaveBeenCalledTimes(1);
    expect(updateMember).toHaveBeenCalledTimes(1);
  });

  it("DELETE removes membership row", async () => {
    const deleteMember = vi.fn(() => ({ error: null }));
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin({
        deleteMember
      })
    );

    const response = await DELETE(
      new Request("http://localhost/api/admin/clubs/c1/members/p1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "c1", playerId: "p1" }) }
    );
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(deleteMember).toHaveBeenCalledTimes(1);
  });
});
