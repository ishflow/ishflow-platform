import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

// /admin/security was a duplicate of /settings/security (same renderV2Settings
// slug, orphan from nav). Redirect to the canonical page.
export default async function AdminSecurityRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/settings/security', locale });
}
