import { describe, expect, it } from "vitest";
import {
  MAX_EMAIL_PREVIEW_CHARS,
  mergeEmailPreviewStatuses,
  normalizeEmailPreviewMessages
} from "../src/lib/ingestion-preview";

describe("normalizeEmailPreviewMessages", () => {
  it("returns only valid message rows", () => {
    const messages = normalizeEmailPreviewMessages([
      { id: "abc", rawText: "hello", rawHtml: "<p>hello</p>" },
      { id: " ", rawText: "ignore" },
      null
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: "abc",
      rawText: "hello",
      rawHtml: "<p>hello</p>",
      textLength: 5,
      htmlLength: 12,
      textTruncated: false,
      htmlTruncated: false
    });
  });

  it("truncates text and html content beyond max limit", () => {
    const longBody = "x".repeat(MAX_EMAIL_PREVIEW_CHARS + 5);
    const messages = normalizeEmailPreviewMessages([{ id: "abc", rawText: longBody, rawHtml: longBody }]);

    expect(messages).toHaveLength(1);
    expect(messages[0].rawText?.length).toBe(MAX_EMAIL_PREVIEW_CHARS);
    expect(messages[0].rawHtml?.length).toBe(MAX_EMAIL_PREVIEW_CHARS);
    expect(messages[0].textLength).toBe(MAX_EMAIL_PREVIEW_CHARS + 5);
    expect(messages[0].htmlLength).toBe(MAX_EMAIL_PREVIEW_CHARS + 5);
    expect(messages[0].textTruncated).toBe(true);
    expect(messages[0].htmlTruncated).toBe(true);
  });

  it("maps message statuses from receipts and sessions", () => {
    const messages = normalizeEmailPreviewMessages([
      { id: "m-created", rawText: "a", rawHtml: "<p>a</p>" },
      { id: "m-failed", rawText: "b", rawHtml: "<p>b</p>" },
      { id: "m-pending", rawText: "c", rawHtml: "<p>c</p>" },
      { id: "m-nosession", rawText: "d", rawHtml: "<p>d</p>" }
    ]);

    const merged = mergeEmailPreviewStatuses(
      messages,
      [
        {
          gmail_message_id: "m-created",
          parse_status: "SUCCESS",
          parse_error: null,
          parsed_session_date: "2026-02-15"
        },
        {
          gmail_message_id: "m-failed",
          parse_status: "FAILED",
          parse_error: "missing_session_date",
          parsed_session_date: null
        },
        {
          gmail_message_id: "m-nosession",
          parse_status: "SUCCESS",
          parse_error: null,
          parsed_session_date: "2026-02-16"
        }
      ],
      [
        {
          id: "session-1",
          session_date: "2026-02-15",
          status: "OPEN"
        }
      ]
    );

    expect(merged.find((message) => message.id === "m-created")?.status).toBe("SESSION_CREATED");
    expect(merged.find((message) => message.id === "m-created")?.sessionId).toBe("session-1");
    expect(merged.find((message) => message.id === "m-failed")?.status).toBe("PARSE_FAILED");
    expect(merged.find((message) => message.id === "m-failed")?.parseError).toBe("missing_session_date");
    expect(merged.find((message) => message.id === "m-pending")?.status).toBe("NOT_INGESTED");
    expect(merged.find((message) => message.id === "m-nosession")?.status).toBe("INGESTED_NO_SESSION");
  });
});
