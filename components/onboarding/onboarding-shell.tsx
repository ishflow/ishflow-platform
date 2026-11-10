import { loadDemoDataAction } from '@/app/actions/onboarding';
import { requireContext } from '@/platform/auth/current-context';
import { getOnboardingState, getWebSetupProgress } from '@/platform/onboarding';

import { SetupChecklistWidget } from './setup-checklist-widget';
import { WelcomeDialog } from './welcome-dialog';

export async function OnboardingShell() {
  const ctx = await requireContext();
  if (!ctx.tenant) return null;

  const state = await getOnboardingState(ctx.tenant.id);
  if (state.dismissed) return null;

  const progress = await getWebSetupProgress(ctx.tenant.id);
  if (progress.completedCount === progress.totalCount) return null;

  const roles =
    (ctx.membership as unknown as { roles: Array<{ name: string }> } | null)?.roles ?? [];
  const canLoadDemo = roles.some((r) => r.name === 'owner');

  const showWelcome = progress.completedCount === 0 && !state.demoLoaded;

  return (
    <>
      <WelcomeDialog
        initialOpen={showWelcome}
        canLoadDemo={canLoadDemo}
        onLoadDemo={loadDemoDataAction}
      />
      <SetupChecklistWidget
        progress={progress}
        canLoadDemo={canLoadDemo}
        demoLoaded={state.demoLoaded}
      />
    </>
  );
}
