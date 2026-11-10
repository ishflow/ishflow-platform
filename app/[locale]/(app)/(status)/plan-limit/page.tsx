import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2PlanLimitPage() {
  const t = await getTranslations('v2_marketing.errors.planLimit');
  return (
    <V2StatusPage
      Icon={TrendingUp}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/pricing' }}
      secondaryCta={{ label: t('secondary'), href: '/contact' }}
    />
  );
}
