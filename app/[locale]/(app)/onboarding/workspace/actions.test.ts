import { withBypass } from '@/platform/db/tenant-context';
import { afterEach, describe, expect, it } from 'vitest';

import { createWorkspaceAction } from './actions';

const createdTenantIds: string[] = [];
const createdUserIds: string[] = [];

async function cleanup() {
  if (createdTenantIds.length === 0 && createdUserIds.length === 0) return;
  await withBypass(async (tx) => {
    if (createdTenantIds.length > 0) {
      await tx.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
    }
    if (createdUserIds.length > 0) {
      await tx.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });
  createdTenantIds.length = 0;
  createdUserIds.length = 0;
}

function makeForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function uniqueClerkId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueEmail(): string {
  return `ws-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

afterEach(cleanup);

describe('createWorkspaceAction', () => {
  it('creates tenant + owner membership for a fresh Clerk user', async () => {
    const clerkId = uniqueClerkId('user_ws');
    const email = uniqueEmail();
    const result = await createWorkspaceAction(
      null,
      makeForm({
        name: 'Sample Trading LLC',
        currency: 'USD',
        __locale: 'tr',
        __clerkUserId: clerkId,
        __email: email,
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tenantId = String(result.data.tenantId);
    createdTenantIds.push(tenantId);

    const { tenant, user, membership } = await withBypass(async (tx) => {
      const t = await tx.tenant.findUnique({ where: { id: tenantId } });
      const u = await tx.user.findUnique({ where: { clerkId } });
      const m = u
        ? await tx.membership.findUnique({
            where: { tenantId_userId: { tenantId, userId: u.id } },
            include: { roles: true },
          })
        : null;
      return { tenant: t, user: u, membership: m };
    });

    expect(tenant).not.toBeNull();
    expect(tenant?.name).toBe('Sample Trading LLC');
    expect(tenant?.currency).toBe('USD');
    expect(tenant?.defaultLocale).toBe('tr');
    expect(tenant?.clerkOrgId.startsWith('local-')).toBe(true);
    expect(tenant?.trialEndsAt).toBeInstanceOf(Date);

    expect(user).not.toBeNull();
    if (user) createdUserIds.push(user.id);

    expect(membership).not.toBeNull();
    expect(membership?.roles.some((r) => r.name === 'owner')).toBe(true);
  });

  it('rejects empty workspace name with fieldErrors.name', async () => {
    const clerkId = uniqueClerkId('user_ws_empty');
    const email = uniqueEmail();
    const result = await createWorkspaceAction(
      null,
      makeForm({
        name: '',
        __locale: 'tr',
        __clerkUserId: clerkId,
        __email: email,
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors?.name?.length ?? 0).toBeGreaterThan(0);

    // No tenant was created — track for safety
    const tenants = await withBypass((tx) =>
      tx.tenant.findMany({
        where: { clerkOrgId: { startsWith: 'local-' }, name: '' },
      }),
    );
    expect(tenants.length).toBe(0);
  });

  it('synthesizes a unique slug when name collides', async () => {
    const clerkA = uniqueClerkId('user_ws_collA');
    const emailA = uniqueEmail();
    const r1 = await createWorkspaceAction(
      null,
      makeForm({
        name: 'CollisionTest',
        __locale: 'tr',
        __clerkUserId: clerkA,
        __email: emailA,
      }),
    );
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const tenantA = String(r1.data.tenantId);
    const slugA = String(r1.data.slug);
    createdTenantIds.push(tenantA);
    const userA = await withBypass((tx) => tx.user.findUnique({ where: { clerkId: clerkA } }));
    if (userA) createdUserIds.push(userA.id);

    const clerkB = uniqueClerkId('user_ws_collB');
    const emailB = uniqueEmail();
    const r2 = await createWorkspaceAction(
      null,
      makeForm({
        name: 'CollisionTest',
        __locale: 'tr',
        __clerkUserId: clerkB,
        __email: emailB,
      }),
    );
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const tenantB = String(r2.data.tenantId);
    const slugB = String(r2.data.slug);
    createdTenantIds.push(tenantB);
    const userB = await withBypass((tx) => tx.user.findUnique({ where: { clerkId: clerkB } }));
    if (userB) createdUserIds.push(userB.id);

    expect(slugA).toBe('collisiontest');
    expect(slugB).not.toBe(slugA);
    expect(slugB.startsWith('collisiontest-')).toBe(true);
  });

  it('returns redirectTo /{locale}/onboarding/done on success', async () => {
    const clerkId = uniqueClerkId('user_ws_redir');
    const email = uniqueEmail();
    const result = await createWorkspaceAction(
      null,
      makeForm({
        name: 'Redirect Co',
        __locale: 'ru',
        __clerkUserId: clerkId,
        __email: email,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectTo).toBe('/ru/onboarding/done');

    createdTenantIds.push(String(result.data.tenantId));
    const user = await withBypass((tx) => tx.user.findUnique({ where: { clerkId } }));
    if (user) createdUserIds.push(user.id);
  });

  it('refreshes user.email and name on subsequent submissions (drift correction)', async () => {
    const clerkId = uniqueClerkId('user_ws_drift');
    const firstEmail = uniqueEmail();

    const r1 = await createWorkspaceAction(
      null,
      makeForm({
        name: 'Drift Co First',
        __locale: 'tr',
        __clerkUserId: clerkId,
        __email: firstEmail,
      }),
    );
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    createdTenantIds.push(String(r1.data.tenantId));

    const userAfterFirst = await withBypass((tx) => tx.user.findUnique({ where: { clerkId } }));
    expect(userAfterFirst).not.toBeNull();
    if (userAfterFirst) createdUserIds.push(userAfterFirst.id);
    expect(userAfterFirst?.email).toBe(firstEmail);

    // Second submission with same clerkId but different email — should hit the
    // upsert `update` branch and refresh the email.
    const secondEmail = uniqueEmail();
    const r2 = await createWorkspaceAction(
      null,
      makeForm({
        name: 'Drift Co Second',
        __locale: 'tr',
        __clerkUserId: clerkId,
        __email: secondEmail,
      }),
    );
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    createdTenantIds.push(String(r2.data.tenantId));

    const userAfterSecond = await withBypass((tx) => tx.user.findUnique({ where: { clerkId } }));
    expect(userAfterSecond).not.toBeNull();
    expect(userAfterSecond?.id).toBe(userAfterFirst?.id);
    expect(userAfterSecond?.email).toBe(secondEmail);
  });
});
