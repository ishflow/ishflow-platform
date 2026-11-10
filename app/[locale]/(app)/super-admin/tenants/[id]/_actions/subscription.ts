'use server';

import { writeSaAudit } from '@/lib/v2-super-admin/audit-helper';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import type { TenantPlan, TenantStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const PLAN_VALUES: readonly TenantPlan[] = [
  'free',
  'starter',
  'pro',
  'business',
  'enterprise',
] as const;
const STATUS_VALUES: readonly TenantStatus[] = [
  'active',
  'trialing',
  'past_due',
  'suspended',
  'cancelled',
] as const;

const schema = z.object({
  tenantId: z.string().uuid(),
  plan: z.enum(PLAN_VALUES as unknown as [TenantPlan, ...TenantPlan[]]),
  status: z.enum(STATUS_VALUES as unknown as [TenantStatus, ...TenantStatus[]]),
  reason: z.string().trim().min(1).max(1000),
});

export async function changePlan(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const parsed = schema.safeParse({
    tenantId: String(formData.get('tenantId') ?? ''),
    plan: String(formData.get('plan') ?? ''),
    status: String(formData.get('status') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  const { tenantId, plan, status, reason } = parsed.data;

  await withBypass(async (tx) => {
    const before = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, status: true, name: true },
    });
    if (!before) throw new Error('tenant not found');

    const after = await tx.tenant.update({
      where: { id: tenantId },
      data: { plan, status },
      select: { plan: true, status: true },
    });

    await writeSaAudit(tx, {
      actorClerkId: ctx.user.clerkId,
      action: 'subscription.changed',
      tenantId,
      before: { ...before, reason: null },
      after: { ...after, reason },
    });
  });

  revalidatePath(`/super-admin/tenants/${tenantId}/subscription`);
}
