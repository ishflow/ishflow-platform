'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { changeTenantPlan } from '@/platform/super-admin/manual-plan-change';
import type { TenantPlan, TenantStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const PLANS: ReadonlyArray<TenantPlan> = ['free', 'starter', 'pro', 'business', 'enterprise'];
const STATUSES: ReadonlyArray<TenantStatus> = [
  'active',
  'trialing',
  'past_due',
  'suspended',
  'cancelled',
];

function isPlan(v: string): v is TenantPlan {
  return (PLANS as ReadonlyArray<string>).includes(v);
}
function isStatus(v: string): v is TenantStatus {
  return (STATUSES as ReadonlyArray<string>).includes(v);
}

export async function manualPlanChange(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const tenantId = String(formData.get('tenantId') ?? '');
  const planRaw = String(formData.get('plan') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const reason = String(formData.get('reason') ?? '').slice(0, 1000);
  if (!tenantId || !isPlan(planRaw) || !isStatus(statusRaw)) {
    throw new Error('invalid form');
  }
  await changeTenantPlan({
    tenantId,
    plan: planRaw,
    status: statusRaw,
    reason,
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for') ?? undefined,
    actorUserAgent: h.get('user-agent') ?? undefined,
  });
  revalidatePath(`/super-admin/tenants/${tenantId}/subscription`);
}

export async function createPlanLimitOverride(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  const key = String(formData.get('key') ?? '').trim();
  const valueRaw = String(formData.get('value') ?? '').trim();
  const expiresAtRaw = String(formData.get('expiresAt') ?? '').trim();
  const value = Number.parseInt(valueRaw, 10);
  if (!tenantId || !key || !Number.isFinite(value)) {
    throw new Error('invalid form');
  }
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error('invalid expiresAt');
  }
  const h = await headers();
  await withBypass(async (tx) => {
    const before = await tx.planLimitOverride.findUnique({
      where: { tenantId_key: { tenantId, key } },
      select: { key: true, value: true, expiresAt: true },
    });
    await tx.planLimitOverride.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value, expiresAt, createdBy: ctx.user.id },
      update: { value, expiresAt },
    });
    await tx.platformAuditLog.create({
      data: {
        actorClerkId: ctx.user.clerkId,
        action: 'plan_limit_override.set',
        tenantId,
        before: (before ?? null) as never,
        after: { key, value, expiresAt } as never,
        ip: h.get('x-forwarded-for') ?? null,
        userAgent: h.get('user-agent') ?? null,
      },
    });
  });
  revalidatePath(`/super-admin/tenants/${tenantId}/subscription`);
}

export async function deletePlanLimitOverride(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  const id = String(formData.get('id') ?? '');
  if (!tenantId || !id) {
    throw new Error('invalid form');
  }
  const h = await headers();
  await withBypass(async (tx) => {
    const before = await tx.planLimitOverride.findFirst({
      where: { id, tenantId },
      select: { key: true, value: true, expiresAt: true },
    });
    const { count } = await tx.planLimitOverride.deleteMany({ where: { id, tenantId } });
    if (count > 0) {
      await tx.platformAuditLog.create({
        data: {
          actorClerkId: ctx.user.clerkId,
          action: 'plan_limit_override.removed',
          tenantId,
          before: (before ?? null) as never,
          after: null as never,
          ip: h.get('x-forwarded-for') ?? null,
          userAgent: h.get('user-agent') ?? null,
        },
      });
    }
  });
  revalidatePath(`/super-admin/tenants/${tenantId}/subscription`);
}
