import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type ScriptContext = {
  Logger: { log: ReturnType<typeof vi.fn> };
  UrlFetchApp: { fetch: ReturnType<typeof vi.fn> };
  runIngestionWithHistory_: (options?: { runSource?: string; query?: string }) => Record<string, unknown>;
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
  processIngestion_: ReturnType<typeof vi.fn>;
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
});
