import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

// The settings landing no longer shows a card grid — navigation is driven by
// the left settings panel (see PANELS.settings in lib/v2-shell/nav). Land
// straight on the first section.
export default async function V2SettingsHomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/settings/general', locale });
}
