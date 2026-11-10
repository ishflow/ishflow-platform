import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWithBypass = vi.hoisted(() => vi.fn());

vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: mockWithBypass,
}));

import { TenantNotFoundError, changeTenantPlan } from './manual-plan-change';

interface MockTx {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  billingEvent: { create: ReturnType<typeof vi.fn> };
  platformAuditLog: { create: ReturnType<typeof vi.fn> };
  upgradeRequest: { update: ReturnType<typeof vi.fn> };
}

function makeTx(findResult: unknown): MockTx {
  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue(findResult),
      update: vi.fn().mockResolvedValue(undefined),
    },
    billingEvent: { create: vi.fn().mockResolvedValue(undefined) },
    platformAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
    upgradeRequest: { update: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('changeTenantPlan', () => {
  beforeEach(() => {
    mockWithBypass.mockReset();
  });

  it('updates tenant + writes billingEvent + writes platformAuditLog inside withBypass', async () => {
    const tx = makeTx({ id: 't1', plan: 'free', status: 'trialing' });
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => unknown) => fn(tx));

    await changeTenantPlan({
      tenantId: 't1',
      plan: 'pro',
      status: 'active',
      reason: 'bank transfer received',
      actorClerkId: 'cu_admin',
      actorIp: '1.2.3.4',
      actorUserAgent: 'Mozilla/5.0',
    });

    expect(mockWithBypass).toHaveBeenCalledOnce();
    expect(tx.tenant.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(tx.tenant.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { plan: 'pro', status: 'active' },
    });

    expect(tx.billingEvent.create).toHaveBeenCalledOnce();
    const beCall = tx.billingEvent.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(beCall.data.tenantId).toBe('t1');
    expect(beCall.data.type).toBe('manual.plan.changed');
    expect(beCall.data.stripeEventId as string).toMatch(/^manual_/);
    expect(beCall.data.payload).toMatchObject({
      reason: 'bank transfer received',
      actorClerkId: 'cu_admin',
      before: { plan: 'free', status: 'trialing' },
      after: { plan: 'pro', status: 'active' },
    });
    expect(beCall.data.processedAt).toBeInstanceOf(Date);

    expect(tx.platformAuditLog.create).toHaveBeenCalledOnce();
    const auditCall = tx.platformAuditLog.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(auditCall.data).toMatchObject({
      actorClerkId: 'cu_admin',
      action: 'plan.changed',
      tenantId: 't1',
      before: { plan: 'free', status: 'trialing' },
      after: { plan: 'pro', status: 'active' },
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('persists null ip/userAgent when none supplied', async () => {
    const tx = makeTx({ id: 't1', plan: 'starter', status: 'active' });
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => unknown) => fn(tx));

    await changeTenantPlan({
      tenantId: 't1',
      plan: 'business',
      status: 'active',
      reason: 'upgrade',
      actorClerkId: 'cu_admin',
    });

    const auditCall = tx.platformAuditLog.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(auditCall.data.ip).toBeNull();
    expect(auditCall.data.userAgent).toBeNull();
  });

  it('throws TenantNotFoundError when tenant missing', async () => {
    const tx = makeTx(null);
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => unknown) => fn(tx));

    await expect(
      changeTenantPlan({
        tenantId: 'missing',
        plan: 'pro',
        status: 'active',
        reason: 'r',
        actorClerkId: 'cu',
      }),
    ).rejects.toBeInstanceOf(TenantNotFoundError);

    expect(tx.tenant.update).not.toHaveBeenCalled();
    expect(tx.billingEvent.create).not.toHaveBeenCalled();
    expect(tx.platformAuditLog.create).not.toHaveBeenCalled();
  });

  it('includes payment in billingEvent payload and flips the linked upgrade request to approved', async () => {
    const tx = makeTx({ id: 't9', plan: 'free', status: 'active' });
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => unknown) => fn(tx));

    await changeTenantPlan({
      tenantId: 't9',
      plan: 'pro',
      status: 'active',
      reason: 'bank transfer',
      actorClerkId: 'cu_op',
      payment: { method: 'bank_transfer', amount: 49, currency: 'USD', reference: 'TX-7' },
      upgradeRequestId: 'req-1',
    });

    const beCall = tx.billingEvent.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(beCall.data.payload).toMatchObject({
      payment: { method: 'bank_transfer', amount: 49, currency: 'USD', reference: 'TX-7' },
    });

    expect(tx.upgradeRequest.update).toHaveBeenCalledOnce();
    const urCall = tx.upgradeRequest.update.mock.calls[0]?.[0] as {
      where: unknown;
      data: Record<string, unknown>;
    };
    expect(urCall.where).toEqual({ id: 'req-1' });
    expect(urCall.data).toMatchObject({
      status: 'approved',
      resolvedByClerkId: 'cu_op',
      approvedPlan: 'pro',
      paymentMethod: 'bank_transfer',
      paymentAmount: 49,
      paymentCurrency: 'USD',
      paymentReference: 'TX-7',
    });
  });

  it('does not touch upgradeRequest and records null payment when no upgradeRequestId/payment given', async () => {
    const tx = makeTx({ id: 't1', plan: 'free', status: 'active' });
    mockWithBypass.mockImplementation(async (fn: (tx: MockTx) => unknown) => fn(tx));

    await changeTenantPlan({
      tenantId: 't1',
      plan: 'pro',
      status: 'active',
      reason: 'r',
      actorClerkId: 'cu',
    });

    expect(tx.upgradeRequest.update).not.toHaveBeenCalled();
    const beCall = tx.billingEvent.create.mock.calls[0]?.[0] as {
      data: { payload: Record<string, unknown> };
    };
    expect(beCall.data.payload.payment).toBeNull();
  });
});
