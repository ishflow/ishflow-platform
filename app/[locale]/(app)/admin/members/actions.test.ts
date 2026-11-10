import { describe, expect, it, vi } from 'vitest';

const mockRequireTenantContext = vi.hoisted(() => vi.fn());
const createOrganizationInvitation = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/current-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/platform/auth/current-context')>();
  return {
    ...actual,
    requireTenantContext: mockRequireTenantContext,
  };
});

// `enforcePlanLimit` would otherwise reach into billing config + the DB. The
// invite path only cares that it does not throw, so stub it to a no-op.
vi.mock('@/platform/billing/enforce', () => ({
  enforcePlanLimit: vi.fn(async () => undefined),
}));

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    organizations: {
      createOrganizationInvitation,
      revokeOrganizationInvitation: vi.fn(async () => undefined),
    },
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { inviteMemberAction } from './actions';

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const ctx = {
  tenant: { id: '11111111-1111-1111-1111-111111111111', clerkOrgId: 'org_test' },
  user: { clerkId: 'user_admin' },
  permissions: new Set(['admin.members:manage']),
};

describe('inviteMemberAction', () => {
  it('invites with a redirectUrl pointing at /invite/continue and the systemRole', async () => {
    mockRequireTenantContext.mockResolvedValue(ctx);
    createOrganizationInvitation.mockReset();
    createOrganizationInvitation.mockResolvedValue({ id: 'inv_1' });

    const res = await inviteMemberAction(formData({ email: 'w@co.test', systemRole: 'warehouse' }));

    expect(res).toEqual({ ok: true });
    expect(createOrganizationInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_test',
        emailAddress: 'w@co.test',
        role: 'org:member',
        publicMetadata: { systemRole: 'warehouse' },
        redirectUrl: expect.stringContaining('/invite/continue'),
      }),
    );
  });
});
