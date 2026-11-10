import { PlanLimitError } from '@/platform/engine/errors';
import type { Tenant } from '@prisma/client';
import { type PlanAction, assertPlanAllows } from './assert-plan-allows';

export type BillingEnforcementMode = 'off' | 'warn' | 'on';

/**
 * Resolve the current `BILLING_ENFORCEMENT` mode from env. When unset, defaults
 * to `on` in production and `off` elsewhere so dev/test flows keep working
 * while prod stays safe by default. Read fresh on every call — tests can stub
 * `process.env.BILLING_ENFORCEMENT` per case without module cache invalidation.
 */
export function getBillingEnforcementMode(): BillingEnforcementMode {
  const raw = process.env.BILLING_ENFORCEMENT;
  if (raw === 'warn' || raw === 'on' || raw === 'off') return raw;
  return process.env.NODE_ENV === 'production' ? 'on' : 'off';
}

/**
 * Guard a write path against the tenant's effective plan limits.
 *
 * - `off`  — no-op. Skip the underlying `assertPlanAllows` call entirely.
 * - `warn` — run the check; on `PlanLimitError`, log a structured warning
 *            and return without throwing. Other errors still propagate.
 * - `on`   — run the check; re-throw `PlanLimitError` for the route layer
 *            to map to HTTP 402. Other errors still propagate.
 *
 * Route handlers must catch `PlanLimitError` and respond with
 * `error.toJSON()` + status 402.
 */
export async function enforcePlanLimit(
  tenant: Pick<Tenant, 'id' | 'plan' | 'status' | 'trialEndsAt'>,
  action: PlanAction,
): Promise<void> {
  const mode = getBillingEnforcementMode();
  if (mode === 'off') return;
  // TEMP (test 2026-05-29): post_document hard-blocks too so the lowered doc
  // limits are visibly testable. Revert to the warn-degrade line below.
  //   const effectiveMode: BillingEnforcementMode =
  //     action.kind === 'post_document' && mode === 'on' ? 'warn' : mode;
  const effectiveMode: BillingEnforcementMode = mode;
  try {
    await assertPlanAllows(tenant, action);
  } catch (err) {
    if (err instanceof PlanLimitError) {
      if (effectiveMode === 'warn') {
        console.warn(
          JSON.stringify({
            event: 'billing.limit_warn',
            ...err.toJSON(),
            tenantId: tenant.id,
          }),
        );
        return;
      }
      throw err;
    }
    throw err;
  }
}
