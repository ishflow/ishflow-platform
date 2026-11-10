import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAssertSuperAdmin = vi.hoisted(() => vi.fn());
const mockChangeTenantPlan = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockHeaders = vi.hoisted(() => vi.fn());
const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/auth/assert-super-admin', () => ({
  assertSuperAdmin: mockAssertSuperAdmin,
}));
vi.mock('@/platform/super-admin/manual-plan-change', () => ({
  changeTenantPlan: mockChangeTenantPlan,
}));
vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));
vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import { createPlanLimitOverride, deletePlanLimitOverride, manualPlanChange } from './actions';

const TENANT_ID = '00000000-0000-0000-0000-00000000000a';

function makeForm(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe('manualPlanChange', () => {
  beforeEach(() => {
    mockAssertSuperAdmin.mockReset();
    mockChangeTenantPlan.mockReset();
    mockRevalidatePath.mockReset();
    mockHeaders.mockReset();

    mockAssertSuperAdmin.mockResolvedValue({ user: { clerkId: 'cu_admin', id: 'u1' } });
    mockHeaders.mockResolvedValue({
      get: (name: string) =>
        name === 'x-forwarded-for' ? '8.8.8.8' : name === 'user-agent' ? 'Mozilla/Test' : null,
    });
    mockChangeTenantPlan.mockResolvedValue(undefined);
  });

  it('calls assertSuperAdmin before changeTenantPlan, then revalidates', async () => {
    const order: string[] = [];
    mockAssertSuperAdmin.mockImplementation(async () => {
      order.push('assert');
      return { user: { clerkId: 'cu_admin', id: 'u1' } };
    });
    mockChangeTenantPlan.mockImplementation(async () => {
      order.push('change');
    });
    mockRevalidatePath.mockImplementation(() => {
      order.push('revalidate');
    });

    await manualPlanChange(
      makeForm({
        tenantId: TENANT_ID,
        plan: 'pro',
        status: 'active',
        reason: 'manual upgrade',
      }),
    );

    expect(order).toEqual(['assert', 'change', 'revalidate']);
  });

  it('extracts fields from FormData and forwards them to changeTenantPlan', async () => {
    await manualPlanChange(
      makeForm({
        tenantId: TENANT_ID,
        plan: 'business',
        status: 'active',
        reason: 'wire transfer confirmed',
      }),
    );

    expect(mockChangeTenantPlan).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      plan: 'business',
      status: 'active',
      reason: 'wire transfer confirmed',
      actorClerkId: 'cu_admin',
      actorIp: '8.8.8.8',
      actorUserAgent: 'Mozilla/Test',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/super-admin/tenants/${TENANT_ID}/subscription`,
    );
  });

  it('truncates reason to 1000 chars', async () => {
    const long = 'x'.repeat(2000);
    await manualPlanChange(
      makeForm({
        tenantId: TENANT_ID,
        plan: 'starter',
        status: 'trialing',
        reason: long,
      }),
    );
    const call = mockChangeTenantPlan.mock.calls[0]?.[0] as { reason: string };
    expect(call.reason.length).toBe(1000);
  });

  it('throws when plan invalid', async () => {
    await expect(
      manualPlanChange(
        makeForm({
          tenantId: TENANT_ID,
          plan: 'godmode',
          status: 'active',
          reason: 'r',
        }),
      ),
    ).rejects.toThrow('invalid form');
    expect(mockChangeTenantPlan).not.toHaveBeenCalled();
  });

  it('throws when status invalid', async () => {
    await expect(
      manualPlanChange(
        makeForm({
          tenantId: TENANT_ID,
          plan: 'pro',
          status: 'paused',
          reason: 'r',
        }),
      ),
    ).rejects.toThrow('invalid form');
  });

  it('throws when tenantId missing', async () => {
    await expect(
      manualPlanChange(
        makeForm({
          tenantId: '',
          plan: 'pro',
          status: 'active',
          reason: 'r',
        }),
      ),
    ).rejects.toThrow('invalid form');
  });

  it('throws when assertSuperAdmin throws (guard runs first)', async () => {
    mockAssertSuperAdmin.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(
      manualPlanChange(
        makeForm({
          tenantId: TENANT_ID,
          plan: 'pro',
          status: 'active',
          reason: 'r',
        }),
      ),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockChangeTenantPlan).not.toHaveBeenCalled();
  });
});

describe('createPlanLimitOverride', () => {
  beforeEach(() => {
    mockAssertSuperAdmin.mockReset();
    mockWithBypass.mockReset();
    mockRevalidatePath.mockReset();
    mockHeaders.mockReset();
    mockAssertSuperAdmin.mockResolvedValue({ user: { clerkId: 'cu_admin', id: 'u1' } });
    mockHeaders.mockResolvedValue({
      get: (name: string) =>
        name === 'x-forwarded-for' ? '8.8.8.8' : name === 'user-agent' ? 'Mozilla/Test' : null,
    });
  });

  it('upserts override, writes an audit row, and revalidates', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const findUnique = vi.fn().mockResolvedValue(null);
    const auditCreate = vi.fn().mockResolvedValue(undefined);
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({ planLimitOverride: { upsert, findUnique }, platformAuditLog: { create: auditCreate } }),
    );

    await createPlanLimitOverride(
      makeForm({
        tenantId: TENANT_ID,
        key: 'maxUsers',
        value: '25',
        expiresAt: '',
      }),
    );

    expect(upsert).toHaveBeenCalledWith({
      where: { tenantId_key: { tenantId: TENANT_ID, key: 'maxUsers' } },
      create: { tenantId: TENANT_ID, key: 'maxUsers', value: 25, expiresAt: null, createdBy: 'u1' },
      update: { value: 25, expiresAt: null },
    });
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0]?.[0]?.data).toMatchObject({
      actorClerkId: 'cu_admin',
      action: 'plan_limit_override.set',
      tenantId: TENANT_ID,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/super-admin/tenants/${TENANT_ID}/subscription`,
    );
  });

  it('throws on bad value', async () => {
    await expect(
      createPlanLimitOverride(
        makeForm({
          tenantId: TENANT_ID,
          key: 'maxUsers',
          value: 'banana',
          expiresAt: '',
        }),
      ),
    ).rejects.toThrow('invalid form');
  });

  it('throws when guard fails', async () => {
    mockAssertSuperAdmin.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(
      createPlanLimitOverride(
        makeForm({ tenantId: TENANT_ID, key: 'k', value: '1', expiresAt: '' }),
      ),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('deletePlanLimitOverride', () => {
  beforeEach(() => {
    mockAssertSuperAdmin.mockReset();
    mockWithBypass.mockReset();
    mockRevalidatePath.mockReset();
    mockHeaders.mockReset();
    mockAssertSuperAdmin.mockResolvedValue({ user: { clerkId: 'cu_admin', id: 'u1' } });
    mockHeaders.mockResolvedValue({
      get: (name: string) =>
        name === 'x-forwarded-for' ? '8.8.8.8' : name === 'user-agent' ? 'Mozilla/Test' : null,
    });
  });

  it('deletes scoped to tenantId + id, audits, and revalidates', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue({ key: 'maxUsers', value: 25, expiresAt: null });
    const auditCreate = vi.fn().mockResolvedValue(undefined);
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        planLimitOverride: { deleteMany, findFirst },
        platformAuditLog: { create: auditCreate },
      }),
    );

    await deletePlanLimitOverride(makeForm({ tenantId: TENANT_ID, id: 'override-1' }));

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'override-1', tenantId: TENANT_ID },
    });
    expect(auditCreate.mock.calls[0]?.[0]?.data).toMatchObject({
      action: 'plan_limit_override.removed',
      tenantId: TENANT_ID,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/super-admin/tenants/${TENANT_ID}/subscription`,
    );
  });

  it('skips the audit row when nothing was deleted', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn().mockResolvedValue(null);
    const auditCreate = vi.fn().mockResolvedValue(undefined);
    mockWithBypass.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        planLimitOverride: { deleteMany, findFirst },
        platformAuditLog: { create: auditCreate },
      }),
    );

    await deletePlanLimitOverride(makeForm({ tenantId: TENANT_ID, id: 'missing' }));

    expect(auditCreate).not.toHaveBeenCalled();
  });
});
