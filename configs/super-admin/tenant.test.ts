import { describe, expect, it, vi } from 'vitest';

// Side-effect import: registers super_admin.tenant in the metadata registry.
// Done at module load (not in beforeEach) so the registry singleton survives
// across tests in this file. Resetting the registry between tests would
// require re-importing the config module, which `vi.resetModules` fragments
// because vitest spawns a fresh registry singleton on each module reload.
import './tenant';
import { getRegistry } from '@/platform/metadata/registry';

function getCfg() {
  const cfg = getRegistry().superAdminCatalog['super_admin.tenant'];
  if (!cfg) throw new Error('super_admin.tenant not registered');
  return cfg;
}

describe('configs/super-admin/tenant', () => {
  it('registers super_admin.tenant with required permission, fields, and chips', () => {
    const cfg = getCfg();
    expect(cfg).toBeDefined();
    expect(cfg?.requiredPermission).toBe('super_admin.tenant:read');
    expect(cfg?.crossTenant).toBe(true);
    expect(cfg?.list?.listOnly).toBe(true);
    expect(cfg?.list?.searchable).toBe(true);
    expect(cfg?.list?.layout).toBe('table');
    expect(cfg?.list?.chips?.map((c) => c.key)).toEqual([
      'all',
      'business',
      'pro',
      'free',
      'trial',
      'suspended',
    ]);
    const colKeys = cfg?.list?.columns?.map((c) => c.key) ?? [];
    expect(colKeys).toContain('name');
    expect(colKeys).toContain('plan');
    expect(colKeys).toContain('members');
    expect(colKeys).toContain('invoices');
    expect(cfg?.fields.name).toBeDefined();
    expect(cfg?.fields.plan).toBeDefined();
  });

  it('loader returns paged rows with members count and invoice count', async () => {
    const cfg = getCfg();
    expect(cfg.loader).toBeDefined();

    const tx = {
      tenant: {
        findMany: vi.fn(async (_args: unknown) => [
          {
            id: 't1',
            name: 'Acme',
            slug: 'acme',
            plan: 'business',
            status: 'active',
            defaultLocale: 'tr',
            lastActivityAt: new Date('2026-05-22'),
            _count: { memberships: 5 },
          },
          {
            id: 't2',
            name: 'Beta',
            slug: 'beta',
            plan: 'free',
            status: 'trialing',
            defaultLocale: 'ru',
            lastActivityAt: null,
            _count: { memberships: 1 },
          },
        ]),
        count: vi.fn(async (_args: unknown) => 2),
      },
      document_sales_invoice: {
        groupBy: vi.fn(async (_args: unknown) => [{ tenantId: 't1', _count: { _all: 42 } }]),
      },
    };

    const result = await cfg.loader({ tx, page: 1, pageSize: 25 });
    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      id: 't1',
      name: 'Acme',
      plan: 'business',
      mrrUsd: 199,
      members: 5,
      invoices: 42,
    });
    expect(result.rows[1]).toMatchObject({
      id: 't2',
      plan: 'free',
      mrrUsd: 0,
      members: 1,
      invoices: 0,
    });
  });

  it('loader passes search filter to findMany via OR clause on name/slug', async () => {
    const cfg = getCfg();
    const findManySpy = vi.fn(async (_args: unknown) => [] as unknown[]);
    const tx = {
      tenant: { findMany: findManySpy, count: vi.fn(async (_args: unknown) => 0) },
      document_sales_invoice: { groupBy: vi.fn(async (_args: unknown) => []) },
    };
    await cfg.loader({ tx, search: 'acme', page: 1, pageSize: 25 });
    expect(findManySpy).toHaveBeenCalledTimes(1);
    const args = findManySpy.mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    const where = args.where;
    expect(where.OR).toEqual([
      { name: { contains: 'acme', mode: 'insensitive' } },
      { slug: { contains: 'acme', mode: 'insensitive' } },
    ]);
  });

  it('loader passes chip=suspended as status filter', async () => {
    const cfg = getCfg();
    const findManySpy = vi.fn(async (_args: unknown) => [] as unknown[]);
    const tx = {
      tenant: { findMany: findManySpy, count: vi.fn(async (_args: unknown) => 0) },
      document_sales_invoice: { groupBy: vi.fn(async (_args: unknown) => []) },
    };
    await cfg.loader({ tx, chip: 'suspended', page: 1, pageSize: 25 });
    const args = findManySpy.mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    const where = args.where;
    expect(where.status).toBe('suspended');
  });

  it('loader passes chip=business as plan filter', async () => {
    const cfg = getCfg();
    const findManySpy = vi.fn(async (_args: unknown) => [] as unknown[]);
    const tx = {
      tenant: { findMany: findManySpy, count: vi.fn(async (_args: unknown) => 0) },
      document_sales_invoice: { groupBy: vi.fn(async (_args: unknown) => []) },
    };
    await cfg.loader({ tx, chip: 'business', page: 1, pageSize: 25 });
    const args = findManySpy.mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    const where = args.where;
    expect(where.plan).toBe('business');
  });

  // Regression: chip=trial maps to status='trialing' (the DB enum value),
  // NOT plan='trial' which Prisma rejects as not in TenantPlan.
  it('loader maps chip=trial to status=trialing (not plan=trial)', async () => {
    const cfg = getCfg();
    const findManySpy = vi.fn(async (_args: unknown) => [] as unknown[]);
    const tx = {
      tenant: { findMany: findManySpy, count: vi.fn(async (_args: unknown) => 0) },
      document_sales_invoice: { groupBy: vi.fn(async (_args: unknown) => []) },
    };
    await cfg.loader({ tx, chip: 'trial', page: 1, pageSize: 25 });
    const args = findManySpy.mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    const where = args.where;
    expect(where.status).toBe('trialing');
    expect(where.plan).toBeUndefined();
  });

  // Regression: unknown chip keys are silently ignored — the loader stays
  // robust against stale URLs (e.g. after a chip is renamed or removed).
  it('loader ignores unknown chip values', async () => {
    const cfg = getCfg();
    const findManySpy = vi.fn(async (_args: unknown) => [] as unknown[]);
    const tx = {
      tenant: { findMany: findManySpy, count: vi.fn(async (_args: unknown) => 0) },
      document_sales_invoice: { groupBy: vi.fn(async (_args: unknown) => []) },
    };
    await cfg.loader({ tx, chip: 'banana', page: 1, pageSize: 25 });
    const args = findManySpy.mock.calls[0]?.[0] as unknown as { where: Record<string, unknown> };
    const where = args.where;
    expect(where.plan).toBeUndefined();
    expect(where.status).toBeUndefined();
  });
});
