import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../lib/supabase/admin";
import {
  avatarPathToPublicUrl,
  buildAvatarStoragePath,
  PLAYER_AVATAR_BUCKET,
  validateAvatarFile
} from "../../../../../../lib/player-avatar";

function normalizePlayerRow(row: unknown) {
  const record = (row && typeof row === "object" ? (row as Record<string, unknown>) : {}) as Record<string, unknown>;
  const avatarPath = typeof record.avatar_path === "string" && record.avatar_path.trim() ? record.avatar_path : null;
  return {
    ...record,
    splitwise_user_id: typeof record.splitwise_user_id === "number" ? record.splitwise_user_id : null,
    is_default_payer: typeof record.is_default_payer === "boolean" ? record.is_default_payer : false,
    avatar_path: avatarPath,
    avatar_url: avatarPathToPublicUrl(process.env.SUPABASE_URL, avatarPath)
  };
}

function getAvatarPathFromRow(row: unknown) {
  if (!row || typeof row !== "object") return null;
  const value = (row as Record<string, unknown>).avatar_path;
  return typeof value === "string" && value.trim() ? value : null;
}

async function fetchPlayerById(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const selectCandidates = [
    "id,name,active,splitwise_user_id,is_default_payer,avatar_path",
    "id,name,active,splitwise_user_id,is_default_payer",
    "id,name,active,avatar_path",
    "id,name,active"
  ] as const;

  let query = await supabaseAdmin.from("players").select(selectCandidates[0] as string).eq("id", id).maybeSingle();
  for (let i = 1; i < selectCandidates.length && query.error; i += 1) {
    const message = query.error.message ?? "";
    if (!message.includes("splitwise_user_id") && !message.includes("is_default_payer") && !message.includes("avatar_path")) {
      break;
    }
    query = await supabaseAdmin.from("players").select(selectCandidates[i] as string).eq("id", id).maybeSingle();
  }
  return query;
}

function isAvatarPathColumnMissingError(message: string) {
  return message.includes("avatar_path");
}

function isBucketMissingError(message: string) {
  const text = message.toLowerCase();
  return text.includes("bucket") && text.includes("not found");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 400 });
  }

  const validation = validateAvatarFile(file);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const existing = await fetchPlayerById(supabaseAdmin, id);
  if (existing.error) {
    const message = existing.error.message ?? "";
    if (isAvatarPathColumnMissingError(message)) {
      return NextResponse.json(
        { ok: false, error: "avatar_bucket_missing", detail: "Apply migration 20260216170000_player_avatars." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "avatar_upload_failed" }, { status: 500 });
  }
  if (!existing.data) {
    return NextResponse.json({ ok: false, error: "player_not_found" }, { status: 404 });
  }

  const currentAvatarPath = getAvatarPathFromRow(existing.data);
  const nextAvatarPath = buildAvatarStoragePath(id, file.type);
  if (!nextAvatarPath) {
    return NextResponse.json({ ok: false, error: "invalid_file_type" }, { status: 400 });
  }

  const upload = await supabaseAdmin.storage
    .from(PLAYER_AVATAR_BUCKET)
    .upload(nextAvatarPath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (upload.error) {
    const message = upload.error.message ?? "";
    if (isBucketMissingError(message)) {
      return NextResponse.json(
        { ok: false, error: "avatar_bucket_missing", detail: "Apply migration 20260216170000_player_avatars." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "avatar_upload_failed" }, { status: 500 });
  }

  const update = await supabaseAdmin
    .from("players")
    .update({ avatar_path: nextAvatarPath })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (update.error) {
    await supabaseAdmin.storage.from(PLAYER_AVATAR_BUCKET).remove([nextAvatarPath]);
    const message = update.error.message ?? "";
    if (isAvatarPathColumnMissingError(message)) {
      return NextResponse.json(
        { ok: false, error: "avatar_bucket_missing", detail: "Apply migration 20260216170000_player_avatars." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "avatar_upload_failed" }, { status: 500 });
  }

  if (currentAvatarPath && currentAvatarPath !== nextAvatarPath) {
    await supabaseAdmin.storage.from(PLAYER_AVATAR_BUCKET).remove([currentAvatarPath]);
  }

  const refreshed = await fetchPlayerById(supabaseAdmin, id);
  if (refreshed.error || !refreshed.data) {
    return NextResponse.json({ ok: false, error: "avatar_upload_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: normalizePlayerRow(refreshed.data) });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabaseAdmin = getSupabaseAdmin();

  const existing = await fetchPlayerById(supabaseAdmin, id);
  if (existing.error) {
    const message = existing.error.message ?? "";
    if (isAvatarPathColumnMissingError(message)) {
      return NextResponse.json(
        { ok: false, error: "avatar_bucket_missing", detail: "Apply migration 20260216170000_player_avatars." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "avatar_remove_failed" }, { status: 500 });
  }
  if (!existing.data) {
    return NextResponse.json({ ok: false, error: "player_not_found" }, { status: 404 });
  }

  const currentAvatarPath = getAvatarPathFromRow(existing.data);

  const update = await supabaseAdmin
    .from("players")
    .update({ avatar_path: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (update.error) {
    const message = update.error.message ?? "";
    if (isAvatarPathColumnMissingError(message)) {
      return NextResponse.json(
        { ok: false, error: "avatar_bucket_missing", detail: "Apply migration 20260216170000_player_avatars." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: false, error: "avatar_remove_failed" }, { status: 500 });
  }

  if (currentAvatarPath) {
    await supabaseAdmin.storage.from(PLAYER_AVATAR_BUCKET).remove([currentAvatarPath]);
  }

  const refreshed = await fetchPlayerById(supabaseAdmin, id);
  if (refreshed.error || !refreshed.data) {
    return NextResponse.json({ ok: false, error: "avatar_remove_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: normalizePlayerRow(refreshed.data) });
}
