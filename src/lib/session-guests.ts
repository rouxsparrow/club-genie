export const MAX_GUEST_COUNT = 20;

export function normalizeGuestCount(value: unknown, max = MAX_GUEST_COUNT) {
  if (typeof value !== "number" || !Number.isInteger(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}
