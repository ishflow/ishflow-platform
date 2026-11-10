import { randomUUID } from 'node:crypto';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantNotFoundError, changeTenantPlan } from './manual-plan-change';

const tenantId = randomUUID();
const actorClerkId = `user_${randomUUID()}`;

beforeAll(async () => {
  await withBypass((tx) =>
    tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'Integration Manual Plan',
        slug: `integration-manual-${tenantId.slice(0, 8)}`,
        currency: 'USD',
        plan: 'free',
        status: 'trialing',
      },
    }),
  );
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.platformAuditLog.deleteMany({ where: { tenantId } });
    await tx.billingEvent.deleteMany({ where: { tenantId } });
    await tx.tenant.delete({ where: { id: tenantId } });
  });
  await prisma.$disconnect();
});

describe('changeTenantPlan — end-to-end', () => {
  it('writes tenant + billing_event + platform_audit_log in one transaction', async () => {
    await changeTenantPlan({
      tenantId,
      plan: 'pro',
      status: 'active',
      reason: 'integration test — bank transfer',
      actorClerkId,
      actorIp: '127.0.0.1',
      actorUserAgent: 'vitest',
    });

    const [tenant, events, audits] = await withBypass(async (tx) => {
      const t = await tx.tenant.findUnique({ where: { id: tenantId } });
      const e = await tx.billingEvent.findMany({
        where: { tenantId, type: 'manual.plan.changed' },
        orderBy: { createdAt: 'desc' },
      });
      const a = await tx.platformAuditLog.findMany({
        where: { tenantId, action: 'plan.changed' },
        orderBy: { createdAt: 'desc' },
      });
      return [t, e, a] as const;
    });

    expect(tenant?.plan).toBe('pro');
    expect(tenant?.status).toBe('active');

    const [event] = events;
    expect(event).toBeDefined();
    if (!event) throw new Error('expected billing event');
    expect(event.stripeEventId).toMatch(/^manual_/);
    expect(event.processedAt).not.toBeNull();
    expect(event.payload).toMatchObject({
      reason: 'integration test — bank transfer',
      actorClerkId,
      before: { plan: 'free', status: 'trialing' },
      after: { plan: 'pro', status: 'active' },
    });

    const [audit] = audits;
    expect(audit).toBeDefined();
    if (!audit) throw new Error('expected audit row');
    expect(audit.actorClerkId).toBe(actorClerkId);
    expect(audit.ip).toBe('127.0.0.1');
    expect(audit.userAgent).toBe('vitest');
  });

  it('throws TenantNotFoundError for missing tenant', async () => {
    await expect(
      changeTenantPlan({
        tenantId: randomUUID(),
        plan: 'starter',
        status: 'active',
        reason: 'should fail',
        actorClerkId,
      }),
    ).rejects.toBeInstanceOf(TenantNotFoundError);
  });
});
