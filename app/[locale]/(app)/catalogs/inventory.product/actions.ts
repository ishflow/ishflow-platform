'use server';

import '@/configs';
import { requireTenantContext } from '@/platform/auth/current-context';
import { createRecord, deleteRecord, restoreRecord, updateRecord } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import { revalidatePath } from 'next/cache';

export async function createCategory(
  locale: string,
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product_category'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    const created = await createRecord(ctx, config, { name });
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true, id: String(created.id) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createGroup(
  locale: string,
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product_group'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    const created = await createRecord(ctx, config, { name });
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true, id: String(created.id) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Bulk-archive (soft-delete) the selected products. Powers the products list
 * bulk-action toolbar (QA #44 — the toolbar buttons were hardcoded disabled).
 * Soft-delete only (sets deletedAt); records remain restorable.
 */
export async function bulkArchiveProducts(
  locale: string,
  productIds: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    for (const productId of productIds) {
      await deleteRecord(ctx, config, productId);
    }
    revalidatePath(`/${locale}/catalogs/products`, 'page');
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true, count: productIds.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Bulk-restore (un-archive) the selected products — the inverse of
 * `bulkArchiveProducts`. Powers the Restore action in the products list's
 * "Archived" view (QA H1 — archived records were previously unrecoverable).
 */
export async function restoreProducts(
  locale: string,
  productIds: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    for (const productId of productIds) {
      await restoreRecord(ctx, config, productId);
    }
    revalidatePath(`/${locale}/catalogs/products`, 'page');
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true, count: productIds.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function assignProductsToCategory(
  locale: string,
  categoryId: string,
  productIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    for (const productId of productIds) {
      await updateRecord(ctx, config, productId, { categoryId });
    }
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function assignProductsToGroup(
  locale: string,
  groupId: string,
  productIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    for (const productId of productIds) {
      await updateRecord(ctx, config, productId, { groupId });
    }
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function removeProductsFromCategory(
  locale: string,
  productIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    for (const productId of productIds) {
      await updateRecord(ctx, config, productId, { categoryId: null });
    }
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function removeProductsFromGroup(
  locale: string,
  productIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = getRegistry().catalog['inventory.product'];
  if (!config) return { ok: false, error: 'Config not found' };

  try {
    const ctx = await requireTenantContext();
    for (const productId of productIds) {
      await updateRecord(ctx, config, productId, { groupId: null });
    }
    revalidatePath(`/${locale}/catalogs/inventory.product`, 'page');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
