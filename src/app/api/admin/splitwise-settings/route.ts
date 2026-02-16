import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase/admin";

type SplitwiseSettings = {
  id: number;
  group_id: number;
  currency_code: string;
  enabled: boolean;
  description_template?: string;
  date_format?: string;
  location_replacements?: Array<{ from: string; to: string }>;
  updated_at: string | null;
};

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("splitwise_settings")
    .select("id,group_id,currency_code,enabled,description_template,date_format,location_replacements,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const settings = (data ?? {
    id: 1,
    group_id: 0,
    currency_code: "SGD",
    enabled: true,
    description_template: "Badminton {session_date} - {location}",
    date_format: "DD/MM/YY",
    location_replacements: [],
    updated_at: null
  }) as SplitwiseSettings;

  return NextResponse.json({ ok: true, settings });
}

function normalizeDateFormat(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!raw) return null;
  if (raw === "DD/MM/YY") return "DD/MM/YY";
  if (raw === "YYYY-MM-DD") return "YYYY-MM-DD";
  return null;
}

function normalizeLocationReplacements(value: unknown) {
  if (value === undefined) return { ok: true as const, replacements: undefined as undefined | Array<{ from: string; to: string }> };
  if (!Array.isArray(value)) {
    return { ok: false as const, error: "locationReplacements must be an array." };
  }
  const replacements: Array<{ from: string; to: string }> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { ok: false as const, error: "locationReplacements entries must be objects." };
    }
    const record = entry as Record<string, unknown>;
    const from = typeof record.from === "string" ? record.from.trim() : "";
    const to = typeof record.to === "string" ? record.to.trim() : "";
    if (!from || !to) {
      return { ok: false as const, error: "locationReplacements entries require non-empty from/to." };
    }
    if (from.length > 200 || to.length > 200) {
      return { ok: false as const, error: "locationReplacements from/to must be <= 200 characters." };
    }
    replacements.push({ from, to });
  }
  if (replacements.length > 50) {
    return { ok: false as const, error: "locationReplacements max is 50 entries." };
  }
  return { ok: true as const, replacements };
}

export async function PATCH(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const payload = (await request.json().catch(() => null)) as {
    groupId?: unknown;
    currencyCode?: unknown;
    enabled?: unknown;
    descriptionTemplate?: unknown;
    dateFormat?: unknown;
    locationReplacements?: unknown;
  } | null;

  const updates: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };

  if (payload?.groupId !== undefined) {
    const raw = typeof payload.groupId === "string" ? payload.groupId.trim() : payload.groupId;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return NextResponse.json({ ok: false, error: "groupId must be a non-negative integer." }, { status: 400 });
    }
    updates.group_id = parsed;
  }

  if (payload?.currencyCode !== undefined) {
    const code = typeof payload.currencyCode === "string" ? payload.currencyCode.trim().toUpperCase() : "";
    if (!code || code.length < 3 || code.length > 8) {
      return NextResponse.json({ ok: false, error: "currencyCode must be a valid currency code (e.g. SGD)." }, { status: 400 });
    }
    updates.currency_code = code;
  }

  if (payload?.enabled !== undefined) {
    if (typeof payload.enabled !== "boolean") {
      return NextResponse.json({ ok: false, error: "enabled must be boolean." }, { status: 400 });
    }
    updates.enabled = payload.enabled;
  }

  if (payload?.descriptionTemplate !== undefined) {
    const template = typeof payload.descriptionTemplate === "string" ? payload.descriptionTemplate.trim() : "";
    if (!template) {
      return NextResponse.json({ ok: false, error: "descriptionTemplate is required." }, { status: 400 });
    }
    if (template.length > 200) {
      return NextResponse.json({ ok: false, error: "descriptionTemplate must be <= 200 characters." }, { status: 400 });
    }
    updates.description_template = template;
  }

  if (payload?.dateFormat !== undefined) {
    const normalized = normalizeDateFormat(payload.dateFormat);
    if (!normalized) {
      return NextResponse.json({ ok: false, error: "dateFormat must be 'DD/MM/YY' or 'YYYY-MM-DD'." }, { status: 400 });
    }
    updates.date_format = normalized;
  }

  const normalizedReplacements = normalizeLocationReplacements(payload?.locationReplacements);
  if (!normalizedReplacements.ok) {
    return NextResponse.json({ ok: false, error: normalizedReplacements.error }, { status: 400 });
  }
  if (normalizedReplacements.replacements !== undefined) {
    updates.location_replacements = normalizedReplacements.replacements;
  }

  const keys = Object.keys(updates).filter((k) => k !== "id" && k !== "updated_at");
  if (keys.length === 0) {
    return NextResponse.json({ ok: false, error: "No updates provided." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("splitwise_settings")
    .upsert(updates, { onConflict: "id" })
    .select("id,group_id,currency_code,enabled,description_template,date_format,location_replacements,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, settings: data });
}
