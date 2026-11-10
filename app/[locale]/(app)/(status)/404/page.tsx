import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2NotFoundPage() {
  const t = await getTranslations('v2_marketing.errors.notFound');
  return (
    <V2StatusPage
      code="404"
      Icon={Search}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/' }}
      secondaryCta={{ label: t('secondary'), href: '/contact' }}
    />
  );
}
