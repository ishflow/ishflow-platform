import { withUser } from '@/platform/db/tenant-context';

/**
 * Per-user first-run onboarding tour state, persisted in the `user_settings`
 * key-value table (no dedicated column / migration needed). Stored under a
 * single key with `{ seenAt }` once the user has been shown the dashboard
 * coachmark — the dashboard renders the tour only while this is unset.
 *
 * Reads/writes go through `withUser` because `user_settings` RLS isolates rows
 * by the `app.user_id` GUC, not by tenant.
 */
const TOUR_KEY = 'first_run_tour';

type TourPayload = { seenAt?: string };

export async function getTourSeen(userId: string): Promise<boolean> {
  const row = await withUser(userId, (tx) =>
    tx.userSettings.findUnique({ where: { userId_key: { userId, key: TOUR_KEY } } }),
  );
  const payload = (row?.payload ?? null) as TourPayload | null;
  return Boolean(payload?.seenAt);
}

export async function markTourSeen(userId: string): Promise<void> {
  const payload: TourPayload = { seenAt: new Date().toISOString() };
  await withUser(userId, (tx) =>
    tx.userSettings.upsert({
      where: { userId_key: { userId, key: TOUR_KEY } },
      create: { userId, key: TOUR_KEY, payload },
      update: { payload },
    }),
  );
}
