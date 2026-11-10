'use server';

import '@/configs';
import { requireTenantContext } from '@/platform/auth/current-context';
import { restoreRecord } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import { revalidatePath } from 'next/cache';

/**
 * Restore (un-archive) a soft-deleted partner. Mirrors the products list
 * Restore action (QA H1) for the customer + supplier catalogs, which have no
 * bulk toolbar — the list shows a per-row Restore button in the Archived view.
 */
async function restorePartner(
  entity: 'sales.customer' | 'purchases.supplier',
  locale: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getRegistry().catalog[entity];
  if (!config) return { ok: false, error: 'Config not found' };
  try {
    const ctx = await requireTenantContext();
    await restoreRecord(ctx, config, id);
    const segment = entity === 'sales.customer' ? 'customers' : 'suppliers';
    revalidatePath(`/${locale}/catalogs/partners/${segment}`, 'page');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function restoreCustomer(locale: string, id: string) {
  return restorePartner('sales.customer', locale, id);
}

export async function restoreSupplier(locale: string, id: string) {
  return restorePartner('purchases.supplier', locale, id);
}
