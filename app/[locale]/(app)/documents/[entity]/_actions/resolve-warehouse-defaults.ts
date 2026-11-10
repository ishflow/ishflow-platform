'use server';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';

/**
 * Resolves the default warehouse for single-warehouse tenants.
 * Returns the warehouse id when exactly one exists; null otherwise.
 * Uses take: 2 so multi-warehouse tenants don't pay a full count.
 */
export async function resolveWarehouseDefaults(): Promise<{
  warehouseId: string | null;
}> {
  const { tenant } = await requireTenantContext();
  const rows = await withTenant(tenant.id, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed on tx generic
    return await (tx as any).catalog_inventory_warehouse.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: 2,
    });
  });
  if (rows.length === 1) return { warehouseId: rows[0].id };
  return { warehouseId: null };
}
