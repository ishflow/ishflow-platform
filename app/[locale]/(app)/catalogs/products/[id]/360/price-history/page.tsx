import { Product360Tabbar } from '@/components/v2/catalogs/products/product-360-tabbar';
import {
  ProductHero,
  ProductHeroBackToOverview,
} from '@/components/v2/catalogs/products/product-hero';
import { ProductPriceHistory } from '@/components/v2/catalogs/products/product-price-history';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsProduct360PriceHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('v2_catalogs.products.product360');
  const tNav = await getTranslations('v2_nav');

  let prod: { name: string; code: string | null; stock: number } | null = null;
  try {
    const ctx = await requireTenantContext();
    prod = await withTenant(ctx.tenant.id, async (tx) => {
      const r = await tx.catalog_inventory_product.findUnique({
        where: { id },
        select: { name: true, code: true },
      });
      if (!r) return null;
      const movements = await tx.movement_inventory_stock_balance.findMany({
        where: { product: id, active: true },
        select: { kind: true, quantity: true },
      });
      const stock = movements.reduce(
        (s, m) => s + (m.kind === 'income' ? m.quantity : -m.quantity),
        0,
      );
      return { name: r.name, code: r.code, stock };
    });
  } catch {
    prod = null;
  }
  if (!prod) notFound();

  const breadcrumb = `${tNav('catalogs.section.main')} / ${t('breadcrumbCrumb')} / ${prod.name} / 360 / ${t('priceHistoryTab')}`;

  return (
    <>
      <V2Topbar breadcrumb={breadcrumb} title={`${prod.name} · ${t('priceHistoryTab')}`} />
      <div className="content">
        <ProductHero
          sku={prod.code ?? id.slice(0, 8)}
          name={prod.name}
          spec={prod.code ?? '—'}
          stockBadge={t('stockBadge', { count: prod.stock })}
          size="sm"
          trailing={<ProductHeroBackToOverview href={`/catalogs/products/${id}/360`} />}
        />
        <div className="spacer" />
        <Product360Tabbar productId={id} active="priceHistory" />
        <ProductPriceHistory />
      </div>
    </>
  );
}
