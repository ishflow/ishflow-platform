import { Customer360Documents } from '@/components/v2/catalogs/partners/customer-360-documents';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { Link } from '@/platform/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsCustomer360DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('v2_catalogs.partners.customer360');
  const tNav = await getTranslations('v2_nav');

  let customerName = '';
  let docCount = 0;
  try {
    const ctx = await requireTenantContext();
    const result = await withTenant(ctx.tenant.id, async (tx) => {
      const r = await tx.catalog_sales_customer.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!r) return null;
      const cnt = await tx.document_sales_invoice.count({
        where: { customer: id, deletedAt: null },
      });
      return { name: r.name, count: cnt };
    });
    if (!result) notFound();
    customerName = result.name;
    docCount = result.count;
  } catch {
    customerName = '';
  }
  if (!customerName) notFound();

  const breadcrumb = `${tNav('catalogs.section.main')} / ${t('breadcrumbCrumb')} / ${customerName} / 360 / ${t('docsTab')}`;

  return (
    <>
      <V2Topbar breadcrumb={breadcrumb} title={`${customerName} · ${t('docsTab')}`} />
      <div className="content">
        <div className="tabbar">
          <Link href={`/catalogs/partners/customers/${id}/360`}>{t('overviewTab')}</Link>
          <Link href={`/catalogs/partners/customers/${id}/360/documents`} className="is-active">
            {t('docsTabWithCount', { count: docCount })}
          </Link>
          <button type="button" className="tabbar-placeholder" disabled>
            {t('activityTab')}
          </button>
        </div>
        <Customer360Documents />
      </div>
    </>
  );
}
