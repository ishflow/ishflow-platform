/**
 * Public API — `/api/v1/products` end-to-end coverage.
 *
 * Seeds an isolated tenant + owning user + a read-scope ApiKey + a write-scope
 * ApiKey via `withBypass`. Asserts:
 *   - read-scope GET returns 200 with a paginated envelope
 *   - write-scope POST returns 201 and persists a row
 *   - read-scope POST is rejected with 403 `insufficient_scope`
 *   - malformed body (missing `name`) is rejected with 422 `validation_error`
 *
 * Notes:
 *   - Each spec file owns its tenant fixture so suites can run in parallel
 *     without colliding on `keyPrefix`/`@@unique([tenantId, name])`.
 *   - The dev server (or `pnpm dev`) must be running on baseURL. Playwright
 *     auto-spawns it via `playwright.config.ts.webServer`.
 *   - We use the canonical `generateApiKey()` helper rather than rolling our
 *     own bcrypt + crypto — keeps prefix/length/format invariants in one place.
 */

import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { generateApiKey } from '@/platform/api-keys/generate';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';

const tenantId = randomUUID();
const userId = randomUUID();

let readKey: string;
let writeKey: string;

test.beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_e2e_${userId.slice(0, 8)}`,
        email: `e2e-products-${userId.slice(0, 8)}@example.test`,
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_e2e_${tenantId.slice(0, 8)}`,
        name: 'E2E Products Tenant',
        slug: `e2e-products-${tenantId.slice(0, 8)}`,
        plan: 'business', // apiAccess = true
        status: 'active',
        currency: 'USD',
      },
    });

    const readGenerated = await generateApiKey();
    readKey = readGenerated.fullKey;
    await tx.apiKey.create({
      data: {
        tenantId,
        name: `e2e-read-${Date.now()}`,
        keyPrefix: readGenerated.prefix,
        keyHash: readGenerated.hash,
        scope: 'read',
        createdById: userId,
      },
    });

    const writeGenerated = await generateApiKey();
    writeKey = writeGenerated.fullKey;
    await tx.apiKey.create({
      data: {
        tenantId,
        name: `e2e-write-${Date.now()}`,
        keyPrefix: writeGenerated.prefix,
        keyHash: writeGenerated.hash,
        scope: 'write',
        createdById: userId,
      },
    });
  });
});

test.afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.apiKey.deleteMany({ where: { tenantId } });
    // Catalog rows are tenant-scoped — Tenant.onDelete: Cascade clears child
    // rows that have an FK back to tenant. Products use `tenant_id` columns
    // without an FK relation (codegen tables), so wipe them explicitly.
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_inventory_product WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.tenant.deleteMany({ where: { id: tenantId } });
    await tx.user.deleteMany({ where: { id: userId } });
  });
  await prisma.$disconnect();
});

test.describe('/api/v1/products — read scope', () => {
  test('GET with read key returns 200 + paginated envelope', async ({ request }) => {
    const res = await request.get('/api/v1/products', {
      headers: { Authorization: `Bearer ${readKey}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 50 });
    expect(typeof body.pagination.total).toBe('number');
  });

  test('POST with read key is rejected with 403 insufficient_scope', async ({ request }) => {
    const res = await request.post('/api/v1/products', {
      headers: { Authorization: `Bearer ${readKey}` },
      data: { name: 'Should-not-create' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe('insufficient_scope');
  });
});

test.describe('/api/v1/products — write scope', () => {
  test('POST with write key creates a product and persists the row', async ({ request }) => {
    const name = `E2E-Product-${randomUUID().slice(0, 8)}`;
    const res = await request.post('/api/v1/products', {
      headers: { Authorization: `Bearer ${writeKey}` },
      data: { name },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data?.id).toBeTruthy();
    expect(body.data?.name).toBe(name);

    // DB-side verification — bypass RLS to check the row exists in the
    // tenant's catalog table without going back through the API.
    const persisted = await withBypass((tx) =>
      tx.$queryRawUnsafe<{ id: string; name: string }[]>(
        'SELECT id, name FROM catalog_inventory_product WHERE tenant_id = $1::uuid AND name = $2',
        tenantId,
        name,
      ),
    );
    expect(persisted.length).toBe(1);
  });

  test('POST with empty body returns 422 validation_error', async ({ request }) => {
    const res = await request.post('/api/v1/products', {
      headers: { Authorization: `Bearer ${writeKey}` },
      data: {},
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe('validation_error');
  });
});
