import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/admin/ingestion/run/route";

const ORIGINAL_ENV = { ...process.env };

describe("admin ingestion run route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it("calls Apps Script bridge manual ingest action", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          total: 3,
          ingested: 1,
          deduped: 2,
          parse_failed: 0,
          fetch_failed: 0
        }),
        { status: 200 }
      )
    );

    const response = await POST(
      new Request("http://localhost/api/admin/ingestion/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://bridge.example.com/webhook");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      action: "manual_ingest",
      secret: "bridge-secret"
    });
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.debug).toBeUndefined();
    expect(body.total).toBe(3);
  });

  it("returns a 500 response when bridge payload is not ok", async () => {
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
      new Request("http://localhost/api/admin/ingestion/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("bridge_unavailable");
    expect(body.debug).toBeUndefined();
  });

  it("forwards sanitized message ids in manual ingest payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          total: 2,
          ingested: 1,
          deduped: 1,
          parse_failed: 0,
          fetch_failed: 0,
          outcomes: [{ messageId: "mid-1", status: "DEDUPED", reason: "already_ingested" }]
        }),
        { status: 200 }
      )
    );

    const response = await POST(
      new Request("http://localhost/api/admin/ingestion/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageIds: ["  mid-1  ", "", "mid-2", "mid-1", 123, null],
          rerunMode: "ROW_MESSAGE"
        })
      })
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://bridge.example.com/webhook");
    expect(JSON.parse(String(init.body))).toEqual({
      action: "manual_ingest",
      secret: "bridge-secret",
      messageIds: ["mid-1", "mid-2"],
      rerunMode: "ROW_MESSAGE"
    });
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.outcomes).toEqual([{ messageId: "mid-1", status: "DEDUPED", reason: "already_ingested" }]);
    expect(body.debug).toBeTruthy();
    const debug = body.debug as Record<string, unknown>;
    expect(debug.request).toBeTruthy();
    expect(debug.bridge).toBeTruthy();
    expect(Array.isArray(debug.entries)).toBe(true);
  });
});
