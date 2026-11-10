import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deleteUser = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    users: {
      deleteUser,
    },
  })),
}));

import { DeleteAccountError, buildTombstoneEmail, deleteUserAccount } from './delete-account';
import { seedSystemRoles } from './seed-system-roles';

const TEST_EMAIL_DOMAIN = '@test-delete.ishflow';
const TEST_SLUG_PREFIX = 't-delete-';

function makeClerkUserId(): string {
  return `user_${randomUUID().replace(/-/g, '')}`;
}

function makeOrgId(): string {
  return `org_${randomUUID().replace(/-/g, '')}`;
}

async function seedUser(): Promise<{ id: string; clerkId: string; email: string }> {
  const clerkId = makeClerkUserId();
  const email = `${clerkId}${TEST_EMAIL_DOMAIN}`;
  return prisma.user.create({
    data: {
      clerkId,
      email,
      firstName: 'Delete',
      lastName: 'Test',
      imageUrl: 'https://example.com/a.png',
    },
    select: { id: true, clerkId: true, email: true },
  });
}

interface SeedTenantOpts {
  ownerUserIds?: string[];
  nonOwnerUserIds?: string[];
}

async function seedTenant(opts: SeedTenantOpts = {}): Promise<{ tenantId: string }> {
  const slug = `${TEST_SLUG_PREFIX}${randomUUID().slice(0, 8)}`;
  return withBypass(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        clerkOrgId: makeOrgId(),
        name: slug,
        slug,
      },
    });
    await seedSystemRoles(tenant.id, tx);
    const ownerRole = await tx.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: 'owner' } },
      select: { id: true },
    });
    const viewerRole = await tx.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenant.id, name: 'viewer' } },
      select: { id: true },
    });
    for (const userId of opts.ownerUserIds ?? []) {
      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId,
          roles: { connect: [{ id: ownerRole.id }] },
        },
      });
    }
    for (const userId of opts.nonOwnerUserIds ?? []) {
      await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId,
          roles: { connect: [{ id: viewerRole.id }] },
        },
      });
    }
    return { tenantId: tenant.id };
  });
}

beforeEach(() => {
  deleteUser.mockReset();
  deleteUser.mockResolvedValue(undefined);
});

afterEach(async () => {
  await withBypass(async (tx) => {
    await tx.membership.deleteMany({
      where: {
        OR: [
          { user: { email: { contains: TEST_EMAIL_DOMAIN } } },
          { tenant: { slug: { startsWith: TEST_SLUG_PREFIX } } },
        ],
      },
    });
  });
  await prisma.user.deleteMany({
    where: {
      OR: [{ email: { contains: TEST_EMAIL_DOMAIN } }, { email: { endsWith: '@deleted.local' } }],
    },
  });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: TEST_SLUG_PREFIX } } });
});

describe('DeleteAccountError', () => {
  it('soleOwnerOfTenants carries tenantIds + code', () => {
    const ids = [randomUUID(), randomUUID()];
    const err = DeleteAccountError.soleOwnerOfTenants(ids);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('sole_owner_of_tenants');
    expect(err.tenantIds).toEqual(ids);
    expect(err.name).toBe('DeleteAccountError');
  });

  it('userNotFound has empty tenantIds', () => {
    const err = DeleteAccountError.userNotFound('u1');
    expect(err.code).toBe('user_not_found');
    expect(err.tenantIds).toEqual([]);
  });
});

describe('buildTombstoneEmail', () => {
  it('is deterministic and uniqueness-preserving', () => {
    const id = randomUUID();
    expect(buildTombstoneEmail(id)).toBe(`deleted-${id}@deleted.local`);
  });
});

describe('deleteUserAccount', () => {
  it('soft-deletes a user with no memberships and calls Clerk', async () => {
    const user = await seedUser();

    const result = await deleteUserAccount({ userId: user.id });

    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith(user.clerkId);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.deletedAt).not.toBeNull();
    expect(after.firstName).toBeNull();
    expect(after.lastName).toBeNull();
    expect(after.imageUrl).toBeNull();
    expect(after.email).toBe(buildTombstoneEmail(user.id));
    expect(after.clerkId).toBe(user.clerkId); // preserved for audit correlation
  });

  it('deletes memberships and soft-deletes when user holds a non-owner role', async () => {
    const user = await seedUser();
    const otherOwner = await seedUser();
    const { tenantId } = await seedTenant({
      ownerUserIds: [otherOwner.id],
      nonOwnerUserIds: [user.id],
    });

    await deleteUserAccount({ userId: user.id });

    const remainingMemberships = await withBypass((tx) =>
      tx.membership.count({ where: { userId: user.id } }),
    );
    expect(remainingMemberships).toBe(0);

    // Other owner's membership intact.
    const otherMemberships = await withBypass((tx) =>
      tx.membership.count({ where: { tenantId, userId: otherOwner.id } }),
    );
    expect(otherMemberships).toBe(1);
  });

  it('refuses when the user is the sole owner of a workspace', async () => {
    const user = await seedUser();
    const { tenantId } = await seedTenant({ ownerUserIds: [user.id] });

    await expect(deleteUserAccount({ userId: user.id })).rejects.toMatchObject({
      name: 'DeleteAccountError',
      code: 'sole_owner_of_tenants',
      tenantIds: [tenantId],
    });

    // User row must NOT have been mutated when the helper refuses.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.deletedAt).toBeNull();
    expect(after.firstName).not.toBeNull();

    // Clerk delete must NOT have been called.
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('allows delete when at least one other owner exists for every workspace', async () => {
    const user = await seedUser();
    const coOwner = await seedUser();
    const { tenantId } = await seedTenant({ ownerUserIds: [user.id, coOwner.id] });

    await deleteUserAccount({ userId: user.id });

    const otherOwnerships = await withBypass((tx) =>
      tx.membership.count({
        where: {
          tenantId,
          userId: coOwner.id,
          roles: { some: { name: 'owner' } },
        },
      }),
    );
    expect(otherOwnerships).toBe(1);

    const userMemberships = await withBypass((tx) =>
      tx.membership.count({ where: { userId: user.id } }),
    );
    expect(userMemberships).toBe(0);
  });

  it('swallows Clerk delete failure (operation still succeeds, DB row is the source of truth)', async () => {
    const user = await seedUser();
    deleteUser.mockRejectedValueOnce(new Error('Clerk 500'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await deleteUserAccount({ userId: user.id });
    expect(result.deletedAt).toBeInstanceOf(Date);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.deletedAt).not.toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('throws user_not_found when target row is absent', async () => {
    const phantom = randomUUID();
    await expect(deleteUserAccount({ userId: phantom })).rejects.toMatchObject({
      name: 'DeleteAccountError',
      code: 'user_not_found',
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('throws user_not_found when target row is already soft-deleted', async () => {
    const user = await seedUser();
    await deleteUserAccount({ userId: user.id });
    deleteUser.mockReset();
    deleteUser.mockResolvedValue(undefined);

    await expect(deleteUserAccount({ userId: user.id })).rejects.toMatchObject({
      code: 'user_not_found',
    });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('cross-tenant isolation: deleting User A leaves Tenant Y (User B) untouched', async () => {
    const userA = await seedUser();
    const userB = await seedUser();

    const { tenantId: tenantX } = await seedTenant({ ownerUserIds: [userA.id] });
    // Add a co-owner to tenant X so userA is NOT sole owner.
    const coOwner = await seedUser();
    await withBypass(async (tx) => {
      const ownerRole = await tx.role.findUniqueOrThrow({
        where: { tenantId_name: { tenantId: tenantX, name: 'owner' } },
        select: { id: true },
      });
      await tx.membership.create({
        data: {
          tenantId: tenantX,
          userId: coOwner.id,
          roles: { connect: [{ id: ownerRole.id }] },
        },
      });
    });

    const { tenantId: tenantY } = await seedTenant({ ownerUserIds: [userB.id] });

    const tenantYMembershipsBefore = await withBypass((tx) =>
      tx.membership.count({ where: { tenantId: tenantY } }),
    );
    const userBBefore = await prisma.user.findUniqueOrThrow({ where: { id: userB.id } });

    await deleteUserAccount({ userId: userA.id });

    const tenantYMembershipsAfter = await withBypass((tx) =>
      tx.membership.count({ where: { tenantId: tenantY } }),
    );
    const userBAfter = await prisma.user.findUniqueOrThrow({ where: { id: userB.id } });

    expect(tenantYMembershipsAfter).toBe(tenantYMembershipsBefore);
    expect(userBAfter.deletedAt).toBeNull();
    expect(userBAfter.email).toBe(userBBefore.email);
    expect(userBAfter.firstName).toBe(userBBefore.firstName);
  });
});
