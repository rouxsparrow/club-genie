import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../lib/supabase/admin";

export async function DELETE(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const id = (sessionId ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: expense, error: lookupError } = await supabaseAdmin
    .from("expenses")
    .select("id,session_id,status,splitwise_expense_id")
    .eq("session_id", id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ ok: false, error: lookupError.message }, { status: 500 });
  }
  if (!expense) {
    return NextResponse.json({ ok: false, error: "Splitwise record not found." }, { status: 404 });
  }

  const status = typeof expense.status === "string" ? expense.status : "";
  const splitwiseId = typeof expense.splitwise_expense_id === "string" && expense.splitwise_expense_id.trim() ? expense.splitwise_expense_id.trim() : null;

  const { error: deleteError } = await supabaseAdmin.from("expenses").delete().eq("session_id", id);
  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  // If this expense was already created in Splitwise, keep session as CREATED to avoid duplicate creation.
  // Otherwise, reset to PENDING so it can be retried.
  const nextStatus = status === "CREATED" && splitwiseId ? "CREATED" : "PENDING";
  await supabaseAdmin
    .from("sessions")
    .update({ splitwise_status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
