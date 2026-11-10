import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2ForbiddenPage() {
  const t = await getTranslations('v2_marketing.errors.forbidden');
  return (
    <V2StatusPage
      code="403"
      Icon={Lock}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/' }}
      secondaryCta={{ label: t('secondary'), href: '/sign-in' }}
    />
  );
}
