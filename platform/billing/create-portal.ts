import type { Tenant } from '@prisma/client';
import { stripe } from './stripe-client';

export interface CreatePortalInput {
  tenant: Tenant;
  returnUrl: string;
}

export async function createPortalSession(input: CreatePortalInput): Promise<{ url: string }> {
  if (!input.tenant.stripeCustomerId) {
    throw new Error('Tenant has no Stripe customer; cannot open billing portal');
  }
  const s = stripe();
  const session = await s.billingPortal.sessions.create({
    customer: input.tenant.stripeCustomerId,
    return_url: input.returnUrl,
  });
  return { url: session.url };
}
