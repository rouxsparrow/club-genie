import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

type CourtInput = {
  court_label?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export async function POST(request: Request) {
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

  if (!payload.session_date) {
    return NextResponse.json({ ok: false, error: "Session date is required." }, { status: 400 });
  }

  const baseInsert = {
    session_date: payload.session_date,
    status: payload.status ?? "DRAFT",
    start_time: payload.start_time,
    end_time: payload.end_time,
    total_fee: payload.total_fee
  };

  const insertCandidates = [
    { ...baseInsert, location: payload.location, remarks: payload.remarks },
    { ...baseInsert, remarks: payload.remarks },
    { ...baseInsert, location: payload.location },
    { ...baseInsert }
  ];

  let sessionInsert = await supabaseAdmin.from("sessions").insert(insertCandidates[0]).select("id").single();
  for (let i = 1; i < insertCandidates.length && sessionInsert.error; i += 1) {
    const message = sessionInsert.error.message ?? "";
    if (!message.includes("location") && !message.includes("remarks")) {
      break;
    }
    sessionInsert = await supabaseAdmin.from("sessions").insert(insertCandidates[i]).select("id").single();
  }

  const session = sessionInsert.data;
  const error = sessionInsert.error;

  if (error || !session) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Failed to create session." }, { status: 500 });
  }

  const courts = payload.courts ?? [];
  if (courts.length > 0) {
    const { error: courtsError } = await supabaseAdmin.from("courts").insert(
      courts.map((court) => ({
        session_id: session.id,
        court_label: court.court_label ?? null,
        start_time: court.start_time ?? null,
        end_time: court.end_time ?? null
      }))
    );
    if (courtsError) {
      return NextResponse.json(
        { ok: false, error: courtsError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, id: session.id });
}
