import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type ScriptContext = {
  Logger: { log: ReturnType<typeof vi.fn> };
  UrlFetchApp: { fetch: ReturnType<typeof vi.fn> };
  runIngestionWithHistory_: (options?: {
    runSource?: string;
    query?: string;
    messageIds?: string[];
    rerunMode?: "ROW_MESSAGE";
  }) => Record<string, unknown>;
  logIngestionRun_: (input: {
    runSource?: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    summary?: Record<string, unknown> | null;
    errorMessage?: string | null;
  }) => {
    ok: boolean;
    statusCode: number | null;
    error: string | null;
  };
  processIngestion_: (options?: { query?: string; messageIds?: string[]; rerunMode?: "ROW_MESSAGE" }) => Record<string, unknown>;
  fetchCandidateMessages_: (query: string, limit: number) => unknown[];
  callIngestReceipts_: (config: unknown, message: unknown) => {
    ok: boolean;
    deduped: boolean;
    parseFailed: boolean;
    reason?: string | null;
    httpStatus?: number | null;
    responseError?: string | null;
  };
  GmailApp: {
    search: ReturnType<typeof vi.fn>;
    getMessageById: ReturnType<typeof vi.fn>;
    getUserLabelByName: ReturnType<typeof vi.fn>;
    createLabel: ReturnType<typeof vi.fn>;
  };
};

function loadScript(): ScriptContext {
  const scriptPath = path.resolve(process.cwd(), "scripts/gmail-apps-script-bridge.js");
  const code = fs.readFileSync(scriptPath, "utf8");

  const scriptProperties: Record<string, string> = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon-key",
    AUTOMATION_SECRET: "automation-secret",
    BRIDGE_SECRET: "bridge-secret"
  };

  const context = {
    Logger: { log: vi.fn() },
    UrlFetchApp: { fetch: vi.fn() },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key: string) {
            return scriptProperties[key] ?? null;
          }
        };
      }
    },
    GmailApp: {
      search: vi.fn(() => []),
      getMessageById: vi.fn(() => null),
      getUserLabelByName: vi.fn(() => ({ getName: () => "club-genie/ingested" })),
      createLabel: vi.fn(() => ({ getName: () => "club-genie/ingested" }))
    },
    ScriptApp: {
      getProjectTriggers: vi.fn(() => []),
      deleteTrigger: vi.fn(),
      newTrigger: vi.fn(() => ({
        timeBased() {
          return this;
        },
        everyDays() {
          return this;
        },
        atHour() {
          return this;
        },
        nearMinute() {
          return this;
        },
        create() {
          return this;
        }
      }))
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(text: string) {
        return {
          setMimeType() {
            return text;
          }
        };
      }
    }
  } as unknown as ScriptContext;

  vm.createContext(context as unknown as vm.Context);
  vm.runInContext(code, context as unknown as vm.Context, { filename: scriptPath });

  return context;
}

describe("gmail Apps Script bridge history logging", () => {
  function makeMessage(id: string) {
    const thread = { addLabel: vi.fn() };
    return {
      getId: () => id,
      getBody: () => "<p>receipt</p>",
      getPlainBody: () => "receipt",
      getThread: () => thread
    };
  }

  it("returns log failure details when log-ingestion-run responds non-2xx", () => {
    const context = loadScript();
    context.UrlFetchApp.fetch.mockReturnValue({
      getResponseCode: () => 500,
      getContentText: () => JSON.stringify({ ok: false, error: "db_unavailable" })
    });

    const result = context.logIngestionRun_({
      runSource: "API",
      status: "SUCCESS",
      startedAt: new Date("2026-02-18T23:25:34.000Z"),
      finishedAt: new Date("2026-02-18T23:25:34.000Z"),
      durationMs: 0,
      summary: { total: 0 }
    });

    expect(result).toEqual({
      ok: false,
      statusCode: 500,
      error: "http_500: db_unavailable"
    });
    expect(context.Logger.log).toHaveBeenCalledWith("log-ingestion-run failed: http_500: db_unavailable");
  });

  it("includes history logging status in successful run result", () => {
    const context = loadScript();
    context.processIngestion_ = vi.fn(() => ({
      ok: true,
      query: "newer_than:30d",
      total: 0,
      ingested: 0,
      deduped: 0,
      parse_failed: 0,
      fetch_failed: 0
    }));
    context.logIngestionRun_ = vi.fn(() => ({
      ok: false,
      statusCode: 403,
      error: "http_403: unauthorized"
    }));

    const result = context.runIngestionWithHistory_({ runSource: "API" });

    expect(result).toMatchObject({
      ok: true,
      total: 0,
      history_logged: false,
      history_log_status: 403,
      history_log_error: "http_403: unauthorized"
    });
    expect(context.logIngestionRun_).toHaveBeenCalledTimes(1);
  });

  it("includes history logging status in failure result", () => {
    const context = loadScript();
    context.processIngestion_ = vi.fn(() => {
      throw new Error("ingestion_failed");
    });
    context.logIngestionRun_ = vi.fn(() => ({
      ok: true,
      statusCode: 200,
      error: null
    }));

    const result = context.runIngestionWithHistory_({ runSource: "API" });

    expect(result).toMatchObject({
      ok: false,
      error: "ingestion_failed",
      history_logged: true,
      history_log_status: 200,
      history_log_error: null
    });
    expect(context.logIngestionRun_).toHaveBeenCalledTimes(1);
  });

  it("processes forced message IDs in addition to query matches", () => {
    const context = loadScript();
    const queryMessage = makeMessage("query-1");
    const forcedMessage = makeMessage("forced-1");
    context.fetchCandidateMessages_ = vi.fn(() => [queryMessage]);
    context.callIngestReceipts_ = vi.fn((_: unknown, message: unknown) => {
      const candidate = message as { getId: () => string };
      if (candidate.getId() === "query-1") {
        return { ok: true, deduped: false, parseFailed: false };
      }
      return { ok: true, deduped: true, parseFailed: false };
    });
    context.GmailApp.getMessageById.mockImplementation((id: string) => (id === "forced-1" ? forcedMessage : null));

    const result = context.processIngestion_({
      query: "subject:test",
      messageIds: ["forced-1", "query-1", "forced-1"]
    }) as Record<string, unknown>;

    expect(result.total).toBe(2);
    expect(result.ingested).toBe(1);
    expect(result.deduped).toBe(1);
    expect(result.fetch_failed).toBe(0);
    expect(result.outcomes).toEqual([
      { messageId: "query-1", status: "INGESTED", reason: null },
      { messageId: "forced-1", status: "DEDUPED", reason: "already_ingested" }
    ]);
    expect(Array.isArray(result.debug_entries)).toBe(true);
    expect((result.debug_entries as unknown[]).length).toBe(2);
    expect(context.GmailApp.getMessageById).toHaveBeenCalledTimes(1);
    expect(context.GmailApp.getMessageById).toHaveBeenCalledWith("forced-1");
  });

  it("counts forced ID lookup failures without aborting the run", () => {
    const context = loadScript();
    const forcedMessage = makeMessage("forced-fail");
    context.fetchCandidateMessages_ = vi.fn(() => []);
    context.callIngestReceipts_ = vi.fn(() => ({ ok: false, deduped: false, parseFailed: false }));
    context.GmailApp.getMessageById.mockImplementation((id: string) => {
      if (id === "missing-id") return null;
      if (id === "boom-id") throw new Error("lookup_failed");
      if (id === "forced-fail") return forcedMessage;
      return null;
    });

    const result = context.processIngestion_({
      query: "subject:test",
      messageIds: ["missing-id", "boom-id", "forced-fail", "forced-fail"]
    }) as Record<string, unknown>;

    expect(result.total).toBe(3);
    expect(result.ingested).toBe(0);
    expect(result.deduped).toBe(0);
    expect(result.parse_failed).toBe(0);
    expect(result.fetch_failed).toBe(3);
    expect(result.outcomes).toEqual([
      { messageId: "missing-id", status: "FETCH_FAILED", reason: "gmail_message_not_found" },
      { messageId: "boom-id", status: "FETCH_FAILED", reason: "unexpected_error" },
      { messageId: "forced-fail", status: "FETCH_FAILED", reason: "ingest_failed" }
    ]);
    expect(Array.isArray(result.debug_entries)).toBe(true);
    expect((result.debug_entries as unknown[]).length).toBe(3);
  });

  it("row rerun mode processes only provided message ids", () => {
    const context = loadScript();
    const queryMessage = makeMessage("query-1");
    const forcedMessage = makeMessage("forced-1");
    context.fetchCandidateMessages_ = vi.fn(() => [queryMessage]);
    context.callIngestReceipts_ = vi.fn(() => ({ ok: true, deduped: false, parseFailed: false, reason: null }));
    context.GmailApp.getMessageById.mockImplementation((id: string) => (id === "forced-1" ? forcedMessage : null));

    const result = context.processIngestion_({
      query: "subject:test",
      messageIds: ["forced-1"],
      rerunMode: "ROW_MESSAGE"
    }) as Record<string, unknown>;

    expect(result.total).toBe(1);
    expect(result.ingested).toBe(1);
    expect(result.deduped).toBe(0);
    expect(result.outcomes).toEqual([{ messageId: "forced-1", status: "INGESTED", reason: null }]);
    expect(Array.isArray(result.debug_entries)).toBe(true);
    expect((result.debug_entries as unknown[]).length).toBe(1);
    expect(context.fetchCandidateMessages_).not.toHaveBeenCalled();
    expect(context.GmailApp.getMessageById).toHaveBeenCalledWith("forced-1");
  });
});
