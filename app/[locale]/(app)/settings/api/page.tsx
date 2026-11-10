import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

// The `/settings/api` index used to render a mock overview (fake keys /
// webhooks / rate-limits). The real token management lives at
// `/settings/api/tokens`, so we redirect straight there and never show the
// mock — the nav already points at the tokens page.
export default async function V2ApiOverviewPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/settings/api/tokens', locale });
}
