import {
  PricingList,
  type PricingListRow,
} from '@/components/v2/catalogs/price-types/pricing-list';
import { V2ListPager } from '@/components/v2/shell/list-pager';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { DEFAULT_PAGE_SIZE, pageOffset, parsePage } from '@/lib/list/pagination';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getLocale, getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function V2CatalogsPricingListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const t = await getTranslations('v2_catalogs.priceTypes.pricing.list');
  const tCommon = await getTranslations('v2_catalogs.common.list');
  const tNav = await getTranslations('v2_nav');
  const locale = await getLocale();

  let rows: PricingListRow[] = [];
  let counts = { all: 0, posted: 0, saved: 0 };

  try {
    const ctx = await requireTenantContext();
    const result = await withTenant(ctx.tenant.id, async (tx) => {
      const where = { deletedAt: null };
      const [docs, allC, postedC, savedC] = await Promise.all([
        tx.document_inventory_price_setting.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: pageOffset(page),
          take: DEFAULT_PAGE_SIZE,
          select: { id: true, number: true, status: true, date: true, priceType: true },
        }),
        tx.document_inventory_price_setting.count({ where }),
        tx.document_inventory_price_setting.count({ where: { ...where, status: 'POSTED' } }),
        tx.document_inventory_price_setting.count({
          where: { ...where, status: { not: 'POSTED' } },
        }),
      ]);
      const cnt = { all: allC, posted: postedC, saved: savedC };
      const priceTypeIds = Array.from(new Set(docs.map((d) => d.priceType)));
      const ptRows = priceTypeIds.length
        ? await tx.catalog_sales_price_type.findMany({
            where: { id: { in: priceTypeIds } },
            select: { id: true, name: true },
          })
        : [];
      const ptMap = new Map(ptRows.map((p) => [p.id, p.name]));

      const lineSums = docs.length
        ? await tx.documentLine_inventory_price_setting_items.findMany({
            where: { documentId: { in: docs.map((d) => d.id) } },
            select: { documentId: true },
          })
        : [];
      const lineCount = new Map<string, number>();
      for (const l of lineSums) lineCount.set(l.documentId, (lineCount.get(l.documentId) ?? 0) + 1);

      return { docs, ptMap, lineCount, counts: cnt };
    });

    const fmtDate = (d: Date) =>
      new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        d,
      );

    rows = result.docs.map((d) => ({
      id: d.id,
      no: d.number,
      status: d.status === 'POSTED' ? 'posted' : 'saved',
      date: fmtDate(d.date),
      priceType: result.ptMap.get(d.priceType) ?? d.priceType.slice(0, 8),
      count: result.lineCount.get(d.id) ?? 0,
    }));
    counts = result.counts;
  } catch {
    rows = [];
  }

  return (
    <>
      <V2Topbar
        breadcrumb={`${tNav('catalogs.section.main')} / ${t('breadcrumbCrumb')}`}
        title={t('title')}
        subtitle={t('subtitle', { count: counts.all })}
      />
      <div className="content">
        <PricingList
          rows={rows}
          counts={counts}
          i18n={{
            chip: {
              all: tCommon('all'),
              posted: t('chip.posted'),
              saved: t('chip.saved'),
            },
            searchPlaceholder: t('searchPlaceholder'),
            searchAria: t('searchAria'),
            filter: t('filter'),
            export: tCommon('export'),
            newSetting: t('newSetting'),
            actions: tCommon('actions'),
            statusPosted: t('chip.posted'),
            statusSaved: t('chip.saved'),
            col: {
              no: t('col.no'),
              status: t('col.status'),
              date: t('col.date'),
              priceType: t('col.priceType'),
              count: t('col.count'),
            },
            footer: (shown, total) => tCommon('footer', { shown, total }),
          }}
        />
        <V2ListPager total={counts.all} page={page} />
      </div>
    </>
  );
}
