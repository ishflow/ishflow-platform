import { randomUUID } from 'node:crypto';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PeriodClosedError } from './errors';
import { checkPeriodOpen, getPeriodClose, setPeriodClose } from './period-close';

const tenantId = randomUUID();
const userId = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'period-close-test',
        slug: `pc-${tenantId.slice(0, 8)}`,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_pc_${userId.slice(0, 8)}`,
        email: `pc-${userId.slice(0, 8)}@example.com`,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM period_close WHERE tenant_id = $1::uuid', tenantId);
    await tx.tenant.delete({ where: { id: tenantId } });
    await tx.user.delete({ where: { id: userId } });
  });
});

describe('checkPeriodOpen', () => {
  it('passes when no close row exists', async () => {
    await withTenant(tenantId, async (tx) => {
      await checkPeriodOpen(tx, tenantId, 'sales', new Date('2026-01-15'));
    });
  });

  it('throws PeriodClosedError when doc date <= closedThrough', async () => {
    await withTenant(tenantId, async (tx) => {
      await setPeriodClose(tx, tenantId, userId, 'sales', new Date('2026-02-28'));
    });
    await withTenant(tenantId, async (tx) => {
      await expect(
        checkPeriodOpen(tx, tenantId, 'sales', new Date('2026-02-15')),
      ).rejects.toBeInstanceOf(PeriodClosedError);
    });
  });

  it('passes when doc date > closedThrough', async () => {
    await withTenant(tenantId, async (tx) => {
      await checkPeriodOpen(tx, tenantId, 'sales', new Date('2026-03-01'));
    });
  });

  it('getPeriodClose returns the rows ordered by module', async () => {
    await withTenant(tenantId, async (tx) => {
      await setPeriodClose(tx, tenantId, userId, 'purchases', new Date('2026-01-31'));
    });
    const rows = await withTenant(tenantId, (tx) => getPeriodClose(tx, tenantId));
    expect(rows.map((r) => r.module)).toEqual(['purchases', 'sales']);
  });

  it('"*" module closure blocks every module', async () => {
    await withTenant(tenantId, async (tx) => {
      await setPeriodClose(tx, tenantId, userId, '*', new Date('2026-06-30'));
    });
    await withTenant(tenantId, async (tx) => {
      await expect(
        checkPeriodOpen(tx, tenantId, 'inventory', new Date('2026-06-15')),
      ).rejects.toBeInstanceOf(PeriodClosedError);
    });
  });
});
