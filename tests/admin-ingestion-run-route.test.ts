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

    const response = await POST();
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

    const response = await POST();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("bridge_unavailable");
  });
});
