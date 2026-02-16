export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function isAutomationSecretValid(expected: string | null, provided: string | null) {
  if (!expected || !provided) return false;
  return timingSafeEqual(expected, provided);
}
