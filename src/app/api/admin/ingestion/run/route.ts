import { NextResponse } from "next/server";
import { callAppsScriptBridge } from "../../../../../lib/apps-script-bridge";

const MAX_MANUAL_MESSAGE_IDS = 500;
const ROW_RERUN_MODE = "ROW_MESSAGE";

function normalizeMessageIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (seen.size >= MAX_MANUAL_MESSAGE_IDS) break;
  }
  return [...seen];
}

export async function POST(request: Request) {
  try {
    const requestBody = (await request.json().catch(() => null)) as {
      query?: unknown;
      messageIds?: unknown;
      rerunMode?: unknown;
    } | null;
    const query = typeof requestBody?.query === "string" ? requestBody.query.trim() : "";
    const messageIds = normalizeMessageIds(requestBody?.messageIds);
    const rerunMode = requestBody?.rerunMode === ROW_RERUN_MODE ? ROW_RERUN_MODE : undefined;
    const payload: { query?: string; messageIds?: string[]; rerunMode?: "ROW_MESSAGE" } = {};
    if (query) {
      payload.query = query;
    }
    if (messageIds.length > 0) {
      payload.messageIds = messageIds;
    }
    if (rerunMode && messageIds.length > 0) {
      payload.rerunMode = rerunMode;
    }

    const { response, data } = await callAppsScriptBridge(
      "manual_ingest",
      Object.keys(payload).length > 0 ? payload : undefined
    );
    const isRowRerun = rerunMode === ROW_RERUN_MODE && messageIds.length > 0;
    const debug = isRowRerun
      ? {
          request: {
            rerunMode: ROW_RERUN_MODE,
            messageIds,
            requestedAt: new Date().toISOString()
          },
          bridge: {
            httpStatus: response.status,
            responseOk: response.ok,
            ok: typeof data?.ok === "boolean" ? data.ok : null,
            error: typeof data?.error === "string" ? data.error : null,
            total: typeof data?.total === "number" ? data.total : null,
            ingested: typeof data?.ingested === "number" ? data.ingested : null,
            deduped: typeof data?.deduped === "number" ? data.deduped : null,
            parse_failed: typeof data?.parse_failed === "number" ? data.parse_failed : null,
            fetch_failed: typeof data?.fetch_failed === "number" ? data.fetch_failed : null,
            supports_outcomes: Boolean(data && (data as Record<string, unknown>).supports_outcomes),
            bridge_version:
              data && typeof (data as Record<string, unknown>).bridge_version === "string"
                ? ((data as Record<string, unknown>).bridge_version as string)
                : null
          },
          entries: Array.isArray((data as Record<string, unknown> | null)?.debug_entries)
            ? ((data as Record<string, unknown>).debug_entries as unknown[])
            : messageIds.map((messageId) => ({
                messageId,
                source: "api_fallback",
                found_in_gmail: null,
                ingest_http_status: null,
                ingest_response_error: "missing_debug_entry",
                outcome_status: "FETCH_FAILED",
                outcome_reason: "missing_debug_entry",
                processed_at: new Date().toISOString()
              })),
          fallback_resolution: null
        }
      : null;
    if (!response.ok) {
      return NextResponse.json(
        {
          ...(data ?? { ok: false, error: "run_ingestion_failed" }),
          ...(debug ? { debug } : {})
        },
        { status: response.status }
      );
    }
    if (!data?.ok) {
      return NextResponse.json(
        {
          ...(data ?? { ok: false, error: "run_ingestion_failed" }),
          ...(debug ? { debug } : {})
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ...(data ?? { ok: true }),
      ...(debug ? { debug } : {})
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "run_ingestion_failed",
      debug: {
        request: {
          rerunMode: ROW_RERUN_MODE,
          messageIds: [],
          requestedAt: new Date().toISOString()
        },
        bridge: null,
        entries: [],
        fallback_resolution: null
      }
    }, { status: 500 });
  }
}
