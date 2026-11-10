import { V2StatusPage } from '@/components/v2/marketing/status/page';
import { Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2ComingSoonPage() {
  const t = await getTranslations('v2_marketing.errors.comingSoon');
  return (
    <V2StatusPage
      Icon={Sparkles}
      title={t('title')}
      description={t('description')}
      primaryCta={{ label: t('primary'), href: '/roadmap' }}
      secondaryCta={{ label: t('secondary'), href: '/' }}
    />
  );
}
