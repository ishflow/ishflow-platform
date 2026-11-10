import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseKaspiCsv } from './kaspi-csv';

const FIXTURE = readFileSync(join(__dirname, '..', '__fixtures__', 'kaspi.csv'));

describe('parseKaspiCsv', () => {
  it('skips the malformed amount row and returns the rest', () => {
    const rows = parseKaspiCsv(FIXTURE);
    expect(rows).toHaveLength(4);
  });

  it('uses an explicit Direction column when present', () => {
    const rows = parseKaspiCsv(FIXTURE);
    expect(rows.filter((r) => r.direction === 'in')).toHaveLength(3);
    expect(rows.filter((r) => r.direction === 'out')).toHaveLength(1);
  });

  it('defaults currency to KZT', () => {
    const rows = parseKaspiCsv(FIXTURE);
    for (const r of rows) expect(r.currency).toBe('KZT');
  });

  it('reads BIN as INN', () => {
    const rows = parseKaspiCsv(FIXTURE);
    expect(rows[0]?.counterpartyInn).toBe('123456789012');
  });
});
