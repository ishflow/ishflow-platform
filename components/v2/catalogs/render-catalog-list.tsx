import '@/configs';

import { V2Topbar } from '@/components/v2/shell/topbar';
import { type V2CatalogSlug, entityKeyFromCatalogSlug } from '@/lib/v2-shell/entity-slug-map';
import { requireTenantContext } from '@/platform/auth/current-context';
import { listRecordsPaged } from '@/platform/engine';
import { can } from '@/platform/engine/permissions';
import { type CatalogConfig, type Locale, getRegistry } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared/pick-label';
import { Plus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';

/**
 * Generic V2 catalog list shell. Mirror of `renderV2DocumentList` but for
 * catalog entities (Products, Customers, Suppliers, Warehouses, Currency,
 * Cash registers, Price types, Fixed assets — plus Phase 1 admin entities
 * like Roles, Members, Audit, FX rate).
 *
 * Behavior:
 * 1. Resolve slug → entity-key → config from registry.
 * 2. Resolve tenant; render empty when unauthenticated.
 * 3. Parse ?q=, ?page=, ?chip= from URL.
 * 4. Run loader via listRecordsPaged with the tenant AppContext.
 * 5. Render Topbar + chips + search + table OR invoice-card layout per DSL hint.
 *
 * @param slug         V2 catalog URL slug (one of V2CatalogSlug).
 * @param searchParams Next 16 resolved search params.
 */
export async function renderV2CatalogList({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locale = (await getLocale()) as Locale;

  const entityKey = entityKeyFromCatalogSlug(slug as V2CatalogSlug);
  if (!entityKey) {
    return (
      <>
        <V2Topbar breadcrumb="V2" title="Not found" subtitle={slug} />
        <div className="content" />
      </>
    );
  }
  const config = getRegistry().catalog[entityKey];
  if (!config) {
    return (
      <>
        <V2Topbar breadcrumb="V2" title="Not found" subtitle={entityKey} />
        <div className="content">
          <section className="card" style={{ padding: 24 }}>
            Catalog <code>{entityKey}</code> is not registered. Make sure its config is imported via{' '}
            <code>configs/index.ts</code>.
          </section>
        </div>
      </>
    );
  }

  const tc = await getTranslations('v2_catalogs.common');
  const tNav = await getTranslations('v2_nav');

  const q = stringParam(searchParams.q) ?? undefined;
  const pageNum = Math.max(1, Number(stringParam(searchParams.page) ?? '1') || 1);

  let data: { rows: Record<string, unknown>[]; total: number } = { rows: [], total: 0 };
  let canCreate = false;
  try {
    const ctx = await requireTenantContext();
    canCreate = can(ctx, config, 'create');
    const result = await listRecordsPaged(ctx, config, {
      search: q,
      page: pageNum,
      pageSize: 25,
    });
    data = { rows: result.rows, total: result.total };
  } catch {
    /* unauthenticated or no tenant — render empty list */
  }

  const pluralLabel =
    config.pluralLabel?.[locale] ??
    config.pluralLabel?.en ??
    config.label[locale] ??
    config.label.en;
  const catalogsLabel = tNav('catalogs.section.main');
  const newHref = `/catalogs/${slug}/new`;
  const detailHref = (id: string) => `/catalogs/${slug}/${id}`;
  const layout = config.list?.layout ?? 'table';
  const listOnly = config.list?.listOnly === true;

  return (
    <>
      <V2Topbar
        breadcrumb={`${catalogsLabel} / ${pluralLabel}`}
        title={pluralLabel}
        subtitle={tc('countSubtitle', { count: data.total })}
        actions={
          !listOnly && canCreate ? (
            <Link href={newHref} className="btn btn-primary btn-sm">
              <Plus size={14} strokeWidth={1.75} />
              {tc('new')}
            </Link>
          ) : null
        }
      />
      <div className="content">
        {layout === 'invoice-card' ? (
          <InvoiceCardLayoutPlaceholder
            rows={data.rows as Array<Record<string, unknown> & { id: string }>}
            detailHref={detailHref}
          />
        ) : (
          <TableLayout
            config={config}
            rows={data.rows as Array<Record<string, unknown> & { id: string }>}
            detailHref={detailHref}
            locale={locale}
            emptyLabel={tc('empty')}
          />
        )}
      </div>
    </>
  );
}

function stringParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function TableLayout({
  config,
  rows,
  detailHref,
  locale,
  emptyLabel,
}: {
  config: CatalogConfig;
  rows: Array<Record<string, unknown> & { id: string }>;
  detailHref: (id: string) => string;
  locale: Locale;
  emptyLabel: string;
}) {
  const columns = config.list?.columns ?? [];
  return (
    <section className="table-card">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{pickLabel(c.label, locale)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length || 1} className="dim" style={{ padding: 24 }}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c, i) => (
                  <td key={c.key}>
                    {i === 0 ? (
                      <a href={detailHref(row.id)}>{String(row[c.key] ?? '')}</a>
                    ) : (
                      String(row[c.key] ?? '')
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function InvoiceCardLayoutPlaceholder({
  rows,
  detailHref,
}: {
  rows: Array<Record<string, unknown> & { id: string }>;
  detailHref: (id: string) => string;
}) {
  // Phase 2 will replace this with the polished invoice-list component.
  // Foundation shell just renders the route + DB roundtrip correctly.
  return (
    <section className="card" style={{ padding: 16 }}>
      <strong style={{ display: 'block', marginBottom: 12 }}>Invoice-card layout (Phase 2)</strong>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {rows.map((row) => (
          <li key={row.id} style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <a href={detailHref(row.id)}>{row.id}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
