export function formatDuration(durationMs: number | null): string {
  if (typeof durationMs !== 'number' || durationMs < 0) return '-';
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function formatIngestionHistorySummary(
  summary: Record<string, unknown> | null,
): string {
  if (!summary) return '-';
  const total = typeof summary.total === 'number' ? summary.total : 0;
  const ingested = typeof summary.ingested === 'number' ? summary.ingested : 0;
  const deduped = typeof summary.deduped === 'number' ? summary.deduped : 0;
  const parseFailed = typeof summary.parse_failed === 'number' ? summary.parse_failed : 0;
  const fetchFailed = typeof summary.fetch_failed === 'number' ? summary.fetch_failed : 0;
  return `total ${total} | ingested ${ingested} | deduped ${deduped} | parse ${parseFailed} | fetch ${fetchFailed}`;
}

export function formatSplitwiseHistorySummary(
  summary: Record<string, unknown> | null,
): string {
  if (!summary) return '-';
  const closed = typeof summary.closed_updated === 'number' ? summary.closed_updated : 0;
  const created = typeof summary.splitwise_created === 'number' ? summary.splitwise_created : 0;
  const skipped = typeof summary.splitwise_skipped === 'number' ? summary.splitwise_skipped : 0;
  const failed = typeof summary.splitwise_failed === 'number' ? summary.splitwise_failed : 0;
  return `closed ${closed} | created ${created} | skipped ${skipped} | failed ${failed}`;
}
