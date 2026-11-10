'use server';

import { resolveContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';

const ALLOWED = ['RUB', 'USD', 'EUR', 'TRY', 'KZT', 'KGS', 'UZS', 'CNY'] as const;

export async function setTenantCurrencyAction(code: string) {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return { ok: false, message: 'no tenant' };
  const cur = code.toUpperCase();
  if (!(ALLOWED as readonly string[]).includes(cur)) {
    return { ok: false, message: `unsupported currency ${cur}` };
  }
  const tenantId = ctx.tenant.id;
  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenantId },
      data: { currency: cur },
    }),
  );
  revalidatePath('/onboarding');
  return { ok: true };
}
