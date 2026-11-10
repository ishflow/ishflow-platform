import type { AppContext } from '@/platform/auth/current-context';
import * as currentContext from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { getOnboardingState } from '@/platform/onboarding';
import * as seedRunner from '@/prisma/seed/runner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dismissOnboardingAction, loadDemoDataAction } from './onboarding';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

async function makeCtxForTenant(roleName: string): Promise<AppContext> {
  const user = await withBypass((tx) =>
    tx.user.create({
      data: {
        clerkId: `user_action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`,
      },
    }),
  );
  const tenant = await withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: 'action-test',
        slug: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    }),
  );
  const role = await withBypass((tx) =>
    tx.role.create({
      data: { tenantId: tenant.id, name: roleName, permissions: [], isSystem: true },
    }),
  );
  const membership = await withBypass((tx) =>
    tx.membership.create({
      data: { tenantId: tenant.id, userId: user.id, roles: { connect: { id: role.id } } },
      include: { roles: { include: { scopes: true } } },
    }),
  );
  return {
    user,
    tenant,
    membership,
    permissions: new Set(),
    scopesByEntity: new Map(),
  } as unknown as AppContext;
}

describe('dismissOnboardingAction', () => {
  it('sets dismissed=true on the caller tenant', async () => {
    const ctx = await makeCtxForTenant('owner');
    vi.spyOn(currentContext, 'requireContext').mockResolvedValue(ctx);
    await dismissOnboardingAction();
    const state = await getOnboardingState(ctx.tenant?.id ?? '');
    expect(state.dismissed).toBe(true);
  });
});

describe('loadDemoDataAction', () => {
  beforeEach(() => {
    vi.spyOn(seedRunner, 'seedDemo').mockResolvedValue({
      customers: 5,
      products: 12,
      invoices: { posted: 1, drafts: 1 },
      payments: { posted: 1, drafts: 0 },
      purchaseInvoices: { posted: 0, drafts: 0 },
      paymentsSent: { posted: 0, drafts: 0 },
    } as unknown as Awaited<ReturnType<typeof seedRunner.seedDemo>>);
  });

  it('owner can load demo data and demoLoaded becomes true', async () => {
    const ctx = await makeCtxForTenant('owner');
    vi.spyOn(currentContext, 'requireContext').mockResolvedValue(ctx);

    const result = await loadDemoDataAction();
    expect(result.ok).toBe(true);

    const state = await getOnboardingState(ctx.tenant?.id ?? '');
    expect(state.demoLoaded).toBe(true);

    const updated = await prisma.tenant.findUnique({
      where: { id: ctx.tenant?.id ?? '' },
      select: { demoImportedAt: true },
    });
    expect(updated?.demoImportedAt).toBeTruthy();
  });

  it('non-owner is rejected', async () => {
    const ctx = await makeCtxForTenant('viewer');
    vi.spyOn(currentContext, 'requireContext').mockResolvedValue(ctx);

    const result = await loadDemoDataAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');

    const state = await getOnboardingState(ctx.tenant?.id ?? '');
    expect(state.demoLoaded).toBe(false);
  });
});
