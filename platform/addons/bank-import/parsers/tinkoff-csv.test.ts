import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTinkoffCsv } from './tinkoff-csv';

const FIXTURE = readFileSync(join(__dirname, '..', '__fixtures__', 'tinkoff.csv'));

describe('parseTinkoffCsv', () => {
  it('skips the malformed amount row and returns the rest', () => {
    const rows = parseTinkoffCsv(FIXTURE);
    expect(rows).toHaveLength(4);
  });

  it('parses ISO dates', () => {
    const rows = parseTinkoffCsv(FIXTURE);
    expect(rows[0]?.valueDate.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('detects direction from sign', () => {
    const rows = parseTinkoffCsv(FIXTURE);
    const out = rows.filter((r) => r.direction === 'out');
    expect(out).toHaveLength(1);
    expect(out[0]?.amount).toBe(30000);
  });

  it('honours per-row currency', () => {
    const rows = parseTinkoffCsv(FIXTURE);
    for (const r of rows) expect(r.currency).toBe('RUB');
  });

  it('produces externalId with tinkoff prefix', () => {
    const rows = parseTinkoffCsv(FIXTURE);
    expect(rows[0]?.externalId).toMatch(/^(tinkoff|derived):/);
  });
});
