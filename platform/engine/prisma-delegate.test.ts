import type { AppContext } from '@/platform/auth/current-context';
import type { CatalogConfig } from '@/platform/metadata';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: vi.fn(),
}));

import { withTenant } from '@/platform/db/tenant-context';
import { listRecords } from './crud';

const config: CatalogConfig = {
  id: 'sales.customer',
  module: 'sales',
  name: 'customer',
  label: { en: 'Customer' },
  fields: {},
  permissions: { read: 'any', write: 'none', delete: 'none' },
};

const ctx: AppContext = {
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    clerkId: 'clerk_u1',
    email: 'u@x.y',
    firstName: null,
    lastName: null,
    imageUrl: null,
    phone: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },
  tenant: {
    id: '00000000-0000-0000-0000-000000000001',
    clerkOrgId: 'org_test',
    name: 'TestCo',
    slug: 'testco',
    plan: 'free',
    status: 'trialing',
    currency: 'USD',
    defaultLocale: 'ru',
    defaultMarkupPct: new Prisma.Decimal('0.10'),
    mobileFeatures: null,
    notificationSettings: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    legalName: null,
    logoUrl: null,
    brandColor: null,
    archivedBy: null,
    trialEndsAt: null,
    demoImportedAt: null,
    onboardingState: null,
    lastActivityAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },
  membership: {
    id: '00000000-0000-0000-0000-000000000003',
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  permissions: new Set<string>(['*:*']),
  scopesByEntity: new Map(),
  addons: new Set(),
};

function makeDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([{ id: 'r1' }]),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

describe('prismaDelegate (via listRecords)', () => {
  beforeEach(() => {
    vi.mocked(withTenant).mockReset();
  });

  it('resolves snake_case key first', async () => {
    const snakeDelegate = makeDelegate();
    const camelDelegate = makeDelegate();
    vi.mocked(withTenant).mockImplementation(async (_tenantId, fn) =>
      fn({ catalog_sales_customer: snakeDelegate, catalogSalesCustomer: camelDelegate } as never),
    );

    const rows = await listRecords(ctx, config);

    expect(rows).toEqual([{ id: 'r1' }]);
    expect(snakeDelegate.findMany).toHaveBeenCalledOnce();
    expect(camelDelegate.findMany).not.toHaveBeenCalled();
  });

  it('falls back to camelCase when snake_case is missing', async () => {
    const camelDelegate = makeDelegate();
    vi.mocked(withTenant).mockImplementation(async (_tenantId, fn) =>
      fn({ catalogSalesCustomer: camelDelegate } as never),
    );

    const rows = await listRecords(ctx, config);

    expect(rows).toEqual([{ id: 'r1' }]);
    expect(camelDelegate.findMany).toHaveBeenCalledOnce();
  });

  it('throws informative error listing available catalog keys when neither is present', async () => {
    vi.mocked(withTenant).mockImplementation(async (_tenantId, fn) =>
      fn({ catalog_other_thing: makeDelegate(), user: makeDelegate() } as never),
    );

    await expect(listRecords(ctx, config)).rejects.toThrow(
      /catalog_sales_customer.*catalogSalesCustomer.*catalog_other_thing/s,
    );
  });
});
