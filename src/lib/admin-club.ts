export const ADMIN_SELECTED_CLUB_STORAGE_KEY = "admin_selected_club_id";

export function readSelectedClubId() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ADMIN_SELECTED_CLUB_STORAGE_KEY);
  return value && value.trim() ? value : null;
}

export function writeSelectedClubId(clubId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_SELECTED_CLUB_STORAGE_KEY, clubId);
}

