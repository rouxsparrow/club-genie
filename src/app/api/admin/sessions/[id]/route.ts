import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase/admin";

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
    payerPlayerId?: string | null;
    courts?: CourtInput[];
  };

  let resolvedPayerUpdate: string | undefined;
  if (Object.prototype.hasOwnProperty.call(payload, "payerPlayerId")) {
    try {
      const incoming = typeof payload.payerPlayerId === "string" ? payload.payerPlayerId.trim() : payload.payerPlayerId;
      if (!incoming) {
        resolvedPayerUpdate = await resolveDefaultPayerId(supabaseAdmin);
      } else if (typeof incoming === "string") {
        const exists = await ensurePlayerExists(supabaseAdmin, incoming);
        if (!exists) {
          return NextResponse.json({ ok: false, error: "Selected payer does not exist." }, { status: 400 });
        }
        resolvedPayerUpdate = incoming;
      } else {
        return NextResponse.json({ ok: false, error: "payerPlayerId must be a player id or null." }, { status: 400 });
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
  }

  const baseUpdate = {
    session_date: payload.session_date,
    status: payload.status,
    start_time: payload.start_time,
    end_time: payload.end_time,
    total_fee: payload.total_fee,
    ...(resolvedPayerUpdate !== undefined ? { payer_player_id: resolvedPayerUpdate } : {})
  };

  // Backward-compat: some DBs may not have `location` and/or `remarks`.
  const updateCandidates = [
    { ...baseUpdate, location: payload.location, remarks: payload.remarks },
    { ...baseUpdate, remarks: payload.remarks },
    { ...baseUpdate, location: payload.location },
    { ...baseUpdate }
  ];

  let updateResult = await supabaseAdmin.from("sessions").update(updateCandidates[0]).eq("id", id);
  for (let i = 1; i < updateCandidates.length && updateResult.error; i += 1) {
    const message = updateResult.error.message ?? "";
    if (message.includes("payer_player_id")) {
      return NextResponse.json(
        { ok: false, error: "Session payer column missing; apply migration 20260216042000." },
        { status: 500 }
      );
    }
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

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  // Dev-only: we don't want this exposed in production.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { id } = await context.params;
  const sessionId = (id ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing session id." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // "Clean slate": remove receipts for this session date so ingestion can re-run.
  const { data: sessionRow, error: sessionLookupError } = await supabaseAdmin
    .from("sessions")
    .select("id,session_date")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionLookupError) {
    return NextResponse.json({ ok: false, error: sessionLookupError.message }, { status: 500 });
  }
  if (!sessionRow?.session_date) {
    return NextResponse.json({ ok: false, error: "Session not found." }, { status: 404 });
  }

  const { error: receiptsDeleteError } = await supabaseAdmin
    .from("email_receipts")
    .delete()
    .eq("parsed_session_date", sessionRow.session_date);
  if (receiptsDeleteError) {
    return NextResponse.json({ ok: false, error: receiptsDeleteError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin.from("sessions").delete().eq("id", sessionId).select("id");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const deletedId = Array.isArray(data) && data.length > 0 && typeof data[0]?.id === "string" ? (data[0].id as string) : null;
  if (!deletedId) {
    return NextResponse.json({ ok: false, error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deletedId });
}
