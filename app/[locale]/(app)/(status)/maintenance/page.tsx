import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { Wrench } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2MaintenancePage() {
  const t = await getTranslations('v2_marketing.errors.maintenance');
  return (
    <V2StatusPage
      Icon={Wrench}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: 'https://status.ishflow.com' }}
      secondaryCta={{ label: t('secondary'), href: '/contact' }}
      meta={t('meta')}
    />
  );
}
