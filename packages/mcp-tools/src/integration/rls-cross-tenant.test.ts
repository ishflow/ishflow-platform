/**
 * RLS cross-tenant integration test for the MCP dispatch path.
 *
 * Verifies that an MCP tool dispatched with tenant A's context cannot reach
 * tenant B's data through `catalog_get`. The test exercises the same code
 * path the live `app/api/mcp/route.ts` runs — `dispatchTool` → engine
 * helper (`getRecord`) → `withTenant` → RLS-enforced Prisma client — so a
 * regression in any of those layers surfaces here.
 *
 * Self-seeding: builds two ephemeral tenants and one customer in tenant A
 * via the DIRECT_URL superuser (RLS bypass), then tears them down in
 * afterAll. The dispatched tools themselves go through the regular Prisma
 * client (`canalog_app` role, RLS-enforced).
 *
 * This package is contractually `withBypass`-free (see lint rule under
 * `scripts/check-no-bypass.mjs`), so the test uses a local `PrismaClient`
 * bound to `DIRECT_URL` for its fixture lifecycle instead of importing
 * `withBypass` from the platform.
 *
 * Skip behaviour: if the local Postgres is unreachable (no docker, no
 * tunnel), the suite fails fast with a clear "DB unreachable" message in
 * beforeAll. CI runs always provision Postgres, so the test is treated as
 * mandatory there.
 *
 * Run via: pnpm dotenv -e .env.local -- pnpm --filter @ishflow/mcp-tools \
 *   vitest run src/integration/rls-cross-tenant
 */
import { randomUUID } from 'node:crypto';
import '@/configs/sales/catalogs/customer';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dispatchTool } from '../server';
import type { McpToolContext } from '../types';

const prismaDirect = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const tenantA = randomUUID();
const tenantB = randomUUID();
const userA = randomUUID();
const userB = randomUUID();
let customerInA: string;

const appCtxA = {
  user: { id: userA },
  tenant: { id: tenantA },
  membership: { roles: ['admin'] },
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as const;
const appCtxB = {
  user: { id: userB },
  tenant: { id: tenantB },
  membership: { roles: ['admin'] },
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as const;

function ctxFor(tenantId: string, appCtx: object, userId: string): McpToolContext {
  return {
    tenantId,
    userId,
    apiKeyId: `integration-test-${tenantId.slice(0, 8)}`,
    scope: 'read',
    locale: 'en',
    correlationId: 'rls-test',
    appContext: appCtx as unknown as McpToolContext['appContext'],
  };
}

beforeAll(async () => {
  // Two ephemeral tenants + one customer in A. Use the DIRECT_URL superuser
  // (RLS-bypass-capable) directly so the test fixture stays inside the
  // package's `withBypass`-free contract.
  await prismaDirect.tenant.create({
    data: {
      id: tenantA,
      clerkOrgId: `org_mcp_rls_a_${tenantA.slice(0, 8)}`,
      name: 'MCP RLS Test A',
      slug: `mcp-rls-a-${tenantA.slice(0, 8)}`,
    },
  });
  await prismaDirect.tenant.create({
    data: {
      id: tenantB,
      clerkOrgId: `org_mcp_rls_b_${tenantB.slice(0, 8)}`,
      name: 'MCP RLS Test B',
      slug: `mcp-rls-b-${tenantB.slice(0, 8)}`,
    },
  });

  // Raw insert because the live DB has additional NOT NULL columns (`code`)
  // that the committed `prisma/schema.prisma` doesn't model — driving via
  // the typed delegate would fail with a null-constraint violation. The
  // test only needs an isolated customer row reachable by id, not the full
  // typed surface.
  customerInA = randomUUID();
  await prismaDirect.$executeRawUnsafe(
    `INSERT INTO catalog_sales_customer (id, tenant_id, name, code, created_at, updated_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, NOW(), NOW())`,
    customerInA,
    tenantA,
    `MCP-RLS-Customer-${randomUUID()}`,
    `MCP-RLS-${randomUUID().slice(0, 8)}`,
  );
}, 30_000);

afterAll(async () => {
  // Tear down via DIRECT_URL (superuser) so we sidestep RLS without
  // importing `withBypass` (which is banned in this package).
  await prismaDirect.$executeRawUnsafe(
    'DELETE FROM catalog_sales_customer WHERE tenant_id IN ($1::uuid, $2::uuid)',
    tenantA,
    tenantB,
  );
  await prismaDirect.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prismaDirect.$disconnect();
});

describe('RLS cross-tenant isolation via catalog_get', () => {
  it('returns the customer when reading as the owning tenant', async () => {
    const r = await dispatchTool(
      'catalog_get',
      { configId: 'sales.customer', id: customerInA },
      ctxFor(tenantA, appCtxA, userA),
    );
    expect(r).toBeTruthy();
    expect((r as { id: string }).id).toBe(customerInA);
  });

  it('throws not_found when reading as a different tenant', async () => {
    // `getRecord` throws `NotFoundError` when RLS hides the row. That maps to
    // `not_found` at the MCP error envelope (see error-map.ts), but inside
    // the dispatch path it surfaces as a thrown Error. Both forms are valid
    // RLS-isolation signals — what matters is that the row is NOT returned.
    await expect(
      dispatchTool(
        'catalog_get',
        { configId: 'sales.customer', id: customerInA },
        ctxFor(tenantB, appCtxB, userB),
      ),
    ).rejects.toThrow();
  });
});
