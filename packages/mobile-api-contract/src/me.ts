import { z } from 'zod';
import { UuidSchema } from './common';
import { MobileFeaturesSchema } from './features';
import { SetupProgressSchema } from './onboarding';

export const TenantSummarySchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  currency: z.string(),
  mobileFeatures: MobileFeaturesSchema,
  // Android compat: per-membership role exposed alongside currency/features
  // when this summary is used inside the /me `tenants` array. Optional +
  // nullable so existing `tenant` consumers (which never set it) still parse.
  role: z.string().nullable().optional(),
});

export const MobileTabSchema = z.object({
  id: z.string(),
  icon: z.string(),
  labelKey: z.string(),
  order: z.number(),
});

export const MobileFabActionSchema = z.object({
  id: z.string(),
  icon: z.string(),
  labelKey: z.string(),
  order: z.number(),
});

export const MembershipSummarySchema = z.object({
  tenantId: UuidSchema,
  tenantName: z.string(),
  tenantSlug: z.string(),
  primaryRole: z.string(),
  isCurrent: z.boolean(),
});

export const MeResponseSchema = z
  .object({
    user: z.object({
      id: UuidSchema,
      email: z.string().email(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      imageUrl: z.string().nullable(),
    }),
    tenant: TenantSummarySchema.nullable(),
    permissions: z.array(z.string()),
    primaryRole: z.string(),
    tabs: z.array(MobileTabSchema),
    fabActions: z.array(MobileFabActionSchema),
    memberships: z.array(MembershipSummarySchema).default([]),
    // Android compat alias: same data as `memberships`, reshaped into the
    // tenant-summary shape the Android client already consumes for the org
    // switcher. iOS continues to read `memberships`; both clients stay green.
    tenants: z.array(TenantSummarySchema).optional(),
  })
  .extend({ setupProgress: SetupProgressSchema.optional() })
  .extend({ subscriptionFeatureVisible: z.boolean().default(true) });

export const SwitchTenantResponseSchema = z.object({
  token: z.string(),
});

export type TenantSummary = z.infer<typeof TenantSummarySchema>;
export type MobileTab = z.infer<typeof MobileTabSchema>;
export type MobileFabAction = z.infer<typeof MobileFabActionSchema>;
export type MembershipSummary = z.infer<typeof MembershipSummarySchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type SwitchTenantResponse = z.infer<typeof SwitchTenantResponseSchema>;
