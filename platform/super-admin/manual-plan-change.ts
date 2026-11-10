import { randomUUID } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';
import { sendPlanChangedEmail } from '@/platform/email/send-plan-changed';
import type { Prisma, TenantPlan, TenantStatus } from '@prisma/client';

/**
 * Apply a plan / status change to a tenant from the operator console,
 * bypassing Stripe entirely.
 *
 * Designed for the bank-transfer / Kyrgyzstan flow where the operator
 * collects payment off-platform and needs to bump the tenant onto a
 * paid tier without a Checkout session.
 *
 * Three writes happen inside a single bypass transaction:
 * 1. `tenant` — plan + status updated.
 * 2. `billing_event` — a synthetic `manual.plan.changed` row so the
 *    Subscription tab timeline shows the operator action next to
 *    Stripe-originated events. `stripe_event_id` is a synthetic
 *    `manual_<uuid>` to satisfy the `UNIQUE` constraint while making the
 *    origin obvious.
 * 3. `platform_audit_log` — operator action trail with before/after.
 */
export type ChangePlanPayment = {
  method: string;
  amount?: number | null;
  currency?: string | null;
  reference?: string | null;
};

export interface ChangePlanInput {
  tenantId: string;
  plan: TenantPlan;
  status: TenantStatus;
  reason: string;
  actorClerkId: string;
  actorIp?: string;
  actorUserAgent?: string;
  /** Off-platform payment recorded by the operator at approval time. */
  payment?: ChangePlanPayment;
  /** When set, the linked upgrade_request row is flipped to `approved`. */
  upgradeRequestId?: string;
}

export class TenantNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantNotFoundError';
  }
}

export async function changeTenantPlan(input: ChangePlanInput): Promise<void> {
  await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new TenantNotFoundError(`Tenant ${input.tenantId} not found`);
    }

    const before = { plan: tenant.plan, status: tenant.status };
    const after = { plan: input.plan, status: input.status };

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { plan: input.plan, status: input.status },
    });

    await tx.billingEvent.create({
      data: {
        tenantId: input.tenantId,
        stripeEventId: `manual_${randomUUID()}`,
        type: 'manual.plan.changed',
        payload: {
          reason: input.reason,
          actorClerkId: input.actorClerkId,
          before,
          after,
          payment: input.payment ?? null,
        } satisfies Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorClerkId: input.actorClerkId,
        action: 'plan.changed',
        tenantId: input.tenantId,
        before,
        after,
        ip: input.actorIp ?? null,
        userAgent: input.actorUserAgent ?? null,
      },
    });

    // When the change resolves a tenant upgrade request, flip it to approved and
    // stamp the recorded payment so the request row carries a permanent history.
    if (input.upgradeRequestId) {
      await tx.upgradeRequest.update({
        where: { id: input.upgradeRequestId },
        data: {
          status: 'approved',
          resolvedAt: new Date(),
          resolvedByClerkId: input.actorClerkId,
          approvedPlan: input.plan,
          paymentMethod: input.payment?.method ?? null,
          paymentAmount: input.payment?.amount ?? null,
          paymentCurrency: input.payment?.currency ?? null,
          paymentReference: input.payment?.reference ?? null,
        },
      });
    }
  });

  // Best-effort: email the tenant owner about the plan change, in the tenant's
  // locale. Outside the tx so a mail hiccup never rolls back the plan change.
  await notifyTenantOfPlanChange(input.tenantId, input.plan).catch(() => {});
}

async function notifyTenantOfPlanChange(tenantId: string, plan: TenantPlan): Promise<void> {
  const data = await withBypass(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, defaultLocale: true },
    });
    if (!tenant) return null;
    const owner = await tx.membership.findFirst({
      where: { tenantId, roles: { some: { name: 'owner' } } },
      select: { user: { select: { email: true } } },
    });
    const email = owner?.user?.email;
    return email ? { email, name: tenant.name, locale: tenant.defaultLocale } : null;
  });
  if (!data) return;
  await sendPlanChangedEmail({ to: data.email, companyName: data.name, plan, locale: data.locale });
}
