export const PLAYER_AVATAR_BUCKET = "player-avatars";
export const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AvatarValidationError = "invalid_file_type" | "file_too_large";

export function validateAvatarFile(file: { type: string; size: number }) {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
    return { ok: false as const, error: "invalid_file_type" as AvatarValidationError };
  }
  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return { ok: false as const, error: "file_too_large" as AvatarValidationError };
  }
  return { ok: true as const };
}

export function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
  const initials = `${first}${second}`.trim().toUpperCase();
  return initials || "?";
}

export function getAvatarFallbackClass(seed: string) {
  const palettes = [
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
    "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
  ] as const;
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

export function avatarMimeToExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export function buildAvatarStoragePath(playerId: string, mimeType: string) {
  const ext = avatarMimeToExtension(mimeType);
  if (!ext) return null;
  return `${playerId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

export function avatarPathToPublicUrl(supabaseUrl: string | undefined, avatarPath: string | null | undefined) {
  if (!supabaseUrl || !avatarPath) return null;
  const base = supabaseUrl.replace(/\/$/, "");
  const encodedPath = avatarPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/storage/v1/object/public/${PLAYER_AVATAR_BUCKET}/${encodedPath}`;
}
