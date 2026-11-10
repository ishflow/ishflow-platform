import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse1cBankV102 } from './1c-bank-v102';

const FIXTURE = readFileSync(join(__dirname, '..', '__fixtures__', '1c-bank.txt'));

describe('parse1cBankV102', () => {
  it('returns one row per СекцияДокумент block', () => {
    const rows = parse1cBankV102(FIXTURE);
    expect(rows).toHaveLength(4);
  });

  it('decodes value date, amount, and counterparty', () => {
    const [first] = parse1cBankV102(FIXTURE);
    expect(first?.valueDate.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(first?.amount).toBe(120000);
    expect(first?.direction).toBe('in');
    expect(first?.counterpartyName).toContain('Ромашка');
    expect(first?.counterpartyInn).toBe('7707083893');
    expect(first?.narrative).toContain('Оплата по счёту');
  });

  it('infers `out` direction when our settlement account is the payer', () => {
    const rows = parse1cBankV102(FIXTURE);
    const outgoing = rows.filter((r) => r.direction === 'out');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]?.counterpartyName).toContain('Иванов');
  });

  it('tolerates a missing counterparty name', () => {
    const rows = parse1cBankV102(FIXTURE);
    const orphan = rows.find((r) => r.amount === 75300.25);
    expect(orphan).toBeDefined();
    expect(orphan?.counterpartyName ?? '').toBe('');
  });

  it('produces a stable externalId derived from Номер + Дата', () => {
    const rows = parse1cBankV102(FIXTURE);
    expect(rows[0]?.externalId).toBe('1c:101:2026-05-01');
    expect(rows[1]?.externalId).toBe('1c:102:2026-05-02');
  });

  it('decodes CP1251-encoded input', () => {
    // Re-encode the fixture as CP1251 and assert the parser still works.
    // Use a roundtrip via the known UTF-8 → JS string → manual byte map.
    const utf8 = FIXTURE.toString('utf-8');
    // Re-encode every codepoint < 0x80 directly; replace Russian letters with
    // their CP1251 byte; drop unknowns.
    const ENC = new Map<number, number>();
    // Build encode table by inverting the high page used in cp1251.ts.
    // Cheap inline: for chars in range U+0400..U+04FF, map to 0xC0..0xFF.
    for (const ch of utf8) {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp < 0x80) continue;
      // А..я
      if (cp >= 0x0410 && cp <= 0x044f) ENC.set(cp, cp - 0x0410 + 0xc0);
      // Ё / ё
      else if (cp === 0x0401) ENC.set(cp, 0xa8);
      else if (cp === 0x0451) ENC.set(cp, 0xb8);
      // « » " "
      else if (cp === 0x00ab) ENC.set(cp, 0xab);
      else if (cp === 0x00bb) ENC.set(cp, 0xbb);
      else if (cp === 0x201c) ENC.set(cp, 0x93);
      else if (cp === 0x201d) ENC.set(cp, 0x94);
      else if (cp === 0x2116) ENC.set(cp, 0xb9);
    }
    const bytes: number[] = [];
    for (const ch of utf8) {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp < 0x80) {
        bytes.push(cp);
      } else if (ENC.has(cp)) {
        bytes.push(ENC.get(cp) ?? 0x3f);
      } else {
        bytes.push(0x3f); // ?
      }
    }
    const cp1251Buf = Buffer.from(bytes);
    const rows = parse1cBankV102(cp1251Buf);
    expect(rows).toHaveLength(4);
    expect(rows[0]?.amount).toBe(120000);
    expect(rows[0]?.counterpartyName ?? '').toContain('Ромашка');
  });
});
