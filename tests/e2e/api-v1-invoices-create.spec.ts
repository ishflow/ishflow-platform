/**
 * Public API — `/api/v1/invoices` create + auto-post flow.
 *
 * Seeds a business-plan tenant + write-scope key + a customer + a product +
 * a sole warehouse (so `resolveDefaultWarehouseId` resolves without needing
 * `warehouseId` in the request body). Asserts that POSTing one invoice line
 * lands a POSTED document and surfaces a `lines` array.
 *
 * Caveat: `resolveLinePrices` walks `resolvePrice` when no `unitPrice` is
 * supplied. The customer's `defaultPriceType` is null here (we didn't seed
 * a price type), so we explicitly pass `unitPrice` per line — which is the
 * documented public-API escape hatch (`resolveLinePrices` returns the line
 * verbatim when `unitPrice` is set).
 *
 * The "inventory movement was written" assertion is best-effort: we read
 * `status === 'POSTED'` from the response, which is the proxy contract.
 * Direct querying of `Movement_inventory_stock_balance` would require
 * resolving the dynamically-generated table name and is out of scope here.
 */

import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { generateApiKey } from '@/platform/api-keys/generate';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';

const tenantId = randomUUID();
const userId = randomUUID();
const customerId = randomUUID();
const productId = randomUUID();
const warehouseId = randomUUID();

let writeKey: string;

test.beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_e2e_${userId.slice(0, 8)}`,
        email: `e2e-invoices-${userId.slice(0, 8)}@example.test`,
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_e2e_${tenantId.slice(0, 8)}`,
        name: 'E2E Invoices Tenant',
        slug: `e2e-invoices-${tenantId.slice(0, 8)}`,
        plan: 'business',
        status: 'active',
        currency: 'USD',
      },
    });
    const generated = await generateApiKey();
    writeKey = generated.fullKey;
    await tx.apiKey.create({
      data: {
        tenantId,
        name: `e2e-invoice-${Date.now()}`,
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
        scope: 'write',
        createdById: userId,
      },
    });

    // Catalog rows (codegen tables) — inserted via raw SQL so we don't need
    // to map the dynamic Prisma client surface.
    await tx.$executeRawUnsafe(
      `INSERT INTO catalog_sales_customer (id, tenant_id, name, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, now(), now())`,
      customerId,
      tenantId,
      'E2E Customer',
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO catalog_inventory_product (id, tenant_id, code, name, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, now(), now())`,
      productId,
      tenantId,
      `E2E-${productId.slice(0, 8)}`,
      'E2E Product',
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO catalog_inventory_warehouse (id, tenant_id, code, name, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, now(), now())`,
      warehouseId,
      tenantId,
      `WH-${warehouseId.slice(0, 8)}`,
      'E2E Warehouse',
    );
  });
});

test.afterAll(async () => {
  await withBypass(async (tx) => {
    // Clean up child rows first — codegen tables don't all have FKs, so
    // explicit DELETEs by tenant_id are safest. Order matters: movements →
    // line tables → header → catalog rows. Sales drives three registers
    // (stock balance, AR, and the sales report). Clean all three.
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_accounts_receivable WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_sale WHERE tenant_id = $1::uuid',
      tenantId,
    );
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
    await tx.apiKey.deleteMany({ where: { tenantId } });
    await tx.tenant.deleteMany({ where: { id: tenantId } });
    await tx.user.deleteMany({ where: { id: userId } });
  });
  await prisma.$disconnect();
});

test.describe('/api/v1/invoices — create + auto-post', () => {
  test('POST with one line creates a POSTED invoice with lines array', async ({ request }) => {
    const res = await request.post('/api/v1/invoices', {
      headers: { Authorization: `Bearer ${writeKey}` },
      data: {
        customerId,
        lines: [{ productId, quantity: 2, unitPrice: 100 }],
      },
    });
    expect(res.status(), `body: ${await res.text().catch(() => '<unreadable>')}`).toBe(201);
    const body = await res.json();
    expect(body.data?.id).toBeTruthy();
    expect(body.data?.status).toBe('POSTED');
    expect(Array.isArray(body.data?.lines)).toBe(true);
    expect(body.data.lines.length).toBe(1);
    expect(body.data.lines[0]?.product).toBe(productId);
  });
});
