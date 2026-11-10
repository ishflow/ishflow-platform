import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Finding A4 (defense-in-depth): assignRole/removeRole run under withTenant (so
 * RLS already blocks a cross-tenant roleId), but they did not re-validate
 * role.tenantId the way setMemberRoleAction does. This test injects a
 * cross-tenant role (simulating an RLS misconfig) and asserts the action
 * refuses it before mutating the membership.
 */
const mockRequireTenantContext = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: mockRequireTenantContext,
}));

const findRole = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: (_tenantId: string, fn: (tx: unknown) => unknown) =>
    fn({ role: { findUniqueOrThrow: findRole }, membership: { update: updateMock } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { assignRoleAction, removeRoleAction } from './actions';

const ctx = {
  tenant: { id: '11111111-1111-1111-1111-111111111111' },
  permissions: new Set(['admin.members:manage']),
};

describe('assign/removeRoleAction tenant guard (A4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireTenantContext.mockResolvedValue(ctx);
    findRole.mockResolvedValue({
      id: 'r1',
      tenantId: '22222222-2222-2222-2222-222222222222',
      isSystem: false,
      name: 'sales',
    });
  });

  it('assignRoleAction refuses a role from another tenant', async () => {
    await expect(assignRoleAction('m1', 'r1')).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('removeRoleAction refuses a role from another tenant', async () => {
    await expect(removeRoleAction('m1', 'r1')).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
