/**
 * Public API — authentication failure modes for `/api/v1/*`.
 *
 * Each failure mode in §"Error codes" of the public-API spec is exercised:
 *   - Missing Authorization header        → 401 `unauthorized`
 *   - Malformed Authorization scheme      → 401 `unauthorized`
 *   - Non-`1ca_live_` bearer token        → 401 `invalid_api_key`
 *   - Well-formed token with no DB row    → 401 `invalid_api_key`
 *   - Revoked key                          → 401 `invalid_api_key`
 *   - Tenant on a plan without apiAccess  → 402 `feature_locked`
 *
 * The free-plan path bypasses the admin action's feature gate by inserting
 * the row directly via `withBypass` — that's the whole point of the test:
 * even if a key escaped into existence on a free tenant, the auth layer must
 * still reject it at request time.
 */

import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { generateApiKey } from '@/platform/api-keys/generate';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';

// Business-plan tenant for the "revoked key" assertion (passes the apiAccess
// gate so we isolate the revocation behaviour from the plan gate).
const businessTenantId = randomUUID();
const businessUserId = randomUUID();
let revokedKey: string;

// Free-plan tenant for the 402 `feature_locked` assertion.
const freeTenantId = randomUUID();
const freeUserId = randomUUID();
let freePlanKey: string;

test.beforeAll(async () => {
  await withBypass(async (tx) => {
    // Business-plan fixture (key gets revoked below).
    await tx.user.create({
      data: {
        id: businessUserId,
        clerkId: `user_e2e_${businessUserId.slice(0, 8)}`,
        email: `e2e-auth-biz-${businessUserId.slice(0, 8)}@example.test`,
      },
    });
    await tx.tenant.create({
      data: {
        id: businessTenantId,
        clerkOrgId: `org_e2e_${businessTenantId.slice(0, 8)}`,
        name: 'E2E Auth Biz Tenant',
        slug: `e2e-auth-biz-${businessTenantId.slice(0, 8)}`,
        plan: 'business',
        status: 'active',
        currency: 'USD',
      },
    });
    const revoked = await generateApiKey();
    revokedKey = revoked.fullKey;
    await tx.apiKey.create({
      data: {
        tenantId: businessTenantId,
        name: `e2e-revoked-${Date.now()}`,
        keyPrefix: revoked.prefix,
        keyHash: revoked.hash,
        scope: 'read',
        createdById: businessUserId,
        revokedAt: new Date(),
      },
    });

    // Free-plan fixture (key exists but plan lacks apiAccess).
    await tx.user.create({
      data: {
        id: freeUserId,
        clerkId: `user_e2e_${freeUserId.slice(0, 8)}`,
        email: `e2e-auth-free-${freeUserId.slice(0, 8)}@example.test`,
      },
    });
    await tx.tenant.create({
      data: {
        id: freeTenantId,
        clerkOrgId: `org_e2e_${freeTenantId.slice(0, 8)}`,
        name: 'E2E Auth Free Tenant',
        slug: `e2e-auth-free-${freeTenantId.slice(0, 8)}`,
        plan: 'free', // apiAccess = false
        status: 'active',
        currency: 'USD',
      },
    });
    const freeGenerated = await generateApiKey();
    freePlanKey = freeGenerated.fullKey;
    await tx.apiKey.create({
      data: {
        tenantId: freeTenantId,
        name: `e2e-free-${Date.now()}`,
        keyPrefix: freeGenerated.prefix,
        keyHash: freeGenerated.hash,
        scope: 'read',
        createdById: freeUserId,
      },
    });
  });
});

test.afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.apiKey.deleteMany({
      where: { tenantId: { in: [businessTenantId, freeTenantId] } },
    });
    await tx.tenant.deleteMany({ where: { id: { in: [businessTenantId, freeTenantId] } } });
    await tx.user.deleteMany({ where: { id: { in: [businessUserId, freeUserId] } } });
  });
  await prisma.$disconnect();
});

test.describe('/api/v1/me — auth failure modes', () => {
  test('missing Authorization header → 401 unauthorized', async ({ request }) => {
    const res = await request.get('/api/v1/me');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('unauthorized');
  });

  test('malformed Authorization scheme (Token instead of Bearer) → 401 unauthorized', async ({
    request,
  }) => {
    const res = await request.get('/api/v1/me', {
      headers: { Authorization: 'Token foo' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('unauthorized');
  });

  test('bearer token without 1ca_live_ prefix → 401 invalid_api_key', async ({ request }) => {
    const res = await request.get('/api/v1/me', {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.notakey' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('invalid_api_key');
  });

  test('well-formed 1ca_live_ token with no DB row → 401 invalid_api_key', async ({ request }) => {
    // 41 chars total: 9 prefix + 32 hex body. Random hex avoids collisions.
    const bogus = `1ca_live_${'a'.repeat(32)}`;
    const res = await request.get('/api/v1/me', {
      headers: { Authorization: `Bearer ${bogus}` },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('invalid_api_key');
  });

  test('revoked key → 401 invalid_api_key', async ({ request }) => {
    const res = await request.get('/api/v1/me', {
      headers: { Authorization: `Bearer ${revokedKey}` },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('invalid_api_key');
  });

  test('free-plan tenant key → 402 feature_locked', async ({ request }) => {
    const res = await request.get('/api/v1/me', {
      headers: { Authorization: `Bearer ${freePlanKey}` },
    });
    expect(res.status()).toBe(402);
    const body = await res.json();
    expect(body.error?.code).toBe('feature_locked');
  });
});
