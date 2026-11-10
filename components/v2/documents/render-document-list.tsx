import { V2Topbar } from '@/components/v2/shell/topbar';
import { formatMoney } from '@/lib/format-money';
import { documentKeyFromSlug } from '@/lib/v2-shell/document-slug-map';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { can } from '@/platform/engine/permissions';
import { resolveTaxSettings } from '@/platform/engine/tax';
import {
  type FieldConfig,
  type Locale,
  type ReferenceFieldConfig,
  getRegistry,
} from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { getLocale, getTranslations } from 'next-intl/server';
import { GenericDocumentListTable, type GenericRow } from './generic-document-list';

/**
 * Generic V2 document list. Renders a V2 topbar + filter chips + table for
 * ANY engine-registered document. Used by 30+ stub list pages so they all
 * share the same UX as the bespoke sales-invoice list without copying its
 * sales-specific columns (warehouse / price-type).
 *
 * Per-row partner column is derived from the doc's DSL header — first
 * `reference` field that isn't `currency` / `fxRate` / `warehouse` — and
 * resolved through the catalog's `displayField` in a single batched lookup.
 * Per-row amount is taken from `header.amount` when present, otherwise from
 * summed line items (when `lines.items.price` * `quantity` is computable),
 * otherwise '—'.
 */
export async function renderV2DocumentList(slug: string) {
  const docKey = documentKeyFromSlug(slug);
  if (!docKey) {
    return (
      <>
        <V2Topbar breadcrumb="V2" title={slug} />
        <div className="content">
          <section className="card" style={{ padding: 24 }}>
            Unknown document slug: {slug}
          </section>
        </div>
      </>
    );
  }

  const config = getRegistry().document[docKey];
  if (!config) {
    return (
      <>
        <V2Topbar breadcrumb="V2" title={slug} />
        <div className="content">
          <section className="card" style={{ padding: 24 }}>
            Document <code>{docKey}</code> is not registered. Make sure its config is imported via
            <code>configs/index.ts</code>.
          </section>
        </div>
      </>
    );
  }

  const t = await getTranslations('v2_documents.list');
  const locale = (await getLocale()) as Locale;
  const pluralLabel =
    config.pluralLabel?.[locale] ??
    config.pluralLabel?.en ??
    config.label[locale] ??
    config.label.en ??
    slug;

  // Identify the primary partner reference field (skip currency / fxRate /
  // warehouse / cash-register / bank-account internals — the first remaining
  // reference is conventionally the counterparty: customer / supplier / etc.).
  const SKIP_PARTNER_FIELDS = new Set([
    'currency',
    'fxRate',
    'warehouse',
    'fromWarehouse',
    'toWarehouse',
    'cashReg',
    'fromCashReg',
    'toCashReg',
    'bankAcct',
    'fromBankAcct',
    'toBankAcct',
  ]);
  const headerEntries = Object.entries(config.header ?? {}) as Array<[string, FieldConfig]>;
  const primaryRefEntry = headerEntries.find(
    ([k, v]) => !SKIP_PARTNER_FIELDS.has(k) && v.type === 'reference',
  ) as [string, ReferenceFieldConfig] | undefined;
  const primaryRefField = primaryRefEntry?.[0];
  const primaryRefTarget = primaryRefEntry?.[1].to; // { kind, module, name }

  const hasAmountColumn = Boolean(
    headerEntries.find(([k, v]) => k === 'amount' && (v.type === 'money' || v.type === 'number')),
  );

  let tenantId = '';
  let currency = 'USD';
  let canCreate = false;
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant?.id ?? '';
    currency = ctx.tenant?.currency ?? 'USD';
    canCreate = can(ctx, config, 'create');
  } catch {
    // Unauthenticated / no tenant — render an empty list rather than crash.
  }

  type Row = {
    id: string;
    number: string;
    date: Date;
    status: string;
    partnerId: string;
    amount: number | null;
  };

  let rows: Row[] = [];
  let counts = { all: 0, posted: 0, saved: 0, failed: 0 };
  const partnerNames = new Map<string, string>();

  if (tenantId) {
    const delegateName = `document_${config.module}_${config.name}`;
    const linesDelegateName = `documentLine_${config.module}_${config.name}_items`;
    const partnerDelegateName = primaryRefTarget
      ? `catalog_${primaryRefTarget.module}_${primaryRefTarget.name}`
      : null;

    await withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as Record<
        string,
        { findMany: (a: unknown) => Promise<Array<Record<string, unknown>>> } | undefined
      >;
      const delegate = bag[delegateName];
      if (!delegate) return;

      let raw: Array<Record<string, unknown>> = [];
      try {
        raw = await delegate.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
      } catch {
        // Schema drift between config and DB — fall through to empty list.
        return;
      }

      rows = raw.map((r) => {
        const dateValue = r.date;
        const partnerId = primaryRefField ? String(r[primaryRefField] ?? '') : '';
        const amount = hasAmountColumn && r.amount != null ? Number(r.amount) : null;
        return {
          id: String(r.id),
          number: String(r.number ?? ''),
          date: dateValue instanceof Date ? dateValue : new Date(String(dateValue)),
          status: String(r.status ?? 'SAVED'),
          partnerId,
          amount,
        };
      });

      // Optional: sum line items for an amount column when the header doesn't
      // carry one. Best-effort — silently no-op if the lines delegate / fields
      // don't exist for this doc.
      if (!hasAmountColumn && rows.length > 0) {
        const linesDelegate = bag[linesDelegateName];
        if (linesDelegate) {
          const ids = rows.map((r) => r.id);
          try {
            const lineRows = await linesDelegate.findMany({
              where: { documentId: { in: ids } },
            });
            const sumByDoc = new Map<string, number>();
            for (const l of lineRows) {
              const docId = String(l.documentId ?? '');
              const qty = typeof l.quantity === 'number' ? l.quantity : Number(l.quantity ?? 0);
              const price = l.price != null ? Number(l.price) : 0;
              if (!docId) continue;
              sumByDoc.set(docId, (sumByDoc.get(docId) ?? 0) + qty * price);
            }
            rows = rows.map((r) => {
              const sum = sumByDoc.get(r.id);
              return sum != null && sum > 0 ? { ...r, amount: sum } : r;
            });
          } catch {
            // Best-effort — leave amounts null.
          }
        }
      }

      // Show GROSS (subtotal + VAT) for VAT-bearing documents when tax is on,
      // so the list amount matches the document detail's gross total (the detail
      // already adds VAT). Gated on the doc actually posting to finance.vat, so
      // non-VAT docs (payments, transfers…) are never touched; a no-op when tax
      // is disabled (the default).
      if (config.posting?.['finance.vat'] && rows.some((r) => r.amount != null)) {
        const tax = await resolveTaxSettings(tx as unknown as Prisma.TransactionClient);
        if (tax.enabled && tax.ratePct > 0) {
          const factor = 1 + tax.ratePct / 100;
          rows = rows.map((r) =>
            r.amount != null ? { ...r, amount: Math.round(r.amount * factor * 100) / 100 } : r,
          );
        }
      }

      // Resolve partner display names via batched catalog lookup.
      if (partnerDelegateName && rows.length > 0) {
        const partnerDelegate = bag[partnerDelegateName];
        if (partnerDelegate) {
          const ids = Array.from(new Set(rows.map((r) => r.partnerId).filter(Boolean)));
          if (ids.length > 0) {
            try {
              const partnerRecords = await partnerDelegate.findMany({
                where: { id: { in: ids } },
              });
              const partnerConfig = primaryRefTarget
                ? getRegistry().catalog[`${primaryRefTarget.module}.${primaryRefTarget.name}`]
                : undefined;
              const displayField = partnerConfig?.displayField ?? 'name';
              for (const rec of partnerRecords) {
                const rid = typeof rec.id === 'string' ? rec.id : null;
                if (!rid) continue;
                const label = rec[displayField];
                if (typeof label === 'string' && label.length > 0) {
                  partnerNames.set(rid, label);
                }
              }
            } catch {
              // Partner labels stay empty — UI shows short uuid fallback.
            }
          }
        }
      }
    });

    counts = {
      all: rows.length,
      posted: rows.filter((r) => r.status === 'POSTED').length,
      saved: rows.filter((r) => r.status === 'SAVED').length,
      failed: rows.filter((r) => r.status === 'FAILED').length,
    };
  }

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);

  const fmtMoney = (n: number) => formatMoney(n, locale, currency);

  const tableRows: GenericRow[] = rows.map((r) => ({
    id: r.id,
    number: r.number,
    date: r.date.toISOString(),
    dateFormatted: fmtDate(r.date),
    status: r.status,
    partnerName: r.partnerId
      ? (partnerNames.get(r.partnerId) ?? `${r.partnerId.slice(0, 8)}…`)
      : '—',
    amount: r.amount != null ? fmtMoney(r.amount) : '—',
  }));

  const pluralLower = pluralLabel.toLocaleLowerCase(locale);

  return (
    <>
      <V2Topbar
        breadcrumb={pluralLabel}
        title={pluralLabel}
        subtitle={t('subtitleGeneric', { count: counts.all })}
      />
      <div className="content">
        <GenericDocumentListTable
          slug={slug}
          newHref={canCreate ? `/documents/${slug}/new` : undefined}
          rows={tableRows}
          counts={counts}
          labels={{
            colNo: t('col.no'),
            colDate: t('col.date'),
            colStatus: t('col.status'),
            colPartner: t('col.partner'),
            colAmount: t('col.amount'),
            statusAll: t('status.all'),
            statusPosted: t('status.posted'),
            statusSaved: t('status.saved'),
            statusFailed: t('status.failed'),
            searchPh: t('searchGeneric'),
            filterLabel: t('filter'),
            exportLabel: t('export'),
            newLabel: t('newGeneric', { what: pluralLower }),
            emptyState: t('emptyState'),
          }}
        />
      </div>
    </>
  );
}
