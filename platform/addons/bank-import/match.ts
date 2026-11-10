/**
 * Heuristic matcher: maps a parsed bank statement row to the most likely open
 * invoice in the tenant's books.
 *
 * Scoring (max ~ 0.95):
 *   Amount        exact within 1 currency unit  → +0.50
 *                 within 0.5%                   → +0.35
 *                 else                          → reject candidate
 *   Date          |row - invoice| ≤ 7 days      → +0.25 - 0.025 * diff
 *   Counterparty  INN exact                     → +0.20
 *                 token overlap ≥ 0.6           → +0.15
 *
 * Decision:
 *   - top score > 0.60 AND top > runner_up + 0.10  → `matched`
 *   - top score > 0.60 AND top ≤ runner_up + 0.10  → `conflict`
 *   - else                                          → `pending`
 *
 * Open invoice query uses the existing accounts_receivable /
 * accounts_payable movement tables (Sprint 8) to compute remaining balance:
 *   open = total_invoiced - total_paid    (per invoice docRef)
 *
 * Invoice currency must match the row's currency — multi-currency
 * reconciliation is out of scope for v1 (see spec §"Out of scope").
 */

import { innMatches, normalizeName, tokenOverlap } from './normalize';
import type { ParsedRow } from './parsers';

export type OpenInvoiceCandidate = {
  /** Document UUID (matches BankStatementRow.matchedDocId). */
  id: string;
  /** Full document type string, e.g. `sales.invoice` or `purchases.invoice`. */
  docType: 'sales.invoice' | 'purchases.invoice';
  /** Posting date of the invoice. */
  date: Date;
  /** Open (unpaid) amount as of "now". */
  openAmount: number;
  /** Counterparty UUID (customer or supplier). */
  counterpartyId: string;
  /** Counterparty business name for fuzzy matching. */
  counterpartyName: string | null;
  /** Counterparty INN (tax id) for exact matching. */
  counterpartyInn: string | null;
  /** ISO-4217 currency code of the invoice. */
  currency: string;
};

export type MatchResult = {
  /** Best-scoring candidate id, when above threshold. */
  candidateId: string | null;
  /** Confidence in `[0, 1]` — sum of partial scores. */
  confidence: number;
  /** Final routing: `matched`, `conflict`, or `pending`. */
  status: 'matched' | 'conflict' | 'pending';
};

const SCORE_THRESHOLD = 0.6;
const RUNNER_UP_GAP = 0.1;

export function scoreCandidate(invoice: OpenInvoiceCandidate, row: ParsedRow): number {
  if (invoice.currency !== row.currency) return 0;
  let score = 0;

  const amountDiff = Math.abs(invoice.openAmount - row.amount);
  if (amountDiff <= 1) {
    score += 0.5;
  } else if (invoice.openAmount > 0 && amountDiff / invoice.openAmount < 0.005) {
    score += 0.35;
  } else {
    // Amount mismatch beyond tolerance → reject.
    return 0;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const dateDiffDays = Math.abs((invoice.date.getTime() - row.valueDate.getTime()) / msPerDay);
  if (dateDiffDays <= 7) {
    score += Math.max(0, 0.25 - dateDiffDays * 0.025);
  }

  if (innMatches(invoice.counterpartyInn, row.counterpartyInn)) {
    score += 0.2;
  } else {
    const overlap = tokenOverlap(
      normalizeName(invoice.counterpartyName),
      normalizeName(row.counterpartyName),
    );
    if (overlap >= 0.6) score += 0.15;
  }

  return score;
}

/**
 * Score every candidate, pick a winner, and decide whether the match is
 * confident enough to auto-assign. The first two scores within `0.10` of each
 * other are treated as a `conflict` so the operator can pick manually.
 */
export function matchRow(row: ParsedRow, candidates: readonly OpenInvoiceCandidate[]): MatchResult {
  if (candidates.length === 0) {
    return { candidateId: null, confidence: 0, status: 'pending' };
  }

  const scored: Array<{ id: string; score: number }> = [];
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, row);
    if (score > 0) scored.push({ id: candidate.id, score });
  }
  if (scored.length === 0) {
    return { candidateId: null, confidence: 0, status: 'pending' };
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) {
    return { candidateId: null, confidence: 0, status: 'pending' };
  }
  if (top.score <= SCORE_THRESHOLD) {
    return { candidateId: null, confidence: top.score, status: 'pending' };
  }
  const runnerUp = scored[1];
  if (runnerUp && top.score - runnerUp.score < RUNNER_UP_GAP) {
    return { candidateId: null, confidence: top.score, status: 'conflict' };
  }
  return { candidateId: top.id, confidence: top.score, status: 'matched' };
}
