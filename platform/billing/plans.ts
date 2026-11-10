import type { TenantPlan } from '@prisma/client';

const GB = 1024 ** 3;
const UNLIMITED = Number.MAX_SAFE_INTEGER;

export interface PlanLimits {
  members: number;
  monthlyPostedDocs: number;
  storageBytes: number;
  savedViews: number;
}

export interface PlanFeatures {
  advancedReports: boolean;
  periodClose: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  sso: boolean;
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  // TEMP (test 2026-05-29): doc limits lowered to 5/8/10 for easy manual testing.
  // Revert to 100 / 500 / 5_000 after testing.
  free: { members: 2, monthlyPostedDocs: 5, storageBytes: 1 * GB, savedViews: 3 },
  starter: { members: 5, monthlyPostedDocs: 8, storageBytes: 5 * GB, savedViews: 10 },
  pro: { members: 15, monthlyPostedDocs: 10, storageBytes: 25 * GB, savedViews: UNLIMITED },
  business: {
    members: UNLIMITED,
    monthlyPostedDocs: UNLIMITED,
    storageBytes: 100 * GB,
    savedViews: UNLIMITED,
  },
  enterprise: {
    members: UNLIMITED,
    monthlyPostedDocs: UNLIMITED,
    storageBytes: UNLIMITED,
    savedViews: UNLIMITED,
  },
};

export const PLAN_FEATURES: Record<TenantPlan, PlanFeatures> = {
  free: {
    advancedReports: false,
    periodClose: false,
    apiAccess: false,
    customBranding: false,
    sso: false,
  },
  starter: {
    advancedReports: false,
    periodClose: false,
    apiAccess: false,
    customBranding: false,
    sso: false,
  },
  pro: {
    advancedReports: true,
    periodClose: true,
    apiAccess: false,
    customBranding: false,
    sso: false,
  },
  business: {
    advancedReports: true,
    periodClose: true,
    apiAccess: true,
    customBranding: true,
    sso: false,
  },
  enterprise: {
    advancedReports: true,
    periodClose: true,
    apiAccess: true,
    customBranding: true,
    sso: true,
  },
};

export const PLAN_RANK: Record<TenantPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

export function isHigherPlan(a: TenantPlan, b: TenantPlan): boolean {
  return PLAN_RANK[a] > PLAN_RANK[b];
}
