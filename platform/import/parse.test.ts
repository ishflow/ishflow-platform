import { describe, expect, it } from 'vitest';
import { parseUpload } from './parse';

function csvBuffer(text: string): Buffer {
  return Buffer.from(text, 'utf-8');
}

describe('parseUpload', () => {
  it('parses a CSV with header row and trims whitespace', async () => {
    const buf = csvBuffer('name,email\nAcme Inc, acme@example.com \nBeta Co,beta@example.com');
    const out = await parseUpload(buf, 'customers.csv');
    expect(out.headers).toEqual(['name', 'email']);
    expect(out.rows).toEqual([
      { name: 'Acme Inc', email: 'acme@example.com' },
      { name: 'Beta Co', email: 'beta@example.com' },
    ]);
    expect(out.errors).toEqual([]);
  });

  it('parses a CSV with quoted values containing commas', async () => {
    const buf = csvBuffer('name,notes\n"Acme, Inc","line1, line2"');
    const out = await parseUpload(buf, 'x.csv');
    expect(out.rows[0]).toEqual({ name: 'Acme, Inc', notes: 'line1, line2' });
  });

  it('detects file type from .xlsx extension', async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'phone'],
      ['Acme', '+1-555-0001'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const out = await parseUpload(buf as Buffer, 'customers.xlsx');
    expect(out.headers).toEqual(['name', 'phone']);
    expect(out.rows[0]).toEqual({ name: 'Acme', phone: '+1-555-0001' });
  });

  it('returns errors[] for an empty file', async () => {
    const out = await parseUpload(csvBuffer(''), 'empty.csv');
    expect(out.errors[0]?.code).toBe('empty');
  });

  it('returns errors[] for a file with header-only (no data rows)', async () => {
    const out = await parseUpload(csvBuffer('name,email\n'), 'header.csv');
    expect(out.errors[0]?.code).toBe('no_rows');
  });

  it('rejects unsupported extensions', async () => {
    const out = await parseUpload(csvBuffer('x'), 'bad.txt');
    expect(out.errors[0]?.code).toBe('unsupported_format');
  });

  it('caps row count at 1000', async () => {
    const rows = ['name'];
    for (let i = 0; i < 1001; i++) rows.push(`row${i}`);
    const out = await parseUpload(csvBuffer(rows.join('\n')), 'big.csv');
    expect(out.errors[0]?.code).toBe('too_many_rows');
  });
});
