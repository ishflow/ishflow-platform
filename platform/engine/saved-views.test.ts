import { randomUUID } from 'node:crypto';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSavedView, deleteSavedView, getSavedView, listSavedViews } from './saved-views';

const tenantId = randomUUID();
const userId = randomUUID();

beforeAll(async () => {
  await withBypass(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        clerkOrgId: `org_${tenantId}`,
        name: 'SavedView test',
        slug: `sv-${tenantId.slice(0, 8)}`,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        clerkId: `user_${userId}`,
        email: `${userId}@example.test`,
      },
    });
  });
});

afterAll(async () => {
  await withBypass(async (tx) => {
    await tx.savedView.deleteMany({ where: { tenantId } });
    await tx.tenant.delete({ where: { id: tenantId } });
    await tx.user.delete({ where: { id: userId } });
  });
});

describe('saved-views engine', () => {
  it('creates + lists + soft-deletes', async () => {
    await withTenant(tenantId, async (tx) => {
      const row = await createSavedView(tx, {
        tenantId,
        userId,
        kind: 'report.turnover',
        name: 'Feb-to-date sales',
        payload: {
          register: 'sales.accounts_receivable',
          from: '2026-02-01',
          to: '2026-02-28',
        },
      });
      const list = await listSavedViews(tx, tenantId, userId, 'report.turnover');
      expect(list.some((v) => v.id === row.id)).toBe(true);

      const found = await getSavedView(tx, tenantId, userId, row.id);
      expect(found?.id).toBe(row.id);

      await deleteSavedView(tx, tenantId, userId, row.id);
      const list2 = await listSavedViews(tx, tenantId, userId, 'report.turnover');
      expect(list2.some((v) => v.id === row.id)).toBe(false);

      const afterDelete = await getSavedView(tx, tenantId, userId, row.id);
      expect(afterDelete).toBeNull();
    });
  });

  it('rejects cross-user access via get or delete', async () => {
    const otherUser = randomUUID();
    await withBypass(async (tx) => {
      await tx.user.create({
        data: {
          id: otherUser,
          clerkId: `user_${otherUser}`,
          email: `${otherUser}@example.test`,
        },
      });
    });
    try {
      const row = await withTenant(tenantId, (tx) =>
        createSavedView(tx, {
          tenantId,
          userId,
          kind: 'report.turnover',
          name: 'Private-view',
          payload: {},
        }),
      );
      await withTenant(tenantId, async (tx) => {
        expect(await getSavedView(tx, tenantId, otherUser, row.id)).toBeNull();
        await deleteSavedView(tx, tenantId, otherUser, row.id);
        expect(await getSavedView(tx, tenantId, userId, row.id)).not.toBeNull();
      });
    } finally {
      await withBypass((tx) => tx.user.delete({ where: { id: otherUser } }));
    }
  });

  it('enforces name uniqueness per (tenant, user, kind)', async () => {
    await withTenant(tenantId, async (tx) => {
      await createSavedView(tx, {
        tenantId,
        userId,
        kind: 'report.turnover',
        name: 'Duplicate-name',
        payload: {},
      });
      await expect(
        createSavedView(tx, {
          tenantId,
          userId,
          kind: 'report.turnover',
          name: 'Duplicate-name',
          payload: {},
        }),
      ).rejects.toThrow();
    });
  });
});
