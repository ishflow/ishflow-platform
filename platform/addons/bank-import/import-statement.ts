/**
 * Bank statement import workflow.
 *
 * Steps:
 *   1. Gate via `assertAddonEnabled(ctx, 'bank_integration')`.
 *   2. Parse the buffer into `ParsedRow[]` using the format-specific parser.
 *   3. Open a tenant-scoped transaction and:
 *      - Insert `BankStatementImport` (one).
 *      - For each parsed row, INSERT `BankStatementRow` (skip duplicates).
 *      - Run the matcher against the open-invoice candidate list (per-row
 *        direction + currency).
 *      - When a candidate is matched, set `status`/`matchedDocId`/`matchedDocType`.
 *   4. Update `matchedCount` on the import.
 *   5. Audit log the import action.
 *
 * Reusing the same statement file is idempotent: rows whose `externalId`
 * already exist for this tenant are skipped (unique constraint on
 * `tenantId, externalId`). The returned `rowCount` and `matchedCount` reflect
 * the FINAL state of the import (not just the newly inserted rows).
 */

import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { Prisma } from '@prisma/client';
import { assertAddonEnabled } from '../assert-addon';
import { matchRow } from './match';
import { findOpenInvoices } from './open-invoices';
import { type BankStatementFormat, type ParsedRow, parseStatement } from './parsers';

export type ImportStatementInput = {
  bankAccountId: string;
  format: BankStatementFormat;
  filename: string;
  buffer: Buffer;
};

export type ImportStatementResult = {
  importId: string;
  rowCount: number;
  matchedCount: number;
};

export class BankAccountNotFoundError extends Error {
  constructor(public readonly bankAccountId: string) {
    super(`bank_account_not_found:${bankAccountId}`);
    this.name = 'BankAccountNotFoundError';
  }
}

export class EmptyStatementError extends Error {
  constructor() {
    super('bank_statement_empty');
    this.name = 'EmptyStatementError';
  }
}

type Tx = Parameters<typeof withTenant>[1] extends (tx: infer T) => unknown ? T : never;

export async function importStatement(
  ctx: AppContext,
  input: ImportStatementInput,
): Promise<ImportStatementResult> {
  assertAddonEnabled(ctx, 'bank_integration');
  if (!ctx.tenant) throw new Error('importStatement: no tenant in context');
  const tenantId = ctx.tenant.id;
  const userId = ctx.user.id;

  const parsedRows = parseStatement(input.format, input.buffer);
  if (parsedRows.length === 0) throw new EmptyStatementError();

  return withTenant(tenantId, async (tx) => {
    const account = await (tx as unknown as Tx).bankAccount.findUnique({
      where: { id: input.bankAccountId },
      select: { id: true, currency: true },
    });
    if (!account) throw new BankAccountNotFoundError(input.bankAccountId);

    const importRow = await (tx as unknown as Tx).bankStatementImport.create({
      data: {
        tenantId,
        bankAccountId: input.bankAccountId,
        format: input.format,
        filename: input.filename,
        rowCount: parsedRows.length,
        matchedCount: 0,
        importedById: userId,
      },
      select: { id: true },
    });
    const importId = importRow.id;

    // Bulk-insert rows, swallowing duplicate-external-id collisions for re-imports.
    const insertedRows = await insertStatementRows(
      tx as unknown as Tx,
      tenantId,
      importId,
      input.bankAccountId,
      parsedRows,
    );

    // Group rows by (direction, currency) so we make at most 2 candidate
    // queries (one per A/R + A/P side).
    const byBucket = new Map<string, ParsedRow[]>();
    for (const r of insertedRows) {
      const key = `${r.row.direction}:${r.row.currency}`;
      const list = byBucket.get(key) ?? [];
      list.push(r.row);
      byBucket.set(key, list);
    }

    let matchedCount = 0;
    for (const [bucketKey, bucketRows] of byBucket) {
      const [direction, currency] = bucketKey.split(':') as ['in' | 'out', string];
      const candidates = await findOpenInvoices(
        tx as unknown as Tx & Record<string, unknown>,
        tenantId,
        direction,
        currency,
      );
      for (const r of bucketRows) {
        const result = matchRow(r, candidates);
        if (result.status === 'pending') continue;
        const inserted = insertedRows.find((ir) => ir.row.externalId === r.externalId);
        if (!inserted) continue;
        await (tx as unknown as Tx).bankStatementRow.update({
          where: { id: inserted.dbId },
          data: {
            status: result.status,
            matchConfidence: result.confidence
              ? new Prisma.Decimal(result.confidence.toFixed(3))
              : null,
            matchedDocId: result.candidateId,
            matchedDocType:
              result.candidateId && direction === 'in'
                ? 'sales.invoice'
                : result.candidateId && direction === 'out'
                  ? 'purchases.invoice'
                  : null,
          },
        });
        if (result.status === 'matched') matchedCount++;
      }
    }

    if (matchedCount > 0) {
      await (tx as unknown as Tx).bankStatementImport.update({
        where: { id: importId },
        data: { matchedCount },
      });
    }

    await writeAudit(tx, ctx, {
      entity: 'addon.bank_import',
      entityId: importId,
      action: 'create',
      after: {
        format: input.format,
        rowCount: parsedRows.length,
        matchedCount,
      },
    });

    return { importId, rowCount: parsedRows.length, matchedCount };
  });
}

type InsertedRow = { dbId: string; row: ParsedRow };

async function insertStatementRows(
  tx: Tx,
  tenantId: string,
  importId: string,
  bankAccountId: string,
  rows: readonly ParsedRow[],
): Promise<InsertedRow[]> {
  const out: InsertedRow[] = [];
  // Pre-load existing externalIds so we can skip duplicates without aborting
  // the outer transaction on P2002 (Postgres aborts the entire tx on a
  // unique-constraint violation; subsequent inserts in the same tx would all
  // fail with 25P02 "current transaction is aborted").
  const candidateIds = rows
    .map((r) => r.externalId)
    .filter((id): id is string => id !== null && id.length > 0);
  const existing =
    candidateIds.length > 0
      ? await tx.bankStatementRow.findMany({
          where: { tenantId, externalId: { in: candidateIds } },
          select: { externalId: true },
        })
      : [];
  const taken = new Set(existing.map((e) => e.externalId).filter((v): v is string => Boolean(v)));

  for (const row of rows) {
    if (row.externalId && taken.has(row.externalId)) {
      // Already imported in a prior run — skip silently.
      continue;
    }
    const created = await tx.bankStatementRow.create({
      data: {
        tenantId,
        importId,
        bankAccountId,
        valueDate: row.valueDate,
        direction: row.direction,
        amount: new Prisma.Decimal(row.amount.toFixed(2)),
        currency: row.currency,
        counterpartyName: row.counterpartyName,
        counterpartyAccount: row.counterpartyAccount,
        counterpartyInn: row.counterpartyInn,
        narrative: row.narrative,
        externalId: row.externalId,
        status: 'pending',
      },
      select: { id: true },
    });
    out.push({ dbId: created.id, row });
    if (row.externalId) taken.add(row.externalId);
  }
  return out;
}
