import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

/**
 * /reports/turnover is no longer a card hub. The Turnover (Ciro) group now
 * expands in the left nav, listing its four sub-reports directly. Landing on
 * the bare URL (or a legacy deep link) goes straight to the first sub-report.
 */
export default async function V2TurnoverIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/reports/turnover/receivable', locale });
}
