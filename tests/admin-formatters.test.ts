import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatIngestionHistorySummary,
  formatSplitwiseHistorySummary,
} from '../src/components/admin/formatters';

describe('formatDuration', () => {
  it('returns "-" for null', () => {
    expect(formatDuration(null)).toBe('-');
  });
  it('returns "-" for negative', () => {
    expect(formatDuration(-1)).toBe('-');
  });
  it('returns milliseconds for < 1000ms', () => {
    expect(formatDuration(500)).toBe('500ms');
  });
  it('returns seconds with one decimal for < 60s', () => {
    expect(formatDuration(5000)).toBe('5.0s');
  });
  it('returns minutes and seconds for >= 60s', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });
});

describe('formatIngestionHistorySummary', () => {
  it('returns "-" for null', () => {
    expect(formatIngestionHistorySummary(null)).toBe('-');
  });
  it('formats all fields', () => {
    expect(
      formatIngestionHistorySummary({
        total: 10,
        ingested: 5,
        deduped: 3,
        parse_failed: 1,
        fetch_failed: 1,
      }),
    ).toBe('total 10 | ingested 5 | deduped 3 | parse 1 | fetch 1');
  });
  it('defaults missing fields to 0', () => {
    expect(formatIngestionHistorySummary({})).toBe(
      'total 0 | ingested 0 | deduped 0 | parse 0 | fetch 0',
    );
  });
});

describe('formatSplitwiseHistorySummary', () => {
  it('returns "-" for null', () => {
    expect(formatSplitwiseHistorySummary(null)).toBe('-');
  });
  it('formats all fields', () => {
    expect(
      formatSplitwiseHistorySummary({
        closed_updated: 2,
        splitwise_created: 3,
        splitwise_skipped: 1,
        splitwise_failed: 0,
      }),
    ).toBe('closed 2 | created 3 | skipped 1 | failed 0');
  });
});
