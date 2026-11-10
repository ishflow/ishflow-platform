import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

/**
 * /super-admin → /super-admin/dashboard
 *
 * Mirrors `/` → `/dashboard`. The operator console has no landing of its
 * own; first paint goes straight to the dashboard overview.
 */
export default async function SaRootPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/super-admin/dashboard', locale });
  return null;
}
