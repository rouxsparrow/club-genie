import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

type CourtInput = {
  court_label?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

async function resolveDefaultPayerId(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id")
    .eq("is_default_payer", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("is_default_payer")) {
      throw new Error("missing_splitwise_player_columns");
    }
    throw new Error("default_payer_lookup_failed");
  }

  const payerId = typeof data?.id === "string" && data.id.trim() ? data.id : null;
  if (!payerId) {
    throw new Error("missing_default_payer");
  }
  return payerId;
}

async function ensurePlayerExists(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, playerId: string) {
  const { data, error } = await supabaseAdmin.from("players").select("id").eq("id", playerId).maybeSingle();
  if (error) {
    throw new Error("payer_lookup_failed");
  }
  return Boolean(data?.id);
}

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
    payerPlayerId?: string | null;
    courts?: CourtInput[];
  };

  if (!payload.session_date) {
    return NextResponse.json({ ok: false, error: "Session date is required." }, { status: 400 });
  }

  let payerPlayerId: string;
  try {
    const incoming = typeof payload.payerPlayerId === "string" ? payload.payerPlayerId.trim() : payload.payerPlayerId;
    if (!incoming) {
      payerPlayerId = await resolveDefaultPayerId(supabaseAdmin);
    } else {
      const exists = await ensurePlayerExists(supabaseAdmin, incoming);
      if (!exists) {
        return NextResponse.json({ ok: false, error: "Selected payer does not exist." }, { status: 400 });
      }
      payerPlayerId = incoming;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "payer_resolve_failed";
    if (message === "missing_default_payer") {
      return NextResponse.json(
        { ok: false, error: "No default payer configured. Set one in Admin > Players first." },
        { status: 400 }
      );
    }
    if (message === "missing_splitwise_player_columns") {
      return NextResponse.json(
        { ok: false, error: "Player Splitwise columns missing; apply migration 20260215230000." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "Failed to resolve payer." }, { status: 500 });
  }

  const baseInsert = {
    session_date: payload.session_date,
    status: payload.status ?? "DRAFT",
    start_time: payload.start_time,
    end_time: payload.end_time,
    total_fee: payload.total_fee,
    payer_player_id: payerPlayerId
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
    if (message.includes("payer_player_id")) {
      return NextResponse.json(
        { ok: false, error: "Session payer column missing; apply migration 20260216042000." },
        { status: 500 }
      );
    }
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
