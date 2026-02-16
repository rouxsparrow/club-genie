import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { callAppsScriptBridge } from "../../../../../lib/apps-script-bridge";
import { mergeEmailPreviewStatuses, normalizeEmailPreviewMessages } from "../../../../../lib/ingestion-preview";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requestBody = (await request.json().catch(() => null)) as { query?: unknown } | null;
    const query = typeof requestBody?.query === "string" ? requestBody.query.trim() : "";

    const { response, data } = await callAppsScriptBridge("preview", query ? { query } : undefined);
    if (!response.ok) {
      return NextResponse.json(data ?? { ok: false, error: "fetch_receipts_failed" }, { status: response.status });
    }
    if (!data?.ok) {
      return NextResponse.json(data ?? { ok: false, error: "fetch_receipts_failed" }, { status: 500 });
    }

    const messages = normalizeEmailPreviewMessages(data?.messages);
    const messageIds = messages.map((message) => message.id);

    let receiptRows: Array<{
      gmail_message_id: string;
      parse_status: string | null;
      parse_error: string | null;
      parsed_session_date: string | null;
    }> = [];
    if (messageIds.length > 0) {
      const { data: rows, error } = await supabaseAdmin
        .from("email_receipts")
        .select("gmail_message_id,parse_status,parse_error,parsed_session_date")
        .in("gmail_message_id", messageIds);
      if (error) {
        return NextResponse.json({ ok: false, error: "receipt_status_lookup_failed" }, { status: 500 });
      }
      receiptRows = rows ?? [];
    }

    const sessionDates = [
      ...new Set(receiptRows.map((row) => row.parsed_session_date).filter((date): date is string => Boolean(date)))
    ];
    let sessionRows: Array<{ id: string; session_date: string; status: string | null }> = [];
    if (sessionDates.length > 0) {
      const { data: rows, error } = await supabaseAdmin
        .from("sessions")
        .select("id,session_date,status")
        .in("session_date", sessionDates);
      if (error) {
        return NextResponse.json({ ok: false, error: "session_status_lookup_failed" }, { status: 500 });
      }
      sessionRows = rows ?? [];
    }

    return NextResponse.json({
      ok: true,
      query: typeof data?.query === "string" ? data.query : null,
      timezone: typeof data?.timezone === "string" ? data.timezone : null,
      messages: mergeEmailPreviewStatuses(messages, receiptRows, sessionRows)
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "fetch_receipts_failed" },
      { status: 500 }
    );
  }
}
