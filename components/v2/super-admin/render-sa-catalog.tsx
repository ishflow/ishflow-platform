import '@/configs';

import { V2Topbar } from '@/components/v2/shell/topbar';
import {
  type ResolvedRowAction,
  SaRowActionsCell,
} from '@/components/v2/super-admin/sa-row-actions-cell';
import { requireTenantContext } from '@/platform/auth/current-context';
import { isPlatformAdmin } from '@/platform/auth/platform-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { type Locale, getRegistry } from '@/platform/metadata';
import { pickLabel } from '@/platform/metadata/shared/pick-label';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Generic V2 super-admin catalog shell. Cross-tenant variant of
 * renderV2CatalogList:
 *   - runs the config's loader inside withBypass
 *   - gates on isPlatformAdmin (env allow-list or owner role)
 *   - parses ?q=, ?chip=, ?page= from URL
 *
 * Note: `cfg.requiredPermission` is the documented intent of which permission
 * a future role-based gate will assert. Faz A uses `isPlatformAdmin` instead
 * (env `SUPER_ADMIN_CLERK_USER_IDS` allow-list or `owner` role fallback);
 * full permission wiring lands when the seed grows a super-admin role.
 *
 * Used by super_admin.tenant; future: super_admin.user, super_admin.audit, etc.
 */
export async function renderV2SuperAdminCatalog({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations('v2_super_admin.shell');
  const locale = (await getLocale()) as Locale;

  const cfg = getRegistry().superAdminCatalog[slug];
  if (!cfg) {
    return (
      <>
        <V2Topbar breadcrumb="V2 / Super admin" title={t('notFound.title')} subtitle={slug} />
        <div className="content">
          <section className="card" style={{ padding: 16 }}>
            <strong>{t('notFound.title')}</strong>
            <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>
              {slug}
            </div>
          </section>
        </div>
      </>
    );
  }

  // Permission gate
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    notFound();
  }
  if (!isPlatformAdmin(ctx)) {
    notFound();
  }

  // URL parsing
  const q = stringParam(searchParams.q) ?? undefined;
  const chipParam = stringParam(searchParams.chip) ?? undefined;
  const page = Math.max(1, Number(stringParam(searchParams.page) ?? '1') || 1);
  const pageSize = 25;

  // Cross-tenant load
  const { rows, total } = await withBypass((tx) =>
    cfg.loader({ tx, search: q, chip: chipParam, page, pageSize }),
  );

  const titleLabel = pickLabel(cfg.label, locale);
  const pluralLabel = cfg.pluralLabel ? pickLabel(cfg.pluralLabel, locale) : titleLabel;
  const columns = cfg.list?.columns ?? [];
  const chips = cfg.list?.chips ?? [];
  const rowActions = cfg.list?.rowActions ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Only catalogs with a real detail page set `list.detailHref`. List-only
  // catalogs (audit, support, billing, mobile, …) leave it undefined so the
  // first column renders as plain text instead of a link that 404s.
  const detailHref = cfg.list?.detailHref;

  // Resolve per-row actions to client-friendly shape: pick locale labels,
  // extract hidden form fields, bake slug-match value into the dialog.
  function resolveRowActions(row: (typeof rows)[number]): ResolvedRowAction[] {
    if (rowActions.length === 0) return [];
    const resolved: ResolvedRowAction[] = [];
    const fallbackCancel = { en: 'Cancel', ru: 'Отмена', tr: 'İptal' } as const;
    for (const a of rowActions) {
      if (a.visibleWhen && !a.visibleWhen(row)) continue;
      const hidden: Record<string, string> = {};
      for (const [field, fn] of Object.entries(a.hiddenFieldsFromRow)) {
        hidden[field] = fn(row);
      }
      resolved.push({
        key: a.key,
        label: pickLabel(a.label, locale),
        icon: a.icon,
        variant: a.variant,
        action: a.action,
        hiddenFields: hidden,
        cancelLabel: pickLabel(a.dialog.cancel ?? fallbackCancel, locale),
        dialog: {
          type: a.dialog.type,
          title: pickLabel(a.dialog.title, locale),
          description: pickLabel(a.dialog.description, locale),
          confirmLabel: pickLabel(a.dialog.confirm, locale),
          pendingLabel: a.dialog.pending
            ? pickLabel(a.dialog.pending, locale)
            : pickLabel(a.dialog.confirm, locale),
          destructive: a.dialog.destructive,
          slugMatch: a.dialog.type === 'slugConfirm' ? hidden.confirmSlug : undefined,
          confirmTextLabel: a.dialog.confirmInputLabel
            ? pickLabel(a.dialog.confirmInputLabel, locale)
            : undefined,
          inputName: a.dialog.inputName,
          inputLabel: a.dialog.inputLabel ? pickLabel(a.dialog.inputLabel, locale) : undefined,
          placeholder: a.dialog.placeholder ? pickLabel(a.dialog.placeholder, locale) : undefined,
          required: a.dialog.required,
          maxLength: a.dialog.maxLength,
          options: a.dialog.options,
          emptyLabel: a.dialog.empty ? pickLabel(a.dialog.empty, locale) : undefined,
        },
      });
    }
    return resolved;
  }

  const resolvedActionsByRowId = new Map<string, ResolvedRowAction[]>();
  if (rowActions.length > 0) {
    for (const row of rows) {
      resolvedActionsByRowId.set(row.id, resolveRowActions(row));
    }
  }
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (chipParam) params.set('chip', chipParam);
    if (page > 1) params.set('page', String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    // When all params clear, return '?' (not '') so the chip's anchor actually
    // navigates to the bare path. Empty href makes <a> a no-op in the browser.
    return s ? `?${s}` : '?';
  };

  return (
    <>
      <V2Topbar
        breadcrumb={`Super admin / ${pluralLabel}`}
        title={pluralLabel}
        subtitle={t('countSubtitle', { count: total })}
      />
      <div className="content">
        <section className="card" style={{ padding: 12 }}>
          <form method="get" style={{ marginBottom: 12 }}>
            {chipParam ? <input type="hidden" name="chip" value={chipParam} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder={t('searchPlaceholder')}
              style={{ width: '100%', padding: '6px 10px' }}
            />
          </form>

          {chips.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {chips.map((c) => (
                <Link
                  key={c.key}
                  href={buildHref({ chip: c.key === 'all' ? undefined : c.key, page: undefined })}
                  className={`btn btn-sm ${(chipParam ?? 'all') === c.key ? 'btn-primary' : ''}`}
                >
                  {pickLabel(c.label, locale)}
                </Link>
              ))}
            </div>
          ) : null}

          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label ? pickLabel(c.label, locale) : c.key}</th>
                ))}
                {rowActions.length > 0 ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, columns.length + (rowActions.length > 0 ? 1 : 0))}
                    className="dim"
                    style={{ padding: 24 }}
                  >
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c, i) => (
                      <td key={c.key}>
                        {i === 0 && detailHref ? (
                          <a href={detailHref(row.id)}>{formatCell(row[c.key])}</a>
                        ) : (
                          formatCell(row[c.key])
                        )}
                      </td>
                    ))}
                    {rowActions.length > 0 ? (
                      <td style={{ textAlign: 'right' }}>
                        <SaRowActionsCell actions={resolvedActionsByRowId.get(row.id) ?? []} />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              {page > 1 ? (
                <Link href={buildHref({ page: String(page - 1) })} className="btn btn-sm">
                  ← {t('prev')}
                </Link>
              ) : null}
              <span className="dim" style={{ fontSize: 12 }}>
                {t('pageOf', { page, total: totalPages })}
              </span>
              {page < totalPages ? (
                <Link href={buildHref({ page: String(page + 1) })} className="btn btn-sm">
                  {t('next')} →
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

function stringParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function formatCell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}
