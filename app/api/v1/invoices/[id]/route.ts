/**
 * `/api/v1/invoices/{id}` — sales invoice detail.
 *
 * Loads via the engine's `getDocument`, which already returns header + line
 * sections in a single tenant-scoped transaction. Lines come back as
 * `lines.items: [...]` (engine section shape); we flatten to a top-level
 * `lines: [...]` array for the public-API envelope so consumers don't have
 * to know about engine section keys.
 */

import '@/configs';

import { ApiKeyAuthError } from '@/platform/auth/resolve-api-key';
import { NotFoundError, getDocument } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import type { DocumentConfig } from '@/platform/metadata';

import { requireApiKey } from '../../_lib/auth';
import { respondData, respondError } from '../../_lib/respond';
import { serializeRow } from '../../_lib/serialize';

export const dynamic = 'force-dynamic';

const INVOICE_CONFIG_ID = 'sales.invoice';

function resolveInvoiceConfig(): DocumentConfig | null {
  return getRegistry().document[INVOICE_CONFIG_ID] ?? null;
}

function serializeInvoice(doc: Record<string, unknown>): Record<string, unknown> {
  const { lines, ...rest } = doc;
  const items =
    lines && typeof lines === 'object' && !Array.isArray(lines)
      ? ((lines as Record<string, unknown[]>).items ?? [])
      : [];
  const header = serializeRow(rest as Record<string, unknown>);
  return {
    ...header,
    lines: items.map((l) => serializeRow(l as Record<string, unknown>)),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiKey(req, 'read');
    const { id } = await params;
    const config = resolveInvoiceConfig();
    if (!config) {
      return respondError('internal_error', 'invoice config not registered', 500);
    }
    const doc = await getDocument(ctx, config, id);
    return respondData(serializeInvoice(doc));
  } catch (err) {
    if (err instanceof ApiKeyAuthError) {
      return respondError(err.code, err.message, err.status);
    }
    if (err instanceof NotFoundError) {
      return respondError('not_found', err.message, 404);
    }
    console.error('GET /api/v1/invoices/[id] failed:', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return respondError('internal_error', message, 500);
  }
}
