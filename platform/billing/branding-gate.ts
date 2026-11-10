import type { Tenant } from '@prisma/client';
import { assertFeature, hasFeature } from './features';

/**
 * Spec C (`/settings/organization` tab build) will import this when wiring
 * the branding tab. For now it's a thin re-export so the gate is centralized.
 */
export function canUseBranding(tenant: Pick<Tenant, 'plan' | 'status' | 'trialEndsAt'>): boolean {
  return hasFeature(tenant, 'customBranding');
}

export function requireBranding(tenant: Pick<Tenant, 'plan' | 'status' | 'trialEndsAt'>): void {
  assertFeature(tenant, 'customBranding');
}
