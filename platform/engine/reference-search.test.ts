import { randomUUID } from 'node:crypto';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyReferenceFilters,
  registerReferenceFilter,
  resolveReference,
  searchReference,
} from './reference-search';

const tenantA = randomUUID();
const tenantB = randomUUID();
const ctxA = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantA } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;
const ctxB = {
  user: { id: randomUUID() } as never,
  tenant: { id: tenantB } as never,
  membership: { roles: ['admin'] } as never,
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map<string, unknown>(),
  addons: new Set(),
} as never;

let acmeId: string;

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantA,
        clerkOrgId: `org_${tenantA}`,
        name: 'Tenant A',
        slug: `ref-a-${tenantA.slice(0, 8)}`,
      },
    });
    await tx.tenant.create({
      data: {
        id: tenantB,
        clerkOrgId: `org_${tenantB}`,
        name: 'Tenant B',
        slug: `ref-b-${tenantB.slice(0, 8)}`,
      },
    });
    // Seed rows directly so the test is independent of createRecord/RLS path.
    const acme = await (
      tx as unknown as {
        catalog_sales_customer: {
          create: (args: unknown) => Promise<{ id: string }>;
        };
      }
    ).catalog_sales_customer.create({
      data: { tenantId: tenantA, name: 'Acme Corp' },
    });
    acmeId = acme.id;
    await (
      tx as unknown as {
        catalog_sales_customer: { create: (args: unknown) => Promise<unknown> };
      }
    ).catalog_sales_customer.create({
      data: { tenantId: tenantA, name: 'Beta Industries' },
    });
    await (
      tx as unknown as {
        catalog_sales_customer: { create: (args: unknown) => Promise<unknown> };
      }
    ).catalog_sales_customer.create({
      data: { tenantId: tenantB, name: 'Acme Corp (other tenant)' },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM catalog_sales_customer WHERE tenant_id IN ($1::uuid, $2::uuid)',
      tenantA,
      tenantB,
    );
    await tx.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  });
  await prisma.$disconnect();
});

describe('reference-search', () => {
  it('searchReference scopes results to the calling tenant', async () => {
    const results = await searchReference({
      ctx: ctxA,
      module: 'sales',
      name: 'customer',
      query: 'Acme',
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.label).toBe('Acme Corp');
  });

  it('searchReference returns top-N when query is empty', async () => {
    const results = await searchReference({
      ctx: ctxA,
      module: 'sales',
      name: 'customer',
      query: '',
      limit: 10,
    });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('searchReference is case-insensitive', async () => {
    const lower = await searchReference({
      ctx: ctxA,
      module: 'sales',
      name: 'customer',
      query: 'acme',
    });
    expect(lower.map((r) => r.label)).toContain('Acme Corp');
  });

  it('resolveReference fetches a single row label by id', async () => {
    const row = await resolveReference({
      ctx: ctxA,
      module: 'sales',
      name: 'customer',
      id: acmeId,
    });
    expect(row?.label).toBe('Acme Corp');
  });

  it('resolveReference returns null for cross-tenant id', async () => {
    const row = await resolveReference({
      ctx: ctxB,
      module: 'sales',
      name: 'customer',
      id: acmeId,
    });
    expect(row).toBeNull();
  });

  it('resolveReference returns null for a missing id', async () => {
    const row = await resolveReference({
      ctx: ctxA,
      module: 'sales',
      name: 'customer',
      id: '00000000-0000-0000-0000-000000000000',
    });
    expect(row).toBeNull();
  });
});

describe('reference filter registry', () => {
  it('drops unknown filter keys silently', async () => {
    const out = await applyReferenceFilters({}, 'nonexistent.catalog', { fake: 'x' });
    expect(out).toBeNull();
  });

  it('intersects multiple allowlists', async () => {
    registerReferenceFilter('test.cat1', 'f1', async () => ['a', 'b', 'c']);
    registerReferenceFilter('test.cat1', 'f2', async () => ['b', 'c', 'd']);
    const out = await applyReferenceFilters({}, 'test.cat1', { f1: '1', f2: '1' });
    expect(out?.sort()).toEqual(['b', 'c']);
  });

  it('short-circuits on empty intersection', async () => {
    registerReferenceFilter('test.cat2', 'g1', async () => ['a']);
    registerReferenceFilter('test.cat2', 'g2', async () => ['z']);
    const out = await applyReferenceFilters({}, 'test.cat2', { g1: '1', g2: '1' });
    expect(out).toEqual([]);
  });
});
