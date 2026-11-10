'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';

/**
 * Create a bank account (QA H11b#81 — the catalog existed but had no UI to
 * create one, so the bank documents that require a Bank Account were unusable).
 *
 * `BankAccount` is a legacy Prisma model that predates the metadata engine:
 * no `deletedAt` column (so the generic engine CRUD can't manage it) and a
 * NOT-NULL `currency`. So this is a small bespoke insert — `currency` defaults
 * to the tenant's single currency, RLS scopes the write to the tenant.
 */
export async function createBankAccount(
  locale: string,
  data: { name: string; accountNo: string; bankName?: string; bic?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = data.name?.trim();
  const accountNo = data.accountNo?.trim();
  if (!name) return { ok: false, error: 'nameRequired' };
  if (!accountNo) return { ok: false, error: 'accountNoRequired' };

  try {
    const ctx = await requireTenantContext();
    if (!ctx.tenant) return { ok: false, error: 'noTenant' };
    const tenantId = ctx.tenant.id;
    const currency = ctx.tenant.currency ?? 'USD';

    const created = await withTenant(tenantId, (tx) =>
      (
        tx as unknown as {
          bankAccount: { create: (a: unknown) => Promise<{ id: string }> };
        }
      ).bankAccount.create({
        data: {
          tenantId,
          name,
          accountNo,
          bankName: data.bankName?.trim() || null,
          bic: data.bic?.trim() || null,
          currency,
        },
      }),
    );
    revalidatePath(`/${locale}/catalogs/bank-accounts`, 'page');
    return { ok: true, id: created.id };
  } catch (error) {
    // Unique (tenantId, accountNo) collision surfaces here.
    const msg = error instanceof Error ? error.message : 'unknown';
    return { ok: false, error: /Unique|unique|duplicate/.test(msg) ? 'duplicateAccountNo' : msg };
  }
}
