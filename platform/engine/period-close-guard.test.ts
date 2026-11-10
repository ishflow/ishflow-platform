import { randomUUID } from 'node:crypto';
import type { AppContext } from '@/platform/auth/current-context';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PeriodClosedError } from './errors';
import { setPeriodClose } from './period-close';
import { assertPeriodOpen } from './period-close-guard';

const tenantId = randomUUID();
const userId = randomUUID();

function ctxWithPermissions(...perms: string[]): AppContext {
  return {
    user: { id: userId, email: 'test@example.com' },
    tenant: { id: tenantId, name: 'test', slug: 'test' },
    permissions: new Set(perms),
    roles: [],
    primaryRole: null,
  } as unknown as AppContext;
}

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'period-guard-test',
        slug: `pg-${tenantId.slice(0, 8)}`,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_pg_${userId.slice(0, 8)}`,
        email: `pg-${userId.slice(0, 8)}@example.com`,
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

describe('assertPeriodOpen', () => {
  it('passes when no close row exists', async () => {
    const ctx = ctxWithPermissions('*:*');
    await withTenant(tenantId, async (tx) => {
      await assertPeriodOpen(ctx, new Date('2026-01-15'), tx, 'sales');
    });
  });

  it('throws PeriodClosedError for bookkeeper without period permission', async () => {
    await withTenant(tenantId, async (tx) => {
      await setPeriodClose(tx, tenantId, userId, 'sales', new Date('2026-02-28'));
    });
    const ctx = ctxWithPermissions('sales.invoice:write');
    await withTenant(tenantId, async (tx) => {
      await expect(
        assertPeriodOpen(ctx, new Date('2026-02-15'), tx, 'sales'),
      ).rejects.toBeInstanceOf(PeriodClosedError);
    });
  });

  it('passes for chief_accountant with admin.period:manage', async () => {
    const ctx = ctxWithPermissions('admin.period:manage');
    await withTenant(tenantId, async (tx) => {
      await assertPeriodOpen(ctx, new Date('2026-02-15'), tx, 'sales');
    });
  });

  it('passes for admin with wildcard', async () => {
    const ctx = ctxWithPermissions('*:*');
    await withTenant(tenantId, async (tx) => {
      await assertPeriodOpen(ctx, new Date('2026-02-15'), tx, 'sales');
    });
  });

  it('throws for cashier without period permission', async () => {
    const ctx = ctxWithPermissions('sales.payment_received:write');
    await withTenant(tenantId, async (tx) => {
      await expect(
        assertPeriodOpen(ctx, new Date('2026-02-15'), tx, 'sales'),
      ).rejects.toBeInstanceOf(PeriodClosedError);
    });
  });
});
