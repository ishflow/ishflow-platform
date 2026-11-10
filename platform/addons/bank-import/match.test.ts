import { describe, expect, it } from 'vitest';
import { type OpenInvoiceCandidate, matchRow, scoreCandidate } from './match';
import type { ParsedRow } from './parsers';

function buildRow(over: Partial<ParsedRow> = {}): ParsedRow {
  return {
    valueDate: new Date('2026-05-05'),
    direction: 'in',
    amount: 1000,
    currency: 'RUB',
    counterpartyName: 'ООО Ромашка',
    counterpartyAccount: '40702',
    counterpartyInn: '7707083893',
    narrative: 'Оплата по счёту № 1',
    externalId: 'test:1',
    ...over,
  };
}

function buildCandidate(over: Partial<OpenInvoiceCandidate> = {}): OpenInvoiceCandidate {
  return {
    id: 'inv-1',
    docType: 'sales.invoice',
    date: new Date('2026-05-04'),
    openAmount: 1000,
    counterpartyId: 'cust-1',
    counterpartyName: 'ООО Ромашка',
    counterpartyInn: null,
    currency: 'RUB',
    ...over,
  };
}

describe('scoreCandidate', () => {
  it('returns 0 when currency does not match', () => {
    expect(scoreCandidate(buildCandidate({ currency: 'USD' }), buildRow())).toBe(0);
  });

  it('returns 0 when amount exceeds tolerance', () => {
    expect(scoreCandidate(buildCandidate({ openAmount: 2000 }), buildRow())).toBe(0);
  });

  it('exact amount + date + INN → ≥ 0.7', () => {
    const inv = buildCandidate({ counterpartyInn: '7707083893' });
    const row = buildRow({ valueDate: new Date('2026-05-04') });
    expect(scoreCandidate(inv, row)).toBeGreaterThan(0.9);
  });

  it('exact amount + close date + token overlap (no INN) → ≥ 0.6', () => {
    const inv = buildCandidate({ counterpartyName: 'ООО Ромашка' });
    const row = buildRow();
    expect(scoreCandidate(inv, row)).toBeGreaterThanOrEqual(0.6);
  });

  it('decays date contribution as days grow', () => {
    const close = buildCandidate({ date: new Date('2026-05-04') });
    const far = buildCandidate({ date: new Date('2026-04-29') });
    const row = buildRow();
    expect(scoreCandidate(close, row)).toBeGreaterThan(scoreCandidate(far, row));
  });
});

describe('matchRow', () => {
  it('returns pending with empty candidate list', () => {
    expect(matchRow(buildRow(), [])).toEqual({
      candidateId: null,
      confidence: 0,
      status: 'pending',
    });
  });

  it('picks the single clear winner', () => {
    const result = matchRow(buildRow(), [buildCandidate()]);
    expect(result.status).toBe('matched');
    expect(result.candidateId).toBe('inv-1');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('returns conflict when top two scores are within 0.10', () => {
    const a = buildCandidate({ id: 'a' });
    const b = buildCandidate({ id: 'b', counterpartyName: 'ООО Ромашка' });
    const result = matchRow(buildRow(), [a, b]);
    expect(result.status).toBe('conflict');
    expect(result.candidateId).toBeNull();
  });

  it('returns pending when top score is below threshold', () => {
    // Force amount mismatch within 0.5% to keep score low but non-zero.
    const inv = buildCandidate({
      openAmount: 1004,
      counterpartyName: 'Совершенно другое имя',
      date: new Date('2026-04-20'),
    });
    const result = matchRow(buildRow({ counterpartyName: null }), [inv]);
    expect(result.status).toBe('pending');
    expect(result.candidateId).toBeNull();
  });
});
