import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { V2Topbar } from '@/components/v2/shell/topbar';
import type { Locale } from '@/platform/metadata';
import { ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function V2SecurityPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('v2_settings.security');

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <Card className="max-w-xl">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <ShieldCheck className="h-6 w-6 shrink-0 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{t('card.title')}</CardTitle>
              <CardDescription>{t('card.description')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{t('card.body')}</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${locale}/settings/profile`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('links.profile')}
                </Link>
                <span className="text-muted-foreground"> — {t('links.profileHint')}</span>
              </li>
              <li>
                <Link
                  href={`/${locale}/settings/sessions`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t('links.sessions')}
                </Link>
                <span className="text-muted-foreground"> — {t('links.sessionsHint')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
