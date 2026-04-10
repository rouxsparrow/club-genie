/**
 * Generic admin API fetch utility.
 * Wraps: fetch with credentials:'include', JSON parse with .catch(() => null),
 * and { ok: boolean; error?: string } response shape.
 */
export async function adminFetch<T extends { ok: boolean; error?: string }>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });
  const data = (await response.json().catch(() => null)) as T | null;
  if (!data) {
    return { ok: false, error: 'Failed to parse response' } as T;
  }
  return data;
}
