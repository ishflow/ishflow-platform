import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createOrganization = vi.hoisted(() => vi.fn());
const deleteOrganization = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    organizations: {
      createOrganization,
      deleteOrganization,
    },
  })),
}));

import { OnboardingError, buildSlug, createTenantForUser } from './create-tenant';

const TEST_EMAIL_DOMAIN = '@test-create.ishflow';
const TEST_SLUG_PREFIX = 't-create-';

function makeOrgId(): string {
  return `org_${randomUUID().replace(/-/g, '')}`;
}

function makeClerkUserId(): string {
  return `user_${randomUUID().replace(/-/g, '')}`;
}

function makeWorkspaceName(): string {
  return `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 8)}`;
}

async function seedUser(clerkId: string): Promise<{ id: string; clerkId: string }> {
  return prisma.user.create({
    data: {
      clerkId,
      email: `${clerkId}${TEST_EMAIL_DOMAIN}`,
      firstName: 'Onboard',
      lastName: 'Test',
    },
    select: { id: true, clerkId: true },
  });
}

beforeEach(() => {
  createOrganization.mockReset();
  deleteOrganization.mockReset();
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.membership.deleteMany({ where: { user: { email: { contains: TEST_EMAIL_DOMAIN } } } }),
  );
  await prisma.user.deleteMany({ where: { email: { contains: TEST_EMAIL_DOMAIN } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
});

describe('buildSlug', () => {
  it('lowercases + kebab-cases + strips edges', () => {
    expect(buildSlug('  Acme Corp!! ')).toBe('acme-corp');
  });

  it('falls back to "workspace" when name has no slug-able chars', () => {
    expect(buildSlug('!!!')).toBe('workspace');
  });

  it('caps at 60 chars', () => {
    expect(buildSlug('a'.repeat(120)).length).toBe(60);
  });
});

describe('createTenantForUser', () => {
  it('creates a Clerk org, tenant, system roles and owner membership', async () => {
    const clerkUserId = makeClerkUserId();
    const user = await seedUser(clerkUserId);
    const orgId = makeOrgId();
    createOrganization.mockResolvedValue({ id: orgId });

    const name = makeWorkspaceName();
    const { tenant, ownerMembership } = await createTenantForUser({
      userId: user.id,
      name,
      currency: 'USD',
      locale: 'en',
    });

    expect(createOrganization).toHaveBeenCalledWith({
      name,
      slug: buildSlug(name),
      createdBy: clerkUserId,
    });
    expect(deleteOrganization).not.toHaveBeenCalled();
    expect(tenant).toMatchObject({
      clerkOrgId: orgId,
      name,
      slug: buildSlug(name),
      currency: 'USD',
      defaultLocale: 'en',
      plan: 'free',
      status: 'trialing',
    });
    expect(tenant.trialEndsAt).toBeInstanceOf(Date);
    expect(ownerMembership.tenantId).toBe(tenant.id);
    expect(ownerMembership.userId).toBe(user.id);

    const roleNames = await withBypass(async (tx) => {
      const rows = await tx.role.findMany({
        where: { tenantId: tenant.id, isSystem: true },
        select: { name: true },
      });
      return rows.map((r) => r.name).sort();
    });
    expect(roleNames).toContain('owner');

    const membershipRoles = await withBypass((tx) =>
      tx.membership.findUniqueOrThrow({
        where: { id: ownerMembership.id },
        include: { roles: { select: { name: true } } },
      }),
    );
    expect(membershipRoles.roles.map((r) => r.name)).toEqual(['owner']);
  });

  it('throws OnboardingError.alreadyOnboarded when user already has a membership', async () => {
    const clerkUserId = makeClerkUserId();
    const user = await seedUser(clerkUserId);
    const orgId = makeOrgId();
    createOrganization.mockResolvedValue({ id: orgId });

    await createTenantForUser({
      userId: user.id,
      name: makeWorkspaceName(),
      currency: 'USD',
      locale: 'en',
    });

    createOrganization.mockReset();
    createOrganization.mockResolvedValue({ id: makeOrgId() });

    await expect(
      createTenantForUser({
        userId: user.id,
        name: makeWorkspaceName(),
        currency: 'USD',
        locale: 'en',
      }),
    ).rejects.toMatchObject({
      name: 'OnboardingError',
      code: 'already_onboarded',
    });
    expect(createOrganization).not.toHaveBeenCalled();
  });

  it('retries with -<suffix> slug on P2002 unique-violation', async () => {
    const collidingName = `${TEST_SLUG_PREFIX}collide-${randomUUID().slice(0, 6)}`;
    const baseSlug = buildSlug(collidingName);

    // Pre-create a tenant that owns the deterministic slug — first Clerk
    // org call returns an id but the DB insert will fail with P2002.
    await prisma.tenant.create({
      data: {
        clerkOrgId: makeOrgId(),
        name: 'prior-owner',
        slug: baseSlug,
      },
    });

    const clerkUserId = makeClerkUserId();
    const user = await seedUser(clerkUserId);

    const firstOrgId = makeOrgId();
    const secondOrgId = makeOrgId();
    createOrganization
      .mockResolvedValueOnce({ id: firstOrgId })
      .mockResolvedValueOnce({ id: secondOrgId });

    const { tenant } = await createTenantForUser({
      userId: user.id,
      name: collidingName,
      currency: 'EUR',
      locale: 'en',
    });

    expect(tenant.clerkOrgId).toBe(secondOrgId);
    expect(tenant.slug).not.toBe(baseSlug);
    expect(tenant.slug).toMatch(/-[0-9a-f]{6}$/);
    expect(createOrganization).toHaveBeenCalledTimes(2);
    // First Clerk org was compensated after DB failure.
    expect(deleteOrganization).toHaveBeenCalledWith(firstOrgId);
  });

  it('compensates the Clerk org when the DB write inside the tx fails', async () => {
    // Pre-existing tenant owns this clerkOrgId, so the inner tx.tenant.create
    // will fail with a non-slug P2002 (the clerkOrgId unique). The helper must
    // delete the orphan Clerk org and rethrow without retrying.
    const collidingOrgId = makeOrgId();
    await prisma.tenant.create({
      data: {
        clerkOrgId: collidingOrgId,
        name: 'prior',
        slug: `${TEST_SLUG_PREFIX}prior-${randomUUID().slice(0, 6)}`,
      },
    });

    const clerkUserId = makeClerkUserId();
    const user = await seedUser(clerkUserId);
    createOrganization.mockResolvedValue({ id: collidingOrgId });

    await expect(
      createTenantForUser({
        userId: user.id,
        name: makeWorkspaceName(),
        currency: 'USD',
        locale: 'en',
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(deleteOrganization).toHaveBeenCalledWith(collidingOrgId);

    const tenantsForOrg = await prisma.tenant.findMany({ where: { clerkOrgId: collidingOrgId } });
    expect(tenantsForOrg).toHaveLength(1);
    expect(tenantsForOrg[0]?.name).toBe('prior');
  });

  it('exports OnboardingError with code-based static helper', () => {
    const err = OnboardingError.alreadyOnboarded('u1');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('already_onboarded');
    expect(err.name).toBe('OnboardingError');
  });
});
