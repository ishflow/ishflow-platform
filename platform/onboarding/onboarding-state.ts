/**
 * Tenant-scoped onboarding state — read/write helpers + Zod schema.
 *
 * Stored on `Tenant.onboardingState` as a JSON column. Reads always go
 * through Zod parse so corrupt/legacy rows degrade to safe defaults.
 *
 * Callers must already have proven tenant ownership before invoking these
 * helpers (the dashboard server component does this via `requireContext()`).
 * We therefore use `withBypass` to skip the per-query RLS GUC overhead,
 * matching the precedent set by `setup-progress.ts`.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { z } from 'zod';

export const OnboardingStateSchema = z.object({
  dismissed: z.boolean().default(false),
  completedSteps: z.array(z.string()).default([]),
  demoLoaded: z.boolean().default(false),
});

export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  dismissed: false,
  completedSteps: [],
  demoLoaded: false,
};

export async function getOnboardingState(tenantId: string): Promise<OnboardingState> {
  const row = await withBypass((tx) =>
    tx.tenant.findUnique({
      where: { id: tenantId },
      select: { onboardingState: true },
    }),
  );
  if (!row || row.onboardingState == null) return DEFAULT_ONBOARDING_STATE;
  const parsed = OnboardingStateSchema.safeParse(row.onboardingState);
  return parsed.success ? parsed.data : DEFAULT_ONBOARDING_STATE;
}

export async function setOnboardingState(
  tenantId: string,
  partial: Partial<OnboardingState>,
): Promise<void> {
  const current = await getOnboardingState(tenantId);
  const next = OnboardingStateSchema.parse({ ...current, ...partial });
  await withBypass((tx) =>
    tx.tenant.update({
      where: { id: tenantId },
      data: { onboardingState: next },
    }),
  );
}
