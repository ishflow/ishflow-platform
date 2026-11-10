import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, describe, expect, it } from 'vitest';
import { createUpgradeRequestRecord, createUpgradeRequestSchema } from './create-upgrade-request';

async function makeTenant(): Promise<string> {
  const uid = randomUUID().replace(/-/g, '');
  return withBypass(async (tx) => {
    const t = await tx.tenant.create({
      data: {
        clerkOrgId: `org_${uid}`,
        name: 'UpgradeReq Test Co',
        slug: `ur-${uid.slice(0, 12)}`,
        plan: 'free',
        status: 'active',
      },
      select: { id: true },
    });
    return t.id;
  });
}

describe('createUpgradeRequestSchema', () => {
  it('rejects a blank phone', () => {
    const r = createUpgradeRequestSchema.safeParse({ contactPhone: '' });
    expect(r.success).toBe(false);
  });
  it('accepts phone-only (plan + note optional)', () => {
    const r = createUpgradeRequestSchema.safeParse({ contactPhone: '+996700112233' });
    expect(r.success).toBe(true);
  });
  it('rejects an unknown requestedPlan', () => {
    const r = createUpgradeRequestSchema.safeParse({
      contactPhone: '+1',
      requestedPlan: 'platinum',
    });
    expect(r.success).toBe(false);
  });
});

describe('createUpgradeRequestRecord', () => {
  const created: string[] = [];
  const tenants: string[] = [];
  afterEach(async () => {
    await withBypass(async (tx) => {
      if (created.length) {
        await tx.upgradeRequest.deleteMany({ where: { id: { in: created } } });
      }
      for (const id of tenants) {
        await tx.tenant.delete({ where: { id } });
      }
    });
    created.length = 0;
    tenants.length = 0;
  });

  it('inserts a pending row using server-context company/email (not client input)', async () => {
    const tenantId = await makeTenant();
    tenants.push(tenantId);
    const id = await createUpgradeRequestRecord(
      { contactPhone: '+996700112233', requestedPlan: 'pro', note: 'need API' },
      {
        tenantId,
        userId: null,
        companyName: 'UpgradeReq Test Co',
        contactEmail: 'owner@test.co',
      },
    );
    created.push(id);
    const row = await withBypass((tx) => tx.upgradeRequest.findUnique({ where: { id } }));
    expect(row?.status).toBe('pending');
    expect(row?.companyName).toBe('UpgradeReq Test Co');
    expect(row?.contactEmail).toBe('owner@test.co');
    expect(row?.contactPhone).toBe('+996700112233');
    expect(row?.requestedPlan).toBe('pro');
  });
});
