import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { informationRegisterSlice } from '@/platform/engine/information-register-query';
import { getProductAvgCost } from '@/platform/engine/pricing';
import { getRegistry } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import {
  type PriceTypeColumn,
  PricingMatrixClient,
  type PricingMatrixRow,
} from './pricing-matrix-client';

export async function PricingMatrix() {
  const { tenant } = await requireTenantContext();
  const stockRegister = getRegistry().accumulationRegister['inventory.stock_balance'];
  const priceRegister = getRegistry().informationRegister['inventory.product_price'];

  const { rows, priceTypes } = await withTenant(tenant.id, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed here
    const anyTx = tx as any;

    const priceTypesRaw: Array<{
      id: string;
      name: string;
      kind: string;
      markupPct: unknown;
      basePriceType: string | null;
      isDefault: boolean | null;
    }> = await anyTx.catalog_sales_price_type.findMany({
      where: { deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const products: Array<{ id: string; name: string }> =
      await anyTx.catalog_inventory_product.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

    // Slice the register at "today" — gives one row per (product, priceType) tuple at-or-before now.
    const today = new Date();
    const slice = priceRegister
      ? ((await informationRegisterSlice(tx, priceRegister, {}, today)) as Array<{
          product: string;
          priceType: string;
          price: number | string;
        }>)
      : [];
    const priceByKey = new Map<string, number>();
    for (const r of slice) {
      priceByKey.set(`${r.product}::${r.priceType}`, Number(r.price));
    }

    const matrixRows: PricingMatrixRow[] = [];
    for (const p of products) {
      const cost = stockRegister ? (await getProductAvgCost(tx, stockRegister, p.id)).cost : 0;
      matrixRows.push({
        productId: p.id,
        productName: p.name,
        liveCost: cost,
        pricesByType: Object.fromEntries(
          priceTypesRaw.map((pt) => {
            const stored = priceByKey.get(`${p.id}::${pt.id}`);
            if (pt.kind === 'static') return [pt.id, stored ?? null];
            // dynamic: derive from base if a base price exists, otherwise
            // fall back to the live avg cost — matches `pricing.ts:resolvePrice`
            // Layer 2 (`live-markup`) so the matrix preview never diverges
            // from the price the sales wizard actually charges.
            if (pt.kind === 'dynamic') {
              const markup =
                pt.markupPct === null || pt.markupPct === undefined ? 0 : Number(pt.markupPct);
              if (pt.basePriceType) {
                const base = priceByKey.get(`${p.id}::${pt.basePriceType}`);
                return [
                  pt.id,
                  base !== undefined ? Math.round(base * (1 + markup) * 100) / 100 : null,
                ];
              }
              return [pt.id, cost > 0 ? Math.round(cost * (1 + markup) * 100) / 100 : null];
            }
            return [pt.id, null];
          }),
        ),
      });
    }

    const priceTypeCols: PriceTypeColumn[] = priceTypesRaw.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      markupPct: p.markupPct === null || p.markupPct === undefined ? null : Number(p.markupPct),
      isDefault: p.isDefault === true,
    }));

    return { rows: matrixRows, priceTypes: priceTypeCols };
  });

  const t = await getTranslations('pricingMatrix');
  return (
    <PricingMatrixClient
      rows={rows}
      priceTypes={priceTypes}
      t={{
        title: t('title'),
        product: t('product'),
        liveCost: t('liveCost'),
        empty: t('empty'),
        editPrices: t('editPrices'),
      }}
    />
  );
}
