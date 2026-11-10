import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import { beforeEach, describe, expect, it } from 'vitest';
import { getWebSetupProgress } from './web-setup-progress';

async function makeTenant(legalName?: string | null) {
  return withBypass((tx) =>
    tx.tenant.create({
      data: {
        clerkOrgId: `org_web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: 'web-progress-test',
        slug: `wsp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        legalName: legalName ?? null,
      },
      select: { id: true, legalName: true },
    }),
  );
}

describe('getWebSetupProgress', () => {
  let tenantId: string;

  beforeEach(async () => {
    const t = await makeTenant();
    tenantId = t.id;
  });

  it('returns all five steps incomplete for a fresh tenant', async () => {
    const progress = await getWebSetupProgress(tenantId);
    expect(progress.totalCount).toBe(5);
    expect(progress.completedCount).toBe(0);
    expect(progress.steps.map((s) => s.id)).toEqual([
      'company_profile',
      'first_customer',
      'first_product',
      'first_invoice',
      'first_payment',
    ]);
    for (const step of progress.steps) expect(step.completed).toBe(false);
  });

  it('marks company_profile complete when legalName is set', async () => {
    await withBypass((tx) =>
      tx.tenant.update({
        where: { id: tenantId },
        data: { legalName: 'Acme LLC' },
      }),
    );
    const progress = await getWebSetupProgress(tenantId);
    expect(progress.steps.find((s) => s.id === 'company_profile')?.completed).toBe(true);
    expect(progress.completedCount).toBe(1);
  });

  it('honors manual override via onboardingState.completedSteps', async () => {
    await withBypass((tx) =>
      tx.tenant.update({
        where: { id: tenantId },
        data: {
          onboardingState: {
            dismissed: false,
            completedSteps: ['first_invoice'],
            demoLoaded: false,
          },
        },
      }),
    );
    const progress = await getWebSetupProgress(tenantId);
    expect(progress.steps.find((s) => s.id === 'first_invoice')?.completed).toBe(true);
  });

  it('marks first_customer complete when ≥1 customer exists', async () => {
    await withBypass((tx) =>
      tx.catalog_sales_customer.create({
        data: {
          tenantId,
          code: randomUUID().slice(0, 8).toUpperCase(),
          name: `Test Customer ${Date.now()}-${Math.random()}`,
        },
      }),
    );
    const progress = await getWebSetupProgress(tenantId);
    expect(progress.steps.find((s) => s.id === 'first_customer')?.completed).toBe(true);
  });
});
