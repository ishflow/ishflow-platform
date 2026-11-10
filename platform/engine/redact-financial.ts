import type { AppContext } from '@/platform/auth/current-context';
import { hasPermission } from './permissions';

const FINANCIAL_WRITE_PERMS = [
  '*:*',
  'sales.invoice:write',
  'purchases.invoice:write',
  'sales.payment_received:write',
  'purchases.payment_sent:write',
];

const REDACT_FIELDS = new Set([
  'unitPrice',
  'lineTotal',
  'subtotal',
  'taxAmount',
  'total',
  'costPrice',
  'markupPct',
  'amount',
]);

function shouldRedact(ctx: AppContext): boolean {
  return !FINANCIAL_WRITE_PERMS.some((p) => hasPermission(ctx.permissions, p));
}

function redactRecord(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    if (REDACT_FIELDS.has(key)) {
      delete record[key];
    }
  }
}

function redactPayload(payload: unknown): unknown {
  if (payload === null || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) {
    return payload.map(redactPayload);
  }

  const clone = { ...(payload as Record<string, unknown>) };
  redactRecord(clone);

  for (const [key, value] of Object.entries(clone)) {
    if (key === 'lines' && value !== null && typeof value === 'object') {
      clone[key] = redactLines(value);
    } else if (value !== null && typeof value === 'object') {
      clone[key] = redactPayload(value);
    }
  }

  return clone;
}

function redactLines(lines: unknown): unknown {
  if (Array.isArray(lines)) {
    return lines.map((line) => {
      if (line !== null && typeof line === 'object') {
        const clone = { ...(line as Record<string, unknown>) };
        redactRecord(clone);
        return clone;
      }
      return line;
    });
  }
  if (lines !== null && typeof lines === 'object') {
    const out: Record<string, unknown> = {};
    for (const [sectionKey, sectionLines] of Object.entries(lines as Record<string, unknown>)) {
      out[sectionKey] = redactLines(sectionLines);
    }
    return out;
  }
  return lines;
}

export function redactFinancialFields<T>(payload: T, ctx: AppContext): T {
  if (!shouldRedact(ctx)) return payload;
  return redactPayload(payload) as T;
}
