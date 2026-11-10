import { withBypass } from '@/platform/db/tenant-context';
/**
 * Stripe `checkout.session.completed` handler.
 *
 * Fires when a Stripe Checkout session reaches the success URL. We resolve
 * the tenant via `metadata.tenantId` (set during checkout creation) or by
 * the Stripe customer id, then persist `stripeCustomerId` if we hadn't
 * stored one yet. The plan/status change waits for
 * `customer.subscription.created` — Stripe sends both events; reacting only
 * to subscription.* keeps a single source of truth.
 */
import type Stripe from 'stripe';
import { extractCustomerId } from './_helpers';

export async function handleCheckoutCompleted(
  event: Stripe.Event,
): Promise<{ tenantId: string | null }> {
  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = extractCustomerId(session.customer);
  const metadataTenantId = session.metadata?.tenantId ?? null;

  const tenant = await withBypass(async (tx) => {
    if (metadataTenantId) {
      const byMeta = await tx.tenant.findUnique({ where: { id: metadataTenantId } });
      if (byMeta) return byMeta;
    }
    if (customerId) {
      return tx.tenant.findFirst({ where: { stripeCustomerId: customerId } });
    }
    return null;
  });

  if (!tenant) return { tenantId: null };

  if (customerId && tenant.stripeCustomerId !== customerId) {
    await withBypass((tx) =>
      tx.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      }),
    );
  }

  return { tenantId: tenant.id };
}
