import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

/**
 * /reports is no longer a hub. The sidebar lists each report directly;
 * landing on the bare URL goes straight to Gross Profit (the headline
 * report). Deep-linked legacy URLs keep working.
 */
export default async function V2ReportsIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/reports/gross-profit', locale });
}
