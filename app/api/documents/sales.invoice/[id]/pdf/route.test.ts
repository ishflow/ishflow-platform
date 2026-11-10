import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { createDocument } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';

vi.mock('@/platform/auth/current-context', async () => {
  const actual = await vi.importActual<typeof import('@/platform/auth/current-context')>(
    '@/platform/auth/current-context',
  );
  return {
    ...actual,
    requireTenantContext: vi.fn(),
  };
});

import { requireTenantContext } from '@/platform/auth/current-context';
import { GET } from './route';

const tenantId = randomUUID();
const userId = randomUUID();
const mocked = vi.mocked(requireTenantContext);

let invoiceId = '';
let customerId = '';
let productId = '';
let warehouseId = '';

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'PDF test',
        slug: `pdf-${tenantId.slice(0, 8)}`,
      },
    });
  });
  const customerCfg = getRegistry().catalog['sales.customer'];
  const productCfg = getRegistry().catalog['inventory.product'];
  const warehouseCfg = getRegistry().catalog['inventory.warehouse'];
  const invoiceCfg = getRegistry().document['sales.invoice'];
  if (!customerCfg || !productCfg || !warehouseCfg || !invoiceCfg)
    throw new Error('config missing');
  const ctx = {
    user: { id: userId },
    tenant: { id: tenantId, currency: 'USD' },
    membership: { roles: ['admin'] },
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
  } as never;
  const c = (await (
    await import('@/platform/engine')
  ).createRecord(ctx, customerCfg, {
    name: 'PDF Customer',
  })) as { id: string };
  customerId = c.id;
  const p = (await (
    await import('@/platform/engine')
  ).createRecord(ctx, productCfg, {
    code: 'PDF-001',
    name: 'PDF Widget',
  })) as { id: string };
  productId = p.id;
  const w = (await (
    await import('@/platform/engine')
  ).createRecord(ctx, warehouseCfg, {
    code: 'MAIN',
    name: 'PDF Warehouse',
  })) as { id: string };
  warehouseId = w.id;
  const inv = (await createDocument(ctx, invoiceCfg, {
    date: new Date(),
    customer: customerId,
    lines: { items: [{ warehouse: warehouseId, product: productId, quantity: 2, price: 12.5 }] },
  })) as { id: string };
  invoiceId = inv.id;
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM document_line_sales_invoice_items WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_sequence WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

describe('invoice PDF route', () => {
  it('returns a PDF buffer for an existing invoice', async () => {
    mocked.mockResolvedValue({
      user: { id: userId },
      tenant: { id: tenantId, name: 'PDF test', currency: 'USD' },
      membership: { roles: ['admin'] },
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map<string, unknown>(),
    } as never);
    const res = await GET(new Request(`http://test/api/documents/sales.invoice/${invoiceId}/pdf`), {
      params: Promise.resolve({ id: invoiceId }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('returns 401 without auth', async () => {
    mocked.mockRejectedValue(new Error('no auth'));
    const res = await GET(new Request(`http://test/api/documents/sales.invoice/${invoiceId}/pdf`), {
      params: Promise.resolve({ id: invoiceId }),
    });
    expect(res.status).toBe(401);
  });
});
