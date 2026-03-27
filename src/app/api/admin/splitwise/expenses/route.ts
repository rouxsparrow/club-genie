import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "").trim().toUpperCase();
  const limitRaw = (url.searchParams.get("limit") ?? "").trim();
  const limit = Math.min(100, Math.max(1, Number(limitRaw || "50") || 50));

  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin
    .from("expenses")
    .select(
      "id,session_id,expense_type,splitwise_expense_id,amount,status,last_error,request_payload,updated_at,created_at,session:sessions(id,session_date,status,splitwise_status,location)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "PENDING" || status === "CREATED" || status === "FAILED") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const records = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const requestPayload =
      record.request_payload && typeof record.request_payload === "object"
        ? (record.request_payload as Record<string, unknown>)
        : null;
    const note = requestPayload && typeof requestPayload.details === "string" ? requestPayload.details : null;
    return {
      ...record,
      note
    };
  });

  return NextResponse.json({ ok: true, records });
}
