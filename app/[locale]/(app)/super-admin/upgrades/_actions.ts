'use server';

import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { changeTenantPlan } from '@/platform/super-admin/manual-plan-change';
import type { TenantPlan } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

const PLANS: ReadonlyArray<TenantPlan> = ['free', 'starter', 'pro', 'business', 'enterprise'];
function isPlan(v: string): v is TenantPlan {
  return (PLANS as ReadonlyArray<string>).includes(v);
}

/**
 * Approve an upgrade request from the operator console: bump the tenant onto the
 * chosen plan (status active), record the off-platform payment, and flip the
 * request to `approved` — all inside the single `changeTenantPlan` bypass tx.
 */
export async function approveUpgradeRequest(formData: FormData): Promise<void> {
  const ctx = await assertSuperAdmin();
  const h = await headers();
  const requestId = String(formData.get('requestId') ?? '');
  const tenantId = String(formData.get('tenantId') ?? '');
  const planRaw = String(formData.get('plan') ?? '');
  const method = String(formData.get('paymentMethod') ?? '').trim();
  const amountRaw = String(formData.get('paymentAmount') ?? '').trim();
  const currency = String(formData.get('paymentCurrency') ?? '').trim() || null;
  const reference = String(formData.get('paymentReference') ?? '').trim() || null;
  const reason = String(formData.get('reason') ?? '').slice(0, 1000);

  if (!requestId || !tenantId || !isPlan(planRaw)) {
    throw new Error('invalid form');
  }
  const amount = amountRaw === '' ? null : Number.parseFloat(amountRaw);
  if (amount !== null && !Number.isFinite(amount)) {
    throw new Error('invalid amount');
  }

  await changeTenantPlan({
    tenantId,
    plan: planRaw,
    status: 'active',
    reason: reason || 'manual upgrade (operator)',
    actorClerkId: ctx.user.clerkId,
    actorIp: h.get('x-forwarded-for') ?? undefined,
    actorUserAgent: h.get('user-agent') ?? undefined,
    payment: method ? { method, amount, currency, reference } : undefined,
    upgradeRequestId: requestId,
  });
  revalidatePath('/super-admin/upgrades');
}
