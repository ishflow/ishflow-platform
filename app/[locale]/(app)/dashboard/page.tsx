import { renderV2Dashboard } from '@/components/v2/dashboard/render-dashboard';
import { FirstRunTour } from '@/components/v2/shell/first-run-tour';
import { resolveContext } from '@/platform/auth/current-context';
import { getTourSeen } from '@/platform/onboarding/tour-state';

export default async function V2DashboardPage() {
  // First-run coachmark: show once to a user who has a workspace but hasn't
  // seen the tour yet. `resolveContext` is request-cached, so this shares the
  // lookup `renderV2Dashboard` already does. Wrapped so a tour-state read can
  // never break the dashboard — on any error we simply don't show the tour.
  let showTour = false;
  try {
    const ctx = await resolveContext();
    if (ctx?.user && ctx.tenant) {
      showTour = !(await getTourSeen(ctx.user.id));
    }
  } catch (err) {
    console.error('[dashboard] first-run tour check failed', err);
  }

  return (
    <>
      {await renderV2Dashboard()}
      {showTour ? <FirstRunTour /> : null}
    </>
  );
}
