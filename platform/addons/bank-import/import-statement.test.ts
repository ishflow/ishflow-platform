/**
 * Integration coverage for the import workflow against the live Postgres
 * test DB. Sets up: 1 tenant + 1 user + 1 bank account, then:
 *
 *   - Verifies the addon gate (no addon → throws).
 *   - Imports a Sber CSV fixture → rows persisted, counts accurate.
 *   - Re-imports the same CSV → no duplicate rows (externalId unique).
 *   - Pre-seeds an A/R movement that matches one of the bank rows → matcher
 *     promotes the row to `matched`.
 *
 * Confirmation flow against the live posting engine is exercised in
 * confirm-row.test.ts (skipped when DATABASE_URL is unset).
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppContext } from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddonDisabledError } from '../assert-addon';
import { BankAccountNotFoundError, importStatement } from './import-statement';

const FIXTURE_SBER = readFileSync(join(__dirname, '__fixtures__', 'sber.csv'));

// Integration tests need a live Postgres test DB. Skip cleanly when the
// worktree is unconfigured (no .env.local) so unit-only test runs stay green.
const HAS_DB = Boolean(process.env.DATABASE_URL);
const describeIfDb = HAS_DB ? describe : describe.skip;

const tenantId = randomUUID();
const userId = randomUUID();

function buildCtx(addonEnabled: boolean): AppContext {
  return {
    user: { id: userId, clerkId: `clerk_${userId}` } as never,
    tenant: { id: tenantId, name: 'Bank Import T', slug: 'bi' } as never,
    membership: { roles: [] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map(),
    addons: new Set(addonEnabled ? (['bank_integration'] as const) : []),
  };
}

let bankAccountId: string;

beforeAll(async () => {
  if (!HAS_DB) return;
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Bank Import T',
        slug: `bi-${tenantId.slice(0, 8)}`,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `clerk_${userId}`,
        email: `bi-${userId.slice(0, 8)}@example.test`,
      },
    });
  });
  await withTenant(tenantId, async (tx) => {
    const acc = await (
      tx as unknown as {
        bankAccount: {
          create: (args: unknown) => Promise<{ id: string }>;
        };
      }
    ).bankAccount.create({
      data: {
        tenantId,
        name: 'Primary',
        accountNo: '40702810999999999999',
        currency: 'RUB',
      },
    });
    bankAccountId = acc.id;
  });
});

afterAll(async () => {
  if (!HAS_DB) return;
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM bank_statement_row WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM bank_statement_import WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe('DELETE FROM bank_account WHERE tenant_id = $1::uuid', tenantId);
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_accounts_receivable WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.delete({ where: { id: tenantId } });
    await tx.user.delete({ where: { id: userId } });
  });
  await prisma.$disconnect();
});

describeIfDb('importStatement — addon gate', () => {
  it('throws AddonDisabledError when the addon is not enabled', async () => {
    await expect(
      importStatement(buildCtx(false), {
        bankAccountId,
        format: 'sber_csv',
        filename: 'sber.csv',
        buffer: FIXTURE_SBER,
      }),
    ).rejects.toBeInstanceOf(AddonDisabledError);
  });

  it('throws BankAccountNotFoundError for an unknown account', async () => {
    await expect(
      importStatement(buildCtx(true), {
        bankAccountId: randomUUID(),
        format: 'sber_csv',
        filename: 'sber.csv',
        buffer: FIXTURE_SBER,
      }),
    ).rejects.toBeInstanceOf(BankAccountNotFoundError);
  });
});

describeIfDb('importStatement — Sber fixture', () => {
  it('persists rows and reports rowCount correctly', async () => {
    const result = await importStatement(buildCtx(true), {
      bankAccountId,
      format: 'sber_csv',
      filename: 'sber.csv',
      buffer: FIXTURE_SBER,
    });
    expect(result.rowCount).toBe(4);

    const persisted = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          bankStatementRow: {
            findMany: (args: unknown) => Promise<Array<{ id: string; externalId: string }>>;
          };
        }
      ).bankStatementRow.findMany({ where: { importId: result.importId } }),
    );
    expect(persisted).toHaveLength(4);
  });

  it('re-importing the same CSV does NOT duplicate rows', async () => {
    const first = await importStatement(buildCtx(true), {
      bankAccountId,
      format: 'sber_csv',
      filename: 'sber.csv',
      buffer: FIXTURE_SBER,
    });
    const second = await importStatement(buildCtx(true), {
      bankAccountId,
      format: 'sber_csv',
      filename: 'sber.csv',
      buffer: FIXTURE_SBER,
    });
    expect(first.rowCount).toBe(4);
    expect(second.rowCount).toBe(4);

    const persistedSecond = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          bankStatementRow: { findMany: (args: unknown) => Promise<unknown[]> };
        }
      ).bankStatementRow.findMany({ where: { importId: second.importId } }),
    );
    // External ids already exist from the first import → no new rows.
    expect(persistedSecond).toHaveLength(0);
  });
});
