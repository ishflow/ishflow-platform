import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

/**
 * /registers is no longer a hub. The sidebar now lists each register
 * directly; landing on the bare URL goes straight to the first register
 * (accounts_receivable). Deep-linked legacy URLs keep working.
 */
export default async function V2RegistersIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/registers/accounts_receivable', locale });
}
