import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { ServerCrash } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2ServerErrorPage() {
  const t = await getTranslations('v2_marketing.errors.serverError');
  return (
    <V2StatusPage
      code="500"
      Icon={ServerCrash}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/' }}
      secondaryCta={{ label: t('secondary'), href: '/contact' }}
      meta={t('meta')}
    />
  );
}
