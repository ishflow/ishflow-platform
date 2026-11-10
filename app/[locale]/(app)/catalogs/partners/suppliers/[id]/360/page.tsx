import { Supplier360 } from '@/components/v2/catalogs/partners/supplier-360';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsSupplier360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('v2_catalogs.partners.supplier360');
  const tNav = await getTranslations('v2_nav');

  let record: { name: string; isArchived: boolean } | null = null;
  try {
    const ctx = await requireTenantContext();
    record = await withTenant(ctx.tenant.id, async (tx) => {
      const r = await tx.catalog_purchases_supplier.findUnique({
        where: { id },
        select: { name: true, deletedAt: true },
      });
      if (!r) return null;
      return { name: r.name, isArchived: Boolean(r.deletedAt) };
    });
  } catch {
    record = null;
  }
  if (!record) notFound();

  const breadcrumb = `${tNav('catalogs.section.main')} / ${t('breadcrumbCrumb')} / ${record.name} / ${t('viewLabel')}`;
  const subtitle = record.isArchived ? t('statusArchived') : t('statusActive');

  return (
    <>
      <V2Topbar breadcrumb={breadcrumb} title={record.name} subtitle={subtitle} />
      <div className="content">
        <Supplier360 id={id} name={record.name} />
      </div>
    </>
  );
}
