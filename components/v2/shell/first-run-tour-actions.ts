'use server';

import { resolveContext } from '@/platform/auth/current-context';
import { markTourSeen } from '@/platform/onboarding/tour-state';

/**
 * Mark the first-run onboarding tour as seen for the signed-in user. Called
 * once when the coachmark mounts, so it shows exactly once ever (regardless of
 * how the user exits — finish, skip, or navigating away mid-tour). Best-effort:
 * a failure just means the tour may show again next dashboard load.
 */
export async function markFirstRunTourSeenAction(): Promise<void> {
  const ctx = await resolveContext();
  if (!ctx?.user) return;
  await markTourSeen(ctx.user.id);
}
