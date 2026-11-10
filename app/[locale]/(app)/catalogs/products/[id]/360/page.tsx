import { Product360Overview } from '@/components/v2/catalogs/products/product-360-overview';
import { Product360Tabbar } from '@/components/v2/catalogs/products/product-360-tabbar';
import { ProductHero, ProductHeroEditCta } from '@/components/v2/catalogs/products/product-hero';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsProduct360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('v2_catalogs.products.product360');
  const tNav = await getTranslations('v2_nav');

  let prod: {
    name: string;
    code: string | null;
    barcode: string | null;
    isArchived: boolean;
    stock: number;
  } | null = null;
  try {
    const ctx = await requireTenantContext();
    prod = await withTenant(ctx.tenant.id, async (tx) => {
      const r = await tx.catalog_inventory_product.findUnique({
        where: { id },
        select: { name: true, code: true, barcode: true, deletedAt: true },
      });
      if (!r) return null;
      // Tenant-wide stock — sum of all warehouse income minus expense.
      const movements = await tx.movement_inventory_stock_balance.findMany({
        where: { product: id, active: true },
        select: { kind: true, quantity: true },
      });
      const stock = movements.reduce(
        (s, m) => s + (m.kind === 'income' ? m.quantity : -m.quantity),
        0,
      );
      return {
        name: r.name,
        code: r.code,
        barcode: r.barcode,
        isArchived: Boolean(r.deletedAt),
        stock,
      };
    });
  } catch {
    prod = null;
  }
  if (!prod) notFound();

  const breadcrumb = `${tNav('catalogs.section.main')} / ${t('breadcrumbCrumb')} / ${prod.name} / ${t('viewLabel')}`;
  const subtitle = prod.isArchived ? t('statusArchived') : t('statusActive');
  const stockBadge = t('stockBadge', { count: prod.stock });
  const spec = prod.code ?? '—';

  return (
    <>
      <V2Topbar breadcrumb={breadcrumb} title={prod.name} subtitle={subtitle} />
      <div className="content">
        <ProductHero
          sku={prod.code ?? id.slice(0, 8)}
          name={prod.name}
          spec={spec}
          stockBadge={stockBadge}
          barcode={prod.barcode ?? undefined}
          trailing={<ProductHeroEditCta editHref={`/catalogs/products/${id}`} />}
        />
        <div className="spacer" />
        <Product360Tabbar productId={id} active="general" />
        <Product360Overview />
      </div>
    </>
  );
}
