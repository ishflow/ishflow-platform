import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSberCsv } from './sber-csv';

const FIXTURE = readFileSync(join(__dirname, '..', '__fixtures__', 'sber.csv'));

describe('parseSberCsv', () => {
  it('skips the malformed row and returns the rest', () => {
    const rows = parseSberCsv(FIXTURE);
    expect(rows).toHaveLength(4);
  });

  it('detects outgoing rows via the sign of Сумма', () => {
    const rows = parseSberCsv(FIXTURE);
    const out = rows.filter((r) => r.direction === 'out');
    expect(out).toHaveLength(1);
    expect(out[0]?.amount).toBeCloseTo(45000.5, 2);
  });

  it('parses Russian counterparty + INN', () => {
    const rows = parseSberCsv(FIXTURE);
    expect(rows[0]?.counterpartyName).toContain('Ромашка');
    expect(rows[0]?.counterpartyInn).toBe('7707083893');
  });

  it('tolerates an empty INN cell', () => {
    const rows = parseSberCsv(FIXTURE);
    const third = rows.find((r) => r.amount === 15000);
    expect(third?.counterpartyInn ?? '').toBe('');
  });

  it('produces externalId derived from № платежа + Дата', () => {
    const rows = parseSberCsv(FIXTURE);
    expect(rows[0]?.externalId).toBe('sber:1:2026-05-01');
  });

  it('defaults currency to RUB', () => {
    const rows = parseSberCsv(FIXTURE);
    for (const r of rows) expect(r.currency).toBe('RUB');
  });
});
