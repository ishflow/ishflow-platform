import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';

export default async function V2CatalogsPartnersIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/catalogs/partners/customers', locale });
}
