import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  // Supabase-js `select()` types are strict; cast to bypass compile-time parser errors
  // in partially-migrated environments.
  const primarySelect = "id,name,active,splitwise_user_id,is_default_payer" as string;
  const primary = await supabaseAdmin
    .from("players")
    .select(primarySelect)
    .order("name", { ascending: true });

  let data = primary.data as unknown[] | null;
  let error = primary.error;

  if (error) {
    const message = error.message ?? "";
    if (message.includes("splitwise_user_id") || message.includes("is_default_payer")) {
      const fallback = await supabaseAdmin.from("players").select("id,name,active").order("name", { ascending: true });
      data = fallback.data as unknown[] | null;
      error = fallback.error;
    }
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const players = (data ?? []).map((row) => {
    const record = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<string, unknown>;
    return {
      ...record,
      splitwise_user_id: typeof record.splitwise_user_id === "number" ? record.splitwise_user_id : null,
      is_default_payer: typeof record.is_default_payer === "boolean" ? record.is_default_payer : false
    };
  });

  return NextResponse.json({ ok: true, players });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json()) as { name?: string };
  const name = payload.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .insert({ name })
    .select("id,name,active")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: data });
}
