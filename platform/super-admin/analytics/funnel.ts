/**
 * Signup → activation funnel for the Super Admin analytics page.
 *
 * Stages are tenant-keyed and counted by counting tenants that reached
 * each stage. The numbers are monotonically non-increasing because a
 * tenant cannot reach `firstInvoice` without first signing up — but we
 * compute them independently so a regression at any stage is obvious.
 */

import { withBypass } from '@/platform/db/tenant-context';

export interface FunnelCounts {
  signup: number;
  onboarded: number;
  firstInvoice: number;
  firstPayment: number;
  retained7d: number;
}

/**
 * Compute funnel counts as of `now`.
 *
 * Retention is defined as: tenant signed up AND any member authored an
 * audit row strictly after 7 days from signup. We use audit-log activity
 * as a cheap signal of "logged in / did something" without scanning every
 * document table.
 */
export async function computeFunnel(now: Date = new Date()): Promise<FunnelCounts> {
  return withBypass(async (tx) => {
    const tenants = await tx.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, createdAt: true, onboardingState: true },
    });

    const signup = tenants.length;
    let onboarded = 0;
    for (const t of tenants) {
      const state = t.onboardingState;
      if (state && typeof state === 'object' && !Array.isArray(state)) {
        const completedSteps = (state as { completedSteps?: unknown }).completedSteps;
        const dismissed = (state as { dismissed?: unknown }).dismissed === true;
        const demoLoaded = (state as { demoLoaded?: unknown }).demoLoaded === true;
        if (
          dismissed ||
          demoLoaded ||
          (Array.isArray(completedSteps) && completedSteps.length >= 3)
        ) {
          onboarded += 1;
        }
      }
    }

    // First invoice posted per tenant.
    const invoiced = await tx.document_sales_invoice.groupBy({
      by: ['tenantId'],
      where: { postedAt: { not: null } },
      _count: { _all: true },
    });
    const firstInvoice = invoiced.length;

    // First payment received per tenant.
    const paid = await tx.document_sales_payment_received.groupBy({
      by: ['tenantId'],
      where: { postedAt: { not: null } },
      _count: { _all: true },
    });
    const firstPayment = paid.length;

    // 7-day retention — audit activity strictly after signup + 7 days.
    const sevenDayActive = await Promise.all(
      tenants.map(async (t) => {
        const cutoff = new Date(t.createdAt);
        cutoff.setUTCDate(cutoff.getUTCDate() + 7);
        if (cutoff > now) return false;
        const has = await tx.platformAuditLog.findFirst({
          where: {
            tenantId: t.id,
            createdAt: { gt: cutoff },
          },
          select: { id: true },
        });
        return !!has;
      }),
    );
    const retained7d = sevenDayActive.filter(Boolean).length;

    return { signup, onboarded, firstInvoice, firstPayment, retained7d };
  });
}
