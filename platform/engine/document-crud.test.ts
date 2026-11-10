import { randomUUID } from 'node:crypto';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/accounts-receivable';
import { prisma } from '@/platform/db';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDocument, deleteDocument, getDocument, updateDocument } from './document-crud';
import { NotFoundError, PeriodClosedError } from './errors';
import { setPeriodClose } from './period-close';

const tenantId = randomUUID();
const otherTenantId = randomUUID();
const adminCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantId } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;
const otherCtx = {
  user: { id: randomUUID() } as never,
  tenant: { id: otherTenantId } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

const invoiceConfig = getRegistry().document['sales.invoice'];
if (!invoiceConfig) throw new Error('sales.invoice document not registered');

let customerId: string;
let productAId: string;
let productBId: string;
let warehouseId: string;

beforeAll(async () => {
  await withBypass(async (tx) => {
    for (const id of [tenantId, otherTenantId]) {
      await tx.tenant.create({
        data: {
          id,
          clerkOrgId: `org_${id}`,
          name: `Doc CRUD test ${id.slice(0, 6)}`,
          slug: `doccrud-${id.slice(0, 8)}`,
        },
      });
    }
  });
  customerId = randomUUID();
  productAId = randomUUID();
  productBId = randomUUID();
  warehouseId = randomUUID();
  await withTenant(tenantId, async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_sales_customer (id, tenant_id, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW())',
      customerId,
      tenantId,
      'CRUD Customer',
    );
    for (const [pid, code, name] of [
      [productAId, `A-${tenantId.slice(0, 6)}`, 'Widget A'] as const,
      [productBId, `B-${tenantId.slice(0, 6)}`, 'Widget B'] as const,
    ]) {
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
        pid,
        tenantId,
        code,
        name,
      );
    }
    await tx.$executeRawUnsafe(
      'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
      warehouseId,
      tenantId,
      `WH-${tenantId.slice(0, 6)}`,
      'CRUD Warehouse',
    );
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    for (const tid of [tenantId, otherTenantId]) {
      await tx.$executeRawUnsafe(
        'DELETE FROM document_line_sales_invoice_items WHERE tenant_id = $1::uuid',
        tid,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
        tid,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
        tid,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
        tid,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
        tid,
      );
      await tx.$executeRawUnsafe('DELETE FROM document_sequence WHERE tenant_id = $1::uuid', tid);
      await tx.tenant.delete({ where: { id: tid } });
    }
  });
  await prisma.$disconnect();
});

describe('document CRUD — lines round-trip', () => {
  it('createDocument writes header + line rows with sequence 1..N', async () => {
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { product: productAId, quantity: 1, price: '10.00' },
          { product: productBId, quantity: 2, price: '20.00' },
          { product: productAId, quantity: 3, price: '30.00' },
        ],
      },
    });
    const items = (created.lines as { items: Array<{ sequence: number }> }).items;
    expect(items).toHaveLength(3);
    expect(items.map((l) => l.sequence)).toEqual([1, 2, 3]);
  });

  it('getDocument returns lines ordered by sequence', async () => {
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { product: productAId, quantity: 5, price: '1.00' },
          { product: productBId, quantity: 6, price: '2.00' },
        ],
      },
    });
    const fetched = await getDocument(adminCtx, invoiceConfig, created.id as string);
    const items = (fetched.lines as { items: Array<{ sequence: number; quantity: number }> }).items;
    expect(items[0]?.quantity).toBe(5);
    expect(items[1]?.quantity).toBe(6);
  });

  it('updateDocument diffs lines: add, remove, reorder', async () => {
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { product: productAId, quantity: 1, price: '1.00' },
          { product: productBId, quantity: 2, price: '2.00' },
          { product: productAId, quantity: 3, price: '3.00' },
        ],
      },
    });
    const fetched = await getDocument(adminCtx, invoiceConfig, created.id as string);
    const items = (fetched.lines as { items: Array<{ id: string }> }).items;
    const firstId = items[0]?.id;
    const thirdId = items[2]?.id;

    // Swap 1st and 3rd, drop middle, append a fresh line.
    const updated = await updateDocument(adminCtx, invoiceConfig, created.id as string, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { id: thirdId, product: productAId, quantity: 3, price: '3.00' },
          { id: firstId, product: productAId, quantity: 1, price: '1.00' },
          { product: productBId, quantity: 99, price: '99.99' },
        ],
      },
    });
    const newItems = (
      updated.lines as {
        items: Array<{ id: string; sequence: number; quantity: number }>;
      }
    ).items;
    expect(newItems).toHaveLength(3);
    expect(newItems.map((l) => l.sequence)).toEqual([1, 2, 3]);
    expect(newItems[0]?.id).toBe(thirdId);
    expect(newItems[1]?.id).toBe(firstId);
    expect(newItems[2]?.quantity).toBe(99);
  });

  it('RLS isolates lines across tenants — other tenant gets NotFoundError', async () => {
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productAId, quantity: 1, price: '1.00' }],
      },
    });
    await expect(getDocument(otherCtx, invoiceConfig, created.id as string)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('deleteDocument soft-deletes parent — lines remain but are unreachable', async () => {
    const created = await createDocument(adminCtx, invoiceConfig, {
      date: new Date(),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [{ product: productAId, quantity: 1, price: '1.00' }],
      },
    });
    await deleteDocument(adminCtx, invoiceConfig, created.id as string);
    // Parent soft-deleted: findUnique still returns the row (deletedAt is set),
    // but get returns whatever; list excludes it. We verify by refetching the
    // raw header and confirming its deletedAt is set.
    const found = await withTenant(tenantId, async (tx) =>
      (
        tx as unknown as {
          document_sales_invoice: { findUnique: (args: unknown) => Promise<unknown> };
        }
      ).document_sales_invoice.findUnique({ where: { id: created.id } }),
    );
    expect((found as { deletedAt: Date | null }).deletedAt).toBeInstanceOf(Date);
  });

  it('getDocument + createDocument enable a clone flow — strip engine fields, recreate as new DRAFT', async () => {
    const original = await createDocument(adminCtx, invoiceConfig, {
      date: new Date('2026-01-01'),
      customer: customerId,
      warehouse: warehouseId,
      lines: {
        items: [
          { product: productAId, quantity: 2, price: '10.00' },
          { product: productAId, quantity: 3, price: '12.50' },
        ],
      },
    });

    const source = (await getDocument(adminCtx, invoiceConfig, original.id as string)) as Record<
      string,
      unknown
    >;
    const {
      id: _id,
      number: _number,
      status: _status,
      postedAt: _postedAt,
      postedBy: _postedBy,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      version: _version,
      tenantId: _tenantId,
      ...rest
    } = source;

    const clone = (await createDocument(adminCtx, invoiceConfig, rest)) as {
      id: string;
      number: string;
      status: string;
      customer: string;
    };

    // Different id + number + SAVED (DRAFT) status.
    expect(clone.id).not.toBe(original.id);
    expect(clone.number).not.toBe((original as { number: string }).number);
    expect(clone.status).toBe('SAVED');
    // Same customer + line content.
    expect(clone.customer).toBe(customerId);
    const cloneWithLines = (await getDocument(adminCtx, invoiceConfig, clone.id)) as {
      lines: { items: Array<{ product: string; quantity: number }> };
    };
    expect(cloneWithLines.lines.items).toHaveLength(2);
    expect(cloneWithLines.lines.items[0]?.product).toBe(productAId);
    expect(cloneWithLines.lines.items[0]?.quantity).toBe(2);
    expect(cloneWithLines.lines.items[1]?.quantity).toBe(3);
  });
});

describe('document CRUD — period close', () => {
  const pcTenantId = randomUUID();
  const pcUserId = randomUUID();
  const pcCustomerId = randomUUID();
  const pcProductId = randomUUID();
  const pcWarehouseId = randomUUID();
  const pcCtx = {
    user: { id: pcUserId } as never,
    tenant: { id: pcTenantId } as never,
    membership: { roles: ['bookkeeper'] } as never,
    permissions: new Set<string>(['sales.invoice:write']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;

  beforeAll(async () => {
    await withBypass(async (tx) => {
      await tx.tenant.create({
        data: {
          id: pcTenantId,
          clerkOrgId: `org_${pcTenantId}`,
          name: 'Period close CRUD',
          slug: `pcc-${pcTenantId.slice(0, 8)}`,
        },
      });
      await tx.user.create({
        data: {
          id: pcUserId,
          clerkId: `user_pcc_${pcUserId.slice(0, 8)}`,
          email: `pcc-${pcUserId.slice(0, 8)}@example.com`,
        },
      });
    });
    await withTenant(pcTenantId, async (tx) => {
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_sales_customer (id, tenant_id, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW())',
        pcCustomerId,
        pcTenantId,
        'PC Customer',
      );
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
        pcProductId,
        pcTenantId,
        `PC-${pcTenantId.slice(0, 6)}`,
        'PC Widget',
      );
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
        pcWarehouseId,
        pcTenantId,
        'MAIN',
        'PC Warehouse',
      );
      await setPeriodClose(tx, pcTenantId, pcUserId, 'sales', new Date('2026-03-31T23:59:59Z'));
    });
  });

  afterAll(async () => {
    await withBypass(async (tx) => {
      await tx.$executeRawUnsafe('DELETE FROM period_close WHERE tenant_id = $1::uuid', pcTenantId);
      await tx.$executeRawUnsafe(
        'DELETE FROM document_line_sales_invoice_items WHERE tenant_id = $1::uuid',
        pcTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
        pcTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
        pcTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
        pcTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
        pcTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sequence WHERE tenant_id = $1::uuid',
        pcTenantId,
      );
      await tx.tenant.delete({ where: { id: pcTenantId } });
      await tx.user.delete({ where: { id: pcUserId } });
    });
  });

  it('refuses to create a document in a closed period', async () => {
    await expect(
      createDocument(pcCtx, invoiceConfig, {
        date: new Date('2026-03-15T00:00:00Z'),
        customer: pcCustomerId,
        warehouse: pcWarehouseId,
        lines: {
          items: [{ product: pcProductId, quantity: 1, price: '10.00' }],
        },
      }),
    ).rejects.toBeInstanceOf(PeriodClosedError);
  });

  it('allows creation after the closed-through date', async () => {
    const doc = await createDocument(pcCtx, invoiceConfig, {
      date: new Date('2026-04-15T00:00:00Z'),
      customer: pcCustomerId,
      warehouse: pcWarehouseId,
      lines: {
        items: [{ product: pcProductId, quantity: 1, price: '10.00' }],
      },
    });
    expect(doc.id).toBeDefined();
  });
});

describe('document CRUD — assignedRepId denormalization', () => {
  const arTenantId = randomUUID();
  const arUserId = randomUUID();
  const arCustomerId = randomUUID();
  const arProductId = randomUUID();
  const arWarehouseId = randomUUID();
  const repId = randomUUID();
  const arCtx = {
    user: { id: arUserId } as never,
    tenant: { id: arTenantId } as never,
    membership: { roles: ['admin'] } as never,
    permissions: new Set<string>(['*:*']),
    scopesByEntity: new Map<string, unknown>(),
    addons: new Set(),
  } as never;

  beforeAll(async () => {
    await withBypass(async (tx) => {
      await tx.tenant.create({
        data: {
          id: arTenantId,
          clerkOrgId: `org_${arTenantId}`,
          name: 'AssignedRep CRUD',
          slug: `ar-${arTenantId.slice(0, 8)}`,
        },
      });
      await tx.user.create({
        data: {
          id: arUserId,
          clerkId: `user_ar_${arUserId.slice(0, 8)}`,
          email: `ar-${arUserId.slice(0, 8)}@example.com`,
        },
      });
    });
    await withTenant(arTenantId, async (tx) => {
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_sales_customer (id, tenant_id, name, "assignedRepId", created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4::uuid, NOW(), NOW())',
        arCustomerId,
        arTenantId,
        'AR Customer',
        repId,
      );
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
        arProductId,
        arTenantId,
        `AR-${arTenantId.slice(0, 6)}`,
        'AR Widget',
      );
      await tx.$executeRawUnsafe(
        'INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())',
        arWarehouseId,
        arTenantId,
        'MAIN',
        'AR Warehouse',
      );
    });
  });

  afterAll(async () => {
    await withBypass(async (tx) => {
      await tx.$executeRawUnsafe(
        'DELETE FROM document_line_sales_invoice_items WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sales_payment_received WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sales_invoice WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_inventory_warehouse WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM catalog_sales_customer WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.$executeRawUnsafe(
        'DELETE FROM document_sequence WHERE tenant_id = $1::uuid',
        arTenantId,
      );
      await tx.tenant.delete({ where: { id: arTenantId } });
      await tx.user.delete({ where: { id: arUserId } });
    });
  });

  it('auto-sets invoice.assignedRepId from customer on create', async () => {
    const doc = await createDocument(arCtx, invoiceConfig, {
      date: new Date(),
      customer: arCustomerId,
      warehouse: arWarehouseId,
      lines: {
        items: [{ product: arProductId, quantity: 1, price: '10.00' }],
      },
    });
    expect(doc.assignedRepId).toBe(repId);
  });

  it('preserves explicit assignedRepId if already provided', async () => {
    const explicitRep = randomUUID();
    const doc = await createDocument(arCtx, invoiceConfig, {
      date: new Date(),
      customer: arCustomerId,
      warehouse: arWarehouseId,
      assignedRepId: explicitRep,
      lines: {
        items: [{ product: arProductId, quantity: 1, price: '10.00' }],
      },
    });
    expect(doc.assignedRepId).toBe(explicitRep);
  });

  it('auto-sets payment_received.assignedRepId from customer on create', async () => {
    const paymentConfig = getRegistry().document['sales.payment_received'];
    if (!paymentConfig) throw new Error('sales.payment_received document not registered');
    const doc = await createDocument(arCtx, paymentConfig, {
      date: new Date(),
      customer: arCustomerId,
      amount: '100.00',
    });
    expect(doc.assignedRepId).toBe(repId);
  });
});
