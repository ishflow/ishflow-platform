import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { CircleSlash } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2SuspendedPage() {
  const t = await getTranslations('v2_marketing.errors.suspended');
  return (
    <V2StatusPage
      Icon={CircleSlash}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/sign-in' }}
      secondaryCta={{ label: t('secondary'), href: '/contact' }}
    />
  );
}
