import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../lib/supabase/admin";

export async function DELETE(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: rawExpenseId } = await context.params;
  const expenseId = (rawExpenseId ?? "").trim();
  if (!expenseId) {
    return NextResponse.json({ ok: false, error: "Missing expense id." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: expense, error: lookupError } = await supabaseAdmin
    .from("expenses")
    .select("id,session_id,status,splitwise_expense_id")
    .eq("id", expenseId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  }
  if (!expense) {
    return NextResponse.json({ ok: false, error: "Splitwise record not found." }, { status: 404 });
  }

  const sessionId = typeof expense.session_id === "string" ? expense.session_id : "";
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Splitwise record missing session link." }, { status: 500 });
  }

  const { error: deleteError } = await supabaseAdmin.from("expenses").delete().eq("id", expenseId);
  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  const { data: remaining, error: remainingError } = await supabaseAdmin
    .from("expenses")
    .select("status,splitwise_expense_id")
    .eq("session_id", sessionId);
  if (remainingError) {
    return NextResponse.json({ ok: false, error: remainingError.message }, { status: 500 });
  }

  const rows = Array.isArray(remaining) ? remaining : [];
  const hasCreated = rows.some(
    (row) =>
      row?.status === "CREATED" &&
      typeof row?.splitwise_expense_id === "string" &&
      row.splitwise_expense_id.trim().length > 0
  );
  const hasFailed = rows.some((row) => row?.status === "FAILED");
  const nextStatus = hasFailed ? "FAILED" : hasCreated ? "CREATED" : "PENDING";

  await supabaseAdmin
    .from("sessions")
    .update({ splitwise_status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ ok: true });
}
