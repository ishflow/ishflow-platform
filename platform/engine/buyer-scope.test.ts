import { randomUUID } from 'node:crypto';
import type { AppContext } from '@/platform/auth/current-context';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { getRegistry } from '@/platform/metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRecord } from './crud';
import { createDocument } from './document-crud';
// Import configs to register them
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/documents/payment-sent';
import '@/configs/inventory/catalogs/warehouse';

const tenantId = randomUUID();
const userId = randomUUID();
const buyerUserId = randomUUID();

function ctxWithRoles(roles: string[], uid = userId): AppContext {
  return {
    user: { id: uid, email: 'test@example.com' } as unknown as AppContext['user'],
    tenant: { id: tenantId, name: 'test', slug: 'test' } as unknown as AppContext['tenant'],
    membership: {
      id: randomUUID(),
      tenantId,
      userId: uid,
      roles: roles.map((name) => ({ name })),
    } as unknown as AppContext['membership'],
    permissions: new Set(
      roles.flatMap((r) => {
        // Minimal permission sets for testing
        if (r === 'buyer')
          return [
            'purchases.supplier:write',
            'purchases.invoice:write',
            'purchases.payment_sent:write',
          ];
        return [];
      }),
    ),
    scopesByEntity: new Map(),
    addons: new Set(),
  } as unknown as AppContext;
}

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'buyer-scope-test',
        slug: `bs-${tenantId.slice(0, 8)}`,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_bs_${userId.slice(0, 8)}`,
        email: `bs-${userId.slice(0, 8)}@example.com`,
      },
    });
    await tx.user.create({
      data: {
        id: buyerUserId,
        clerkId: `user_bs_${buyerUserId.slice(0, 8)}`,
        email: `bs-${buyerUserId.slice(0, 8)}@example.com`,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_purchases_supplier WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_purchases_invoice WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM document_purchases_payment_sent WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.delete({ where: { id: tenantId } });
    await tx.user.delete({ where: { id: userId } });
    await tx.user.delete({ where: { id: buyerUserId } });
  });
});

describe('buyer scope auto-fill', () => {
  const supplierConfig = getRegistry().catalog['purchases.supplier'];
  const invoiceConfig = getRegistry().document['purchases.invoice'];
  const paymentConfig = getRegistry().document['purchases.payment_sent'];

  if (!supplierConfig) throw new Error('purchases.supplier config not registered');
  if (!invoiceConfig) throw new Error('purchases.invoice config not registered');
  if (!paymentConfig) throw new Error('purchases.payment_sent config not registered');

  it('auto-fills assignedBuyerId when buyer creates supplier', async () => {
    const ctx = ctxWithRoles(['buyer'], buyerUserId);
    const result = await createRecord(ctx, supplierConfig, { name: 'Auto Buyer Supplier' });
    expect(result.assignedBuyerId).toBe(buyerUserId);
  });

  it('does not auto-fill assignedBuyerId for non-buyer', async () => {
    const ctx = ctxWithRoles(['admin'], userId);
    ctx.permissions = new Set(['*:*']);
    const result = await createRecord(ctx, supplierConfig, { name: 'Admin Supplier' });
    expect(result.assignedBuyerId).toBeNull();
  });

  it('auto-fills assignedBuyerId when buyer creates purchase invoice', async () => {
    const ctx = ctxWithRoles(['buyer'], buyerUserId);
    // Need a supplier and warehouse first
    const supplier = await withTenant(tenantId, async (tx) => {
      return tx.catalog_purchases_supplier.create({
        data: {
          tenantId,
          code: randomUUID().slice(0, 8).toUpperCase(),
          name: `Supplier-${randomUUID().slice(0, 4)}`,
        },
      });
    });
    const warehouse = await withTenant(tenantId, async (tx) => {
      return tx.catalog_inventory_warehouse.create({
        data: {
          tenantId,
          name: `WH-${randomUUID().slice(0, 4)}`,
          code: `CODE-${randomUUID().slice(0, 4)}`,
        },
      });
    });
    const result = await createDocument(ctx, invoiceConfig, {
      date: new Date(),
      supplier: supplier.id,
      warehouse: warehouse.id,
    });
    expect(result.assignedBuyerId).toBe(buyerUserId);
  });

  it('auto-fills assignedBuyerId when buyer creates payment sent', async () => {
    const ctx = ctxWithRoles(['buyer'], buyerUserId);
    const supplier = await withTenant(tenantId, async (tx) => {
      return tx.catalog_purchases_supplier.create({
        data: {
          tenantId,
          code: randomUUID().slice(0, 8).toUpperCase(),
          name: `Supplier-${randomUUID().slice(0, 4)}`,
        },
      });
    });
    const result = await createDocument(ctx, paymentConfig, {
      date: new Date(),
      supplier: supplier.id,
      amount: 100,
    });
    expect(result.assignedBuyerId).toBe(buyerUserId);
  });
});
