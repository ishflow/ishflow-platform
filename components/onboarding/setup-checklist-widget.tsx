import { dismissOnboardingAction, loadDemoDataFormAction } from '@/app/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { WebSetupProgress, WebSetupStepId } from '@/platform/onboarding';
import { CheckCircle2, Circle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type Props = {
  progress: WebSetupProgress;
  canLoadDemo: boolean;
  demoLoaded: boolean;
};

const STEP_I18N_SUFFIX: Record<
  WebSetupStepId,
  'companyProfile' | 'firstCustomer' | 'firstProduct' | 'firstInvoice' | 'firstPayment'
> = {
  company_profile: 'companyProfile',
  first_customer: 'firstCustomer',
  first_product: 'firstProduct',
  first_invoice: 'firstInvoice',
  first_payment: 'firstPayment',
};

export async function SetupChecklistWidget({ progress, canLoadDemo, demoLoaded }: Props) {
  const t = await getTranslations('onboarding.setupChecklist');
  const percent = Math.round((progress.completedCount / progress.totalCount) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('subtitle', { done: progress.completedCount, total: progress.totalCount })}
            </p>
          </div>
          <div className="w-32">
            <Progress
              value={percent}
              aria-label={t('subtitle', {
                done: progress.completedCount,
                total: progress.totalCount,
              })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {progress.steps.map((step) => {
            const label = t(`steps.${STEP_I18N_SUFFIX[step.id]}`);
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-md border border-transparent px-2 py-1.5 text-sm text-foreground transition-colors hover:border-border hover:bg-muted"
                  aria-label={label}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-foreground" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                  <span className={step.completed ? 'text-muted-foreground line-through' : ''}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-2">
          {canLoadDemo && !demoLoaded ? (
            <form action={loadDemoDataFormAction}>
              <Button type="submit" variant="outline" size="sm">
                {t('loadDemo')}
              </Button>
            </form>
          ) : (
            <span />
          )}
          <form action={dismissOnboardingAction}>
            <Button type="submit" variant="ghost" size="sm">
              {t('dismiss')}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
