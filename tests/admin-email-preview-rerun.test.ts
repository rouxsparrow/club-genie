import { describe, expect, it } from "vitest";
import {
  buildSingleEmailRerunPayload,
  collectNotIngestedMessageIds,
  isEmailPreviewRerunnable
} from "../src/lib/admin-email-preview-rerun";

describe("admin email preview rerun helpers", () => {
  it("marks only NOT_INGESTED as rerunnable", () => {
    expect(isEmailPreviewRerunnable("NOT_INGESTED")).toBe(true);
    expect(isEmailPreviewRerunnable("PARSE_FAILED")).toBe(false);
    expect(isEmailPreviewRerunnable("SESSION_CREATED")).toBe(false);
    expect(isEmailPreviewRerunnable("INGESTED_NO_SESSION")).toBe(false);
  });

  it("collects unique trimmed message ids for not ingested messages", () => {
    const ids = collectNotIngestedMessageIds([
      { id: " mid-1 ", status: "NOT_INGESTED" },
      { id: "mid-2", status: "NOT_INGESTED" },
      { id: "mid-1", status: "NOT_INGESTED" },
      { id: "mid-3", status: "PARSE_FAILED" },
      { id: "", status: "NOT_INGESTED" }
    ]);

    expect(ids).toEqual(["mid-1", "mid-2"]);
  });

  it("builds single-id rerun payload and rejects blank ids", () => {
    expect(buildSingleEmailRerunPayload(" m-1 ")).toEqual({ messageIds: ["m-1"], rerunMode: "ROW_MESSAGE" });
    expect(buildSingleEmailRerunPayload("   ")).toBeNull();
  });
});
