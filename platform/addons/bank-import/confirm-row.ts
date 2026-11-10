/**
 * Operator-facing row-resolution workflow.
 *
 *   confirmMatch(rowId)
 *     → For a row with a `matched` or `conflict` candidate already set, create
 *       the corresponding payment document (`payment_received` for `in`,
 *       `payment_sent` for `out`), post it, link the row to the new payment.
 *
 *   confirmManualMatch(rowId, docId, docType)
 *     → Same as above but the operator picked the doc manually. Overrides any
 *       existing matchedDocId.
 *
 *   ignoreRow(rowId, reason?)
 *     → Mark a row as reconciled-without-doc. No payment posting; sets
 *       status='ignored' and stores the reason in narrative if provided.
 */

import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { createDocument } from '@/platform/engine/document-crud';
import { postDocument } from '@/platform/engine/posting';
import { getRegistry } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { assertAddonEnabled } from '../assert-addon';

import '@/configs/sales/documents/payment-received';
import '@/configs/purchases/documents/payment-sent';
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/purchases/documents/purchase-invoice';

export class BankRowNotFoundError extends Error {
  constructor(public readonly rowId: string) {
    super(`bank_row_not_found:${rowId}`);
    this.name = 'BankRowNotFoundError';
  }
}

export class BankRowAlreadyResolvedError extends Error {
  constructor(
    public readonly rowId: string,
    public readonly status: string,
  ) {
    super(`bank_row_already_resolved:${rowId}:${status}`);
    this.name = 'BankRowAlreadyResolvedError';
  }
}

export class MissingMatchError extends Error {
  constructor(public readonly rowId: string) {
    super(`bank_row_missing_match:${rowId}`);
    this.name = 'MissingMatchError';
  }
}

type Tx = Record<string, unknown> & {
  bankStatementRow: {
    findUnique: (args: unknown) => Promise<BankRowSnapshot | null>;
    update: (args: unknown) => Promise<unknown>;
  };
};

type BankRowSnapshot = {
  id: string;
  tenantId: string;
  direction: 'in' | 'out';
  amount: Prisma.Decimal;
  currency: string;
  valueDate: Date;
  status: string;
  matchedDocId: string | null;
  matchedDocType: string | null;
  narrative: string | null;
};

export type ConfirmMatchResult = {
  rowId: string;
  paymentDocId: string;
  paymentDocType: 'sales.payment_received' | 'purchases.payment_sent';
};

/**
 * Promote a previously-matched row into a real payment document. Loads the
 * matched invoice, builds the payment doc with `linkedInvoices` JSON so the
 * existing posting engine pro-rates the FX amount, then transitions the row
 * to `confirmed`.
 */
export async function confirmMatch(
  ctx: AppContext,
  args: { rowId: string },
): Promise<ConfirmMatchResult> {
  assertAddonEnabled(ctx, 'bank_integration');
  if (!ctx.tenant) throw new Error('confirmMatch: no tenant in context');

  const row = await loadRow(ctx.tenant.id, args.rowId);
  if (!row.matchedDocId || !row.matchedDocType) throw new MissingMatchError(args.rowId);
  return performConfirmation(ctx, row, row.matchedDocId, row.matchedDocType);
}

/**
 * Operator-picked match override. Replaces whatever `matchedDocId` the auto
 * matcher set with `docId` + `docType`, then runs the same confirmation flow.
 */
export async function confirmManualMatch(
  ctx: AppContext,
  args: {
    rowId: string;
    docId: string;
    docType: 'sales.invoice' | 'purchases.invoice';
  },
): Promise<ConfirmMatchResult> {
  assertAddonEnabled(ctx, 'bank_integration');
  if (!ctx.tenant) throw new Error('confirmManualMatch: no tenant in context');

  const row = await loadRow(ctx.tenant.id, args.rowId);
  // Verify direction alignment so we never wire a sales-invoice match against
  // an outgoing row.
  if (row.direction === 'in' && args.docType !== 'sales.invoice') {
    throw new MissingMatchError(args.rowId);
  }
  if (row.direction === 'out' && args.docType !== 'purchases.invoice') {
    throw new MissingMatchError(args.rowId);
  }
  return performConfirmation(ctx, row, args.docId, args.docType);
}

/**
 * Mark a row as resolved-without-payment-doc. Used when the operator decided
 * the bank line is bookkeeping noise (fees, internal transfers, etc).
 */
export async function ignoreRow(
  ctx: AppContext,
  args: { rowId: string; reason?: string },
): Promise<void> {
  assertAddonEnabled(ctx, 'bank_integration');
  if (!ctx.tenant) throw new Error('ignoreRow: no tenant in context');

  const tenantId = ctx.tenant.id;
  const userId = ctx.user.id;
  await withTenant(tenantId, async (tx) => {
    const t = tx as unknown as Tx;
    const row = await t.bankStatementRow.findUnique({ where: { id: args.rowId } });
    if (!row) throw new BankRowNotFoundError(args.rowId);
    if (row.status === 'confirmed' || row.status === 'ignored') {
      throw new BankRowAlreadyResolvedError(args.rowId, row.status);
    }
    await t.bankStatementRow.update({
      where: { id: args.rowId },
      data: {
        status: 'ignored',
        resolvedById: userId,
        resolvedAt: new Date(),
        narrative: args.reason
          ? `${row.narrative ?? ''}\n[ignored: ${args.reason}]`
          : row.narrative,
      },
    });
    await writeAudit(tx, ctx, {
      entity: 'addon.bank_import.row',
      entityId: args.rowId,
      action: 'update',
      after: { status: 'ignored', reason: args.reason ?? null },
    });
  });
}

async function loadRow(tenantId: string, rowId: string): Promise<BankRowSnapshot> {
  return withTenant(tenantId, async (tx) => {
    const t = tx as unknown as Tx;
    const row = await t.bankStatementRow.findUnique({ where: { id: rowId } });
    if (!row) throw new BankRowNotFoundError(rowId);
    if (row.status === 'confirmed' || row.status === 'ignored') {
      throw new BankRowAlreadyResolvedError(rowId, row.status);
    }
    return row;
  });
}

async function performConfirmation(
  ctx: AppContext,
  row: BankRowSnapshot,
  matchedDocId: string,
  matchedDocType: string,
): Promise<ConfirmMatchResult> {
  if (!ctx.tenant) throw new Error('performConfirmation: no tenant in context');
  const tenantId = ctx.tenant.id;

  // Resolve the matched invoice so we can copy the counterparty into the
  // payment doc.
  const invoice = await withTenant(tenantId, async (tx) => {
    const t = tx as unknown as Record<
      string,
      | {
          findUnique: (args: unknown) => Promise<{
            id: string;
            customer?: string | null;
            supplier?: string | null;
          } | null>;
        }
      | undefined
    >;
    const delegate =
      matchedDocType === 'sales.invoice' ? t.document_sales_invoice : t.document_purchases_invoice;
    if (!delegate) throw new Error(`performConfirmation: missing delegate for ${matchedDocType}`);
    return delegate.findUnique({ where: { id: matchedDocId } });
  });

  if (!invoice) throw new MissingMatchError(row.id);

  const direction = row.direction;
  const paymentDocType: 'sales.payment_received' | 'purchases.payment_sent' =
    direction === 'in' ? 'sales.payment_received' : 'purchases.payment_sent';
  const config = getRegistry().document[paymentDocType];
  if (!config) {
    throw new Error(`performConfirmation: missing document config for ${paymentDocType}`);
  }

  const amount = Number(row.amount);
  const linkedInvoices = JSON.stringify([{ invoiceId: matchedDocId, amount }]);

  // Create + post the payment doc in two existing engine calls.
  const paymentDoc = await createDocument(ctx, config, {
    date: row.valueDate,
    amount,
    note: row.narrative ?? null,
    linkedInvoices,
    ...(direction === 'in' ? { customer: invoice.customer } : { supplier: invoice.supplier }),
  });
  const paymentDocId = paymentDoc.id as string;

  await postDocument(ctx, config, paymentDocId);

  // Finalise the row.
  await withTenant(tenantId, async (tx) => {
    const t = tx as unknown as Tx;
    await t.bankStatementRow.update({
      where: { id: row.id },
      data: {
        status: 'confirmed',
        matchedDocId,
        matchedDocType,
        paymentDocId,
        paymentDocType,
        resolvedById: ctx.user.id,
        resolvedAt: new Date(),
      },
    });
    await writeAudit(tx, ctx, {
      entity: 'addon.bank_import.row',
      entityId: row.id,
      action: 'update',
      after: {
        status: 'confirmed',
        paymentDocId,
        paymentDocType,
        matchedDocId,
        matchedDocType,
      },
    });
  });

  return { rowId: row.id, paymentDocId, paymentDocType };
}
