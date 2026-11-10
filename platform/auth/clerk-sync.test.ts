import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getOrganizationInvitationListMock = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(() =>
    Promise.resolve({
      organizations: { getOrganizationInvitationList: getOrganizationInvitationListMock },
    }),
  ),
}));

import {
  handleOrganizationCreated,
  handleOrganizationDeleted,
  handleOrganizationMembershipCreated,
  handleOrganizationMembershipDeleted,
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
  syncMissingMembership,
} from './clerk-sync';

function emptyInvitationList() {
  return { data: [], totalCount: 0 };
}

beforeEach(() => {
  getOrganizationInvitationListMock.mockReset();
  // Default: no invitations. Individual tests override via mockResolvedValueOnce.
  getOrganizationInvitationListMock.mockResolvedValue(emptyInvitationList());
});

afterEach(async () => {
  await withBypass((tx) =>
    tx.membership.deleteMany({ where: { user: { email: { contains: '@test.ishflow' } } } }),
  );
  await prisma.user.deleteMany({ where: { email: { contains: '@test.ishflow' } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 't-test-' } } });
});

describe('clerk-sync', () => {
  it('creates a user on user.created', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: 'Ada',
      last_name: 'Lovelace',
      image_url: null,
    });
    const user = await prisma.user.findUnique({ where: { clerkId } });
    expect(user).toMatchObject({
      clerkId,
      email: `${clerkId}@test.ishflow`,
      firstName: 'Ada',
    });
  });

  it('updates a user on user.updated', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: 'Old',
      last_name: null,
      image_url: null,
    });
    await handleUserUpdated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: 'New',
      last_name: 'Name',
      image_url: 'https://img',
    });
    const user = await prisma.user.findUnique({ where: { clerkId } });
    expect(user).toMatchObject({ firstName: 'New', lastName: 'Name', imageUrl: 'https://img' });
  });

  it('creates a tenant on organization.created', async () => {
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    const tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
    expect(tenant).toMatchObject({ clerkOrgId: orgId, name: 'Acme', slug });
  });

  it('seeds 8 system roles on organization.created', async () => {
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { clerkOrgId: orgId } });
    const roles = await withBypass((tx) =>
      tx.role.findMany({ where: { tenantId: tenant.id, isSystem: true } }),
    );
    expect(roles.map((r) => r.name).sort()).toEqual([
      'admin',
      'bookkeeper',
      'buyer',
      'cashier',
      'chief_accountant',
      'owner',
      'sales',
      'viewer',
      'warehouse',
    ]);
  });

  it('creates a membership on organizationMembership.created', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: 'Grace',
      last_name: 'Hopper',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
      role: 'org:admin',
    });
    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    // First admin is auto-promoted to owner
    expect(membership.roles.map((r) => r.name)).toContain('owner');
  });

  it('first admin gets owner role (auto-promotion)', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: 'First',
      last_name: 'Owner',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
      role: 'org:admin',
    });
    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toContain('owner');
  });

  it('second admin stays admin (owner already exists)', async () => {
    const ownerId = `user_${randomUUID().replace(/-/g, '')}`;
    const adminId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;

    await handleUserCreated({
      id: ownerId,
      email_addresses: [{ email_address: `${ownerId}@test.ishflow` }],
      first_name: 'First',
      last_name: 'Owner',
      image_url: null,
    });
    await handleUserCreated({
      id: adminId,
      email_addresses: [{ email_address: `${adminId}@test.ishflow` }],
      first_name: 'Second',
      last_name: 'Admin',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    // First member becomes owner
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: ownerId },
      role: 'org:admin',
    });

    // Second member stays admin
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: adminId },
      role: 'org:admin',
    });

    const adminMembership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId: adminId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(adminMembership.roles.map((r) => r.name)).toContain('admin');
    expect(adminMembership.roles.map((r) => r.name)).not.toContain('owner');
  });

  it('viewer stays viewer regardless of owner count', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: 'View',
      last_name: 'Only',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
      role: 'org:member',
    });
    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['viewer']);
  });

  it('soft-deletes a tenant on organization.deleted', async () => {
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    await handleOrganizationDeleted({ id: orgId });
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { clerkOrgId: orgId } });
    expect(tenant.deletedAt).not.toBeNull();
  });

  it('deletes a user on user.deleted', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: null,
      last_name: null,
      image_url: null,
    });
    await handleUserDeleted({ id: clerkId });
    const user = await prisma.user.findUnique({ where: { clerkId } });
    expect(user).toBeNull();
  });

  it('syncMissingMembership creates a membership when none exists', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: null,
      last_name: null,
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    await syncMissingMembership({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
      role: 'org:member',
    });

    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['viewer']);
  });

  it('syncMissingMembership does NOT overwrite existing membership roles', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: null,
      last_name: null,
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    // Seed a membership with a custom (non-system) role — mimics a role
    // assigned via web /admin/members.
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { clerkOrgId: orgId } });
    const user = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
    const customRole = await withBypass((tx) =>
      tx.role.create({
        data: { tenantId: tenant.id, name: 'depocu', isSystem: false },
        select: { id: true, name: true },
      }),
    );
    await withBypass((tx) =>
      tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roles: { connect: { id: customRole.id } },
        },
      }),
    );

    // Simulate /me sync where Clerk reports the default org:member role.
    await syncMissingMembership({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
      role: 'org:member',
    });

    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    // Custom role MUST survive — sync must not have overwritten with viewer.
    expect(membership.roles.map((r) => r.name)).toEqual(['depocu']);
  });

  it('assigns role from invitation publicMetadata.systemRole (accepted)', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    const email = `${clerkId}@test.ishflow`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: email }],
      first_name: 'Inv',
      last_name: 'Cashier',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    getOrganizationInvitationListMock.mockResolvedValue({
      data: [
        {
          emailAddress: email,
          status: 'accepted',
          publicMetadata: { systemRole: 'cashier' },
        },
      ],
      totalCount: 1,
    });

    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId, identifier: email },
      role: 'org:member',
    });

    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['cashier']);
  });

  it('falls back to viewer when no matching invitation exists', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    const email = `${clerkId}@test.ishflow`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: email }],
      first_name: 'No',
      last_name: 'Invite',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    // beforeEach already sets mock to empty list; nothing more to set up.
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId, identifier: email },
      role: 'org:member',
    });

    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['viewer']);
  });

  it('retries invitation lookup once after 500ms before falling back', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    const email = `${clerkId}@test.ishflow`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: email }],
      first_name: 'Race',
      last_name: 'Window',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    // First call: nothing. Second call (after 500ms retry): match.
    getOrganizationInvitationListMock
      .mockResolvedValueOnce(emptyInvitationList())
      .mockResolvedValueOnce({
        data: [
          {
            emailAddress: email,
            status: 'accepted',
            publicMetadata: { systemRole: 'bookkeeper' },
          },
        ],
        totalCount: 1,
      });

    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId, identifier: email },
      role: 'org:member',
    });

    expect(getOrganizationInvitationListMock).toHaveBeenCalledTimes(2);
    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['bookkeeper']);
  });

  it('never auto-grants owner via invitation publicMetadata', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    const email = `${clerkId}@test.ishflow`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: email }],
      first_name: 'No',
      last_name: 'Owner',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    getOrganizationInvitationListMock.mockResolvedValue({
      data: [
        {
          emailAddress: email,
          status: 'accepted',
          publicMetadata: { systemRole: 'owner' },
        },
      ],
      totalCount: 1,
    });

    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId, identifier: email },
      role: 'org:member',
    });

    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['viewer']);
  });

  it('syncMissingMembership picks role from invitation publicMetadata', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    const email = `${clerkId}@test.ishflow`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: email }],
      first_name: 'Sync',
      last_name: 'Invited',
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });

    getOrganizationInvitationListMock.mockResolvedValue({
      data: [
        {
          emailAddress: email,
          status: 'accepted',
          publicMetadata: { systemRole: 'sales' },
        },
      ],
      totalCount: 1,
    });

    await syncMissingMembership({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId, identifier: email },
      role: 'org:member',
    });

    const membership = await withBypass((tx) =>
      tx.membership.findFirstOrThrow({
        where: { user: { clerkId }, tenant: { clerkOrgId: orgId } },
        include: { roles: true },
      }),
    );
    expect(membership.roles.map((r) => r.name)).toEqual(['sales']);
  });

  it('removes a membership on organizationMembership.deleted', async () => {
    const clerkId = `user_${randomUUID().replace(/-/g, '')}`;
    const orgId = `org_${randomUUID().replace(/-/g, '')}`;
    const slug = `t-test-${randomUUID().slice(0, 8)}`;
    await handleUserCreated({
      id: clerkId,
      email_addresses: [{ email_address: `${clerkId}@test.ishflow` }],
      first_name: null,
      last_name: null,
      image_url: null,
    });
    await handleOrganizationCreated({ id: orgId, name: 'Acme', slug });
    await handleOrganizationMembershipCreated({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
      role: 'org:admin',
    });
    await handleOrganizationMembershipDeleted({
      organization: { id: orgId },
      public_user_data: { user_id: clerkId },
    });
    const count = await withBypass((tx) =>
      tx.membership.count({ where: { user: { clerkId }, tenant: { clerkOrgId: orgId } } }),
    );
    expect(count).toBe(0);
  });
});
