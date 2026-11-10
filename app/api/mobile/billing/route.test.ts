import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveContext = vi.hoisted(() => vi.fn());
const mockGetUsage = vi.hoisted(() => vi.fn());
const mockEffectiveLimits = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    resolveContext: mockResolveContext,
  };
});

vi.mock('@/platform/billing/usage', () => ({
  getUsage: mockGetUsage,
}));

vi.mock('@/platform/billing/effective-limits', () => ({
  effectiveLimits: mockEffectiveLimits,
}));

import { GET } from './route';

const TEST_EMAIL_DOMAIN = '@test-billing.ishflow';
const TEST_SLUG_PREFIX = 't-billing-';

function makeClerkUserId(): string {
  return `user_${randomUUID().replace(/-/g, '')}`;
}

function makeOrgId(): string {
  return `org_${randomUUID().replace(/-/g, '')}`;
}

async function seedUser(): Promise<{ id: string; clerkId: string }> {
  const clerkId = makeClerkUserId();
  return prisma.user.create({
    data: {
      clerkId,
      email: `${clerkId}${TEST_EMAIL_DOMAIN}`,
      firstName: 'Billing',
      lastName: 'Route',
    },
    select: { id: true, clerkId: true },
  });
}

async function seedTenant(): Promise<{ id: string }> {
  return withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: makeOrgId(),
        name: 'Billing Fixture',
        slug: `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 12)}`,
        plan: 'pro',
        status: 'active',
        currency: 'EUR',
        trialEndsAt: new Date('2026-12-31T00:00:00.000Z'),
        stripeCustomerId: `cus_${randomUUID().replace(/-/g, '')}`,
        stripeSubscriptionId: `sub_${randomUUID().replace(/-/g, '')}`,
      },
      select: { id: true },
    }),
  );
}

beforeEach(() => {
  mockResolveContext.mockReset();
  mockGetUsage.mockReset();
  mockEffectiveLimits.mockReset();
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.membership.deleteMany({ where: { user: { email: { contains: TEST_EMAIL_DOMAIN } } } }),
  );
  await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
});

describe('GET /api/mobile/billing', () => {
  it('returns 401 when no auth context', async () => {
    mockResolveContext.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
    expect(mockGetUsage).not.toHaveBeenCalled();
    expect(mockEffectiveLimits).not.toHaveBeenCalled();
  });

  it('returns 403 when ctx has no tenant', async () => {
    const user = await seedUser();
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: user.clerkId },
      tenant: null,
      membership: null,
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    });

    const res = await GET();

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('no_tenant');
    expect(mockGetUsage).not.toHaveBeenCalled();
    expect(mockEffectiveLimits).not.toHaveBeenCalled();
  });

  it('returns 200 with full billing snapshot on happy path', async () => {
    const user = await seedUser();
    const tenant = await seedTenant();
    mockResolveContext.mockResolvedValue({
      user: { id: user.id, clerkId: user.clerkId },
      tenant: { id: tenant.id },
      membership: { id: randomUUID(), roles: [{ name: 'owner' }] },
      permissions: new Set<string>(),
      scopesByEntity: new Map(),
    });
    mockGetUsage.mockResolvedValue({
      members: 3,
      monthlyPostedDocs: 42,
      storageBytes: 1234,
      savedViews: 5,
    });
    mockEffectiveLimits.mockResolvedValue({
      members: 15,
      monthlyPostedDocs: 5000,
      storageBytes: 25 * 1024 ** 3,
      savedViews: Number.MAX_SAFE_INTEGER,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.plan).toBe('pro');
    expect(body.status).toBe('active');
    expect(body.currency).toBe('EUR');
    expect(body.trialEndsAt).toBe('2026-12-31T00:00:00.000Z');
    expect(typeof body.stripeCustomerId).toBe('string');
    expect(typeof body.stripeSubscriptionId).toBe('string');
    expect(body.usage).toEqual({
      members: 3,
      monthlyPostedDocs: 42,
      storageBytes: 1234,
      savedViews: 5,
    });
    expect(body.limits.members).toBe(15);
    expect(body.limits.monthlyPostedDocs).toBe(5000);

    expect(mockGetUsage).toHaveBeenCalledWith(tenant.id);
    expect(mockEffectiveLimits).toHaveBeenCalledWith({
      id: tenant.id,
      plan: 'pro',
      status: 'active',
      trialEndsAt: new Date('2026-12-31T00:00:00.000Z'),
    });
  });
});
