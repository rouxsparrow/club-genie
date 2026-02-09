import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

type CourtInput = {
  court_label?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json()) as {
    session_date?: string;
    status?: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    total_fee?: number | null;
    remarks?: string | null;
    courts?: CourtInput[];
  };

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({
      session_date: payload.session_date,
      status: payload.status,
      start_time: payload.start_time,
      end_time: payload.end_time,
      location: payload.location,
      total_fee: payload.total_fee,
      remarks: payload.remarks
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  if (payload.courts) {
    const { error: deleteError } = await supabaseAdmin.from("courts").delete().eq("session_id", id);
    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    if (payload.courts.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("courts").insert(
        payload.courts.map((court) => ({
          session_id: id,
          court_label: court.court_label ?? null,
          start_time: court.start_time ?? null,
          end_time: court.end_time ?? null
        }))
      );
      if (insertError) {
        return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
