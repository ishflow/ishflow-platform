import { V2OnboardingCurrencyPicker } from '@/components/v2/onboarding/currency-picker';
import { resolveContext } from '@/platform/auth/current-context';
import { getTranslations } from 'next-intl/server';
import { setTenantCurrencyAction } from './actions';

// TODO(v2-onboarding-router): This page is standalone. Integration into the
// onboarding wizard state machine (welcome → workspace → currency → demo →
// tour → done) needs a manual edit to the wizard router; the currency step
// should slot in after `workspace` (where the tenant is created) and before
// `demo`. Adding the step key + nav order is out of scope for this stream.
export default async function V2OnboardingCurrencyPage() {
  const t = await getTranslations('v2_onboarding.currency');
  const ctx = await resolveContext();
  const initial = ctx?.tenant?.currency ?? undefined;
  return (
    <div className="content">
      <div className="topbar">
        <div>
          <div className="breadcrumb">{t('breadcrumb')}</div>
          <h1>{t('pageTitle')}</h1>
        </div>
      </div>
      <V2OnboardingCurrencyPicker
        initial={initial}
        onSubmit={async (code) => {
          'use server';
          await setTenantCurrencyAction(code);
        }}
      />
    </div>
  );
}
