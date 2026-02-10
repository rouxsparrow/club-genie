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

  const baseUpdate = {
    session_date: payload.session_date,
    status: payload.status,
    start_time: payload.start_time,
    end_time: payload.end_time,
    total_fee: payload.total_fee
  };

  const updateCandidates = [
    { ...baseUpdate, location: payload.location, remarks: payload.remarks },
    { ...baseUpdate, remarks: payload.remarks },
    { ...baseUpdate, location: payload.location },
    { ...baseUpdate }
  ];

  let updateResult = await supabaseAdmin.from("sessions").update(updateCandidates[0]).eq("id", id);
  for (let i = 1; i < updateCandidates.length && updateResult.error; i += 1) {
    const message = updateResult.error.message ?? "";
    if (!message.includes("location") && !message.includes("remarks")) {
      break;
    }
    updateResult = await supabaseAdmin.from("sessions").update(updateCandidates[i]).eq("id", id);
  }

  const updateError = updateResult.error;

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
