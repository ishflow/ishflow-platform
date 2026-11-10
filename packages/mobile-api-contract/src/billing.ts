import { z } from 'zod';

export const PlanSchema = z.enum(['free', 'starter', 'pro', 'business', 'enterprise']);
export const TenantStatusSchema = z.enum(['active', 'trialing', 'past_due', 'suspended', 'cancelled']);

export const PlanLimitsSchema = z.object({
  members: z.number(),
  monthlyPostedDocs: z.number(),
  storageBytes: z.number(),
  savedViews: z.number(),
});

export const UsageSnapshotSchema = z.object({
  members: z.number(),
  monthlyPostedDocs: z.number(),
  storageBytes: z.number(),
  savedViews: z.number(),
});

export const BillingResponseSchema = z.object({
  plan: PlanSchema,
  status: TenantStatusSchema,
  trialEndsAt: z.string().datetime().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  currency: z.string(),
  limits: PlanLimitsSchema,
  usage: UsageSnapshotSchema,
  /**
   * Master gate for the Stripe Checkout / Billing Portal flow. When false the
   * client should render the billing UI in read-only mode with "Contact admin
   * for manual upgrade" copy in place of payment CTAs. Defaults to false on
   * fresh installs so the app ships safely without Stripe credentials.
   */
  paymentsEnabled: z.boolean().default(false),
});

export const BillingHandoffRequestSchema = z.object({
  target: z.enum(['checkout', 'portal', 'overview']),
  plan: z.enum(['starter', 'pro', 'business']).optional(),
  interval: z.enum(['month', 'year']).optional(),
});

export const BillingHandoffResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});

export type BillingResponse = z.infer<typeof BillingResponseSchema>;
export type BillingHandoffRequest = z.infer<typeof BillingHandoffRequestSchema>;
export type BillingHandoffResponse = z.infer<typeof BillingHandoffResponseSchema>;
