export function formatSessionLocationForDisplay(location: string | null | undefined) {
  if (typeof location !== "string") return "TBD";

  const normalized = location.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return "TBD";

  const withoutClubPrefix = normalized.replace(/^club\b\s*/i, "").trim();
  return withoutClubPrefix || "TBD";
}
