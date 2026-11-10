import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { Hourglass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2TrialEndedPage() {
  const t = await getTranslations('v2_marketing.errors.trialEnded');
  return (
    <V2StatusPage
      Icon={Hourglass}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/pricing' }}
      secondaryCta={{ label: t('secondary'), href: '/sign-in' }}
    />
  );
}
