import type { StepKey } from '@/components/v2/admin/period-close/step-nav';
import { getTranslations } from 'next-intl/server';

export async function getStepNavLabels(): Promise<
  Record<StepKey, { label: string; meta: string }>
> {
  const t = await getTranslations('v2_admin.periodClose.steps');
  return {
    checklist: { label: t('checklist.label'), meta: t('checklist.meta') },
    reconciliation: { label: t('reconciliation.label'), meta: t('reconciliation.meta') },
    approval: { label: t('approval.label'), meta: t('approval.meta') },
  };
}
