import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminMock } = vi.hoisted(() => {
  return {
    getSupabaseAdminMock: vi.fn()
  };
});

vi.mock("../src/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock
}));

import { POST } from "../src/app/api/admin/ingestion/preview/route";

const ORIGINAL_ENV = { ...process.env };

type SupabaseLookupRow = {
  gmail_message_id?: string;
  parse_status?: string | null;
  parse_error?: string | null;
  parsed_session_date?: string | null;
  id?: string;
  session_date?: string;
  status?: string | null;
};

function makeSupabaseAdmin(
  receiptRows: SupabaseLookupRow[],
  sessionRows: SupabaseLookupRow[],
  options?: {
    receiptError?: { message: string } | null;
    sessionError?: { message: string } | null;
  }
) {
  return {
    from: (table: string) => ({
      select: () => ({
        in: async () => {
          if (table === "email_receipts") {
            return { data: receiptRows, error: options?.receiptError ?? null };
          }
          if (table === "sessions") {
            return { data: sessionRows, error: options?.sessionError ?? null };
          }
          return { data: [], error: null };
        }
      })
    })
  };
}

describe("admin ingestion preview route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getSupabaseAdminMock.mockReset();
    process.env = {
      ...ORIGINAL_ENV,
      APPS_SCRIPT_BRIDGE_URL: "https://bridge.example.com/webhook",
      APPS_SCRIPT_BRIDGE_SECRET: "bridge-secret"
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("merges bridge preview messages with ingestion/session statuses", async () => {
    getSupabaseAdminMock.mockReturnValue(
      makeSupabaseAdmin(
        [
          {
            gmail_message_id: "m1",
            parse_status: "SUCCESS",
            parse_error: null,
            parsed_session_date: "2026-02-20"
          }
        ],
        [
          {
            id: "session-1",
            session_date: "2026-02-20",
            status: "OPEN"
          }
        ]
      )
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          query: 'newer_than:7d subject:"Playtomic" subject:"Receipt"',
          messages: [
            {
              id: "m1",
              rawHtml: "<p>receipt</p>",
              rawText: "receipt"
            }
          ]
        }),
        { status: 200 }
      )
    );

    const response = await POST(
      new Request("http://localhost/api/admin/ingestion/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "subject:test" })
      })
    );
    const body = (await response.json()) as Record<string, unknown>;
    const messages = body.messages as Array<Record<string, unknown>>;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://bridge.example.com/webhook");
    expect(JSON.parse(String(init.body))).toEqual({
      action: "preview",
      secret: "bridge-secret",
      query: "subject:test"
    });
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(messages[0]?.status).toBe("SESSION_CREATED");
    expect(messages[0]?.sessionId).toBe("session-1");
  });

  it("returns 500 when bridge responds with ok=false", async () => {
    getSupabaseAdminMock.mockReturnValue(makeSupabaseAdmin([], []));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: "bridge_unavailable"
        }),
        { status: 200 }
      )
    );

    const response = await POST(
      new Request("http://localhost/api/admin/ingestion/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("bridge_unavailable");
  });
});
