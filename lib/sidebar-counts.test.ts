import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidatePath: vi.fn(),
}));

import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/documents/payment-received';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getSidebarCounts } from './sidebar-counts';

const tenantId = randomUUID();

beforeAll(async () => {
  await withBypass((tx) =>
    tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Sidebar test',
        slug: `sbc-${tenantId.slice(0, 8)}`,
      },
    }),
  );
  await withTenant(tenantId, async (tx) => {
    await tx.catalog_sales_customer.createMany({
      data: [
        { tenantId, code: 'ALPHA001', name: 'Alpha' },
        { tenantId, code: 'BRAVO001', name: 'Bravo' },
      ],
    });
    await tx.catalog_inventory_product.createMany({
      data: [{ tenantId, code: 'X1', name: 'Widget' }],
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

describe('getSidebarCounts', () => {
  it('returns the right count for each catalog/document registered', async () => {
    const counts = await getSidebarCounts(tenantId);
    expect(counts['catalog.sales.customer']).toBe(2);
    expect(counts['catalog.inventory.product']).toBe(1);
    expect(counts['document.sales.invoice']).toBe(0);
  });
});
