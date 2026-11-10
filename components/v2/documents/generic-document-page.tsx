import '@/configs';

import { type V2DocumentDescriptor, V2DocumentWizard } from '@/components/v2/shared/forms';
import { V2Topbar } from '@/components/v2/shell/topbar';
import {
  type V2DocumentSlug,
  documentKeyFromSlug,
  listHrefForDocumentSlug,
  sectionLabelKeyForSlug,
} from '@/lib/v2-shell/document-slug-map';
import { refEntityFromToken } from '@/lib/v2-shell/entity-slug-map';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { NotFoundError, PermissionDeniedError, getDocument } from '@/platform/engine';
import { can } from '@/platform/engine/permissions';
import { resolveTaxSettings } from '@/platform/engine/tax';
import { type DocumentConfig, type Locale, getRegistry } from '@/platform/metadata';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { deleteDocumentActionBySlug, submitDocumentAction } from './generic-document-actions';

/**
 * Render `/(documents|purchases)/<slug>/new` via the generic shell.
 * `asideCards` + `topbarExtra` slots accept variant-9 polish widgets the
 * caller wants to keep (tips, attachments, OCR trigger).
 */
export async function renderV2DocumentNew({
  slug,
  asideCards,
  topbarExtra,
  customSections,
  prefill,
}: {
  slug: V2DocumentSlug;
  asideCards?: ReactNode;
  topbarExtra?: ReactNode;
  customSections?: Record<string, ReactNode | { node: ReactNode; after?: string }>;
  /** Seed the form with values + ref labels — used by per-row "new payment"
   *  shortcuts to land in a half-filled wizard. */
  prefill?: {
    defaultValues?: Record<string, unknown>;
    refDefaults?: Record<string, { id: string; label: string } | null>;
  };
}) {
  const docKey = documentKeyFromSlug(slug);
  if (!docKey) notFound();

  const config = getRegistry().document[docKey];
  if (!config) notFound();

  const ctx = await requireTenantContext();
  // Gate the create route — a user without write permission must not reach the
  // new-document wizard (the "New" button is already hidden for them).
  if (!can(ctx, config, 'create')) notFound();
  const tax = ctx.tenant
    ? await withTenant(ctx.tenant.id, (tx) => resolveTaxSettings(tx))
    : { enabled: false, ratePct: 0 };
  const locale = (await getLocale()) as Locale;
  const tc = await getTranslations('v2_catalogs.common');
  const tNav = await getTranslations('v2_nav');

  const entityLabel = config.label[locale] ?? config.label.en;
  const pluralLabel = config.pluralLabel?.[locale] ?? config.pluralLabel?.en ?? entityLabel;
  const sectionLabel = tNav(`documents.section.${sectionLabelKeyForSlug(slug)}`);
  const listHref = listHrefForDocumentSlug(slug);

  return (
    <>
      <V2Topbar
        breadcrumb={`${sectionLabel} / ${pluralLabel}`}
        title={`${tc('new')} ${entityLabel}`}
      />
      <div className="content">
        <V2DocumentWizard
          config={toDescriptor(config)}
          mode="create"
          slug={slug}
          defaultValues={prefill?.defaultValues}
          refDefaults={prefill?.refDefaults}
          listHref={listHref}
          submitAction={submitDocumentAction}
          asideCards={asideCards}
          topbarExtra={topbarExtra}
          customSections={customSections}
          currency={ctx.tenant?.currency ?? 'USD'}
          taxEnabled={tax.enabled}
          taxRatePct={tax.ratePct}
        />
      </div>
    </>
  );
}

/**
 * Render `/(documents|purchases)/<slug>/[id]` via the generic shell.
 * Fetches the record + line rows, pre-resolves reference labels for the
 * header AND every line section so RefCombobox renders current selections.
 */
export async function renderV2DocumentDetail({
  slug,
  id,
  asideCards,
  topbarExtra,
  customSections,
}: {
  slug: V2DocumentSlug;
  id: string;
  asideCards?: ReactNode;
  topbarExtra?: ReactNode;
  customSections?: Record<string, ReactNode | { node: ReactNode; after?: string }>;
}) {
  const docKey = documentKeyFromSlug(slug);
  if (!docKey) notFound();

  const config = getRegistry().document[docKey];
  if (!config) notFound();

  const ctx = await requireTenantContext();
  let record: Record<string, unknown>;
  try {
    record = await getDocument(ctx, config, id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof PermissionDeniedError) notFound();
    throw err;
  }

  const locale = (await getLocale()) as Locale;
  const tNav = await getTranslations('v2_nav');
  const entityLabel = config.label[locale] ?? config.label.en;
  const pluralLabel = config.pluralLabel?.[locale] ?? config.pluralLabel?.en ?? entityLabel;
  const sectionLabel = tNav(`documents.section.${sectionLabelKeyForSlug(slug)}`);

  const { refDefaults, lineRefDefaults } = await resolveAllRefDefaults(
    config,
    record,
    ctx.tenant.id,
  );

  const titleText = (record as { number?: string }).number ?? `${entityLabel} ${id.slice(0, 8)}`;
  const listHref = listHrefForDocumentSlug(slug);

  // Permission gate: a read-only user opens the document view-only (no Save/
  // Post/Delete, fields + lines disabled) instead of hitting Permission Denied.
  const canEdit = can(ctx, config, 'update');
  const canDelete = can(ctx, config, 'delete');
  const tax = ctx.tenant
    ? await withTenant(ctx.tenant.id, (tx) => resolveTaxSettings(tx))
    : { enabled: false, ratePct: 0 };

  return (
    <>
      <V2Topbar breadcrumb={`${sectionLabel} / ${pluralLabel} / ${titleText}`} title={titleText} />
      <div className="content">
        <V2DocumentWizard
          config={toDescriptor(config)}
          mode="edit"
          slug={slug}
          recordId={id}
          defaultValues={record}
          refDefaults={refDefaults}
          lineRefDefaults={lineRefDefaults}
          listHref={listHref}
          submitAction={submitDocumentAction}
          deleteActionByLocale={canDelete ? deleteDocumentActionBySlug : undefined}
          readOnly={!canEdit}
          asideCards={asideCards}
          topbarExtra={topbarExtra}
          customSections={customSections}
          currency={ctx.tenant?.currency ?? 'USD'}
          taxEnabled={tax.enabled}
          taxRatePct={tax.ratePct}
        />
      </div>
    </>
  );
}

/**
 * Strip the non-serializable bits (`posting`, `validators`, `permissions`,
 * `presentation`, `icon`) so the descriptor can cross the RSC → client
 * boundary into V2DocumentWizard. Mirrors V2DocumentDescriptor exactly.
 */
function toDescriptor(config: DocumentConfig): V2DocumentDescriptor {
  return {
    id: config.id,
    module: config.module,
    name: config.name,
    label: config.label,
    pluralLabel: config.pluralLabel,
    header: config.header,
    lines: config.lines,
    direction: config.direction,
  };
}

/**
 * Resolve labels for every reference field on header + each line section's
 * fields so the RefCombobox renders current selections without a client
 * lookup round-trip. Returns null for ref fields with no value.
 */
async function resolveAllRefDefaults(
  config: DocumentConfig,
  record: Record<string, unknown>,
  tenantId: string,
): Promise<{
  refDefaults: Record<string, { id: string; label: string } | null>;
  lineRefDefaults: Record<string, Array<Record<string, { id: string; label: string } | null>>>;
}> {
  return withTenant(tenantId, async (tx) => {
    const refDefaults: Record<string, { id: string; label: string } | null> = {};
    for (const [name, field] of Object.entries(config.header)) {
      if (field.type !== 'reference') continue;
      const value = record[name];
      if (typeof value !== 'string' || !value) {
        refDefaults[name] = null;
        continue;
      }
      const label = await lookupLabel(tx, refEntityFromToken(field.to), value);
      refDefaults[name] = label ? { id: value, label } : null;
    }

    const lineRefDefaults: Record<
      string,
      Array<Record<string, { id: string; label: string } | null>>
    > = {};
    if (config.lines) {
      const recordLines = (record.lines ?? {}) as Record<string, unknown>;
      for (const [sectionKey, section] of Object.entries(config.lines)) {
        const rows = (recordLines[sectionKey] as Array<Record<string, unknown>>) ?? [];
        const sectionRefs: Array<Record<string, { id: string; label: string } | null>> = [];
        for (const row of rows) {
          const rowRefs: Record<string, { id: string; label: string } | null> = {};
          for (const [fname, fcfg] of Object.entries(section.fields)) {
            if (fcfg.type !== 'reference') continue;
            const value = row[fname];
            if (typeof value !== 'string' || !value) {
              rowRefs[fname] = null;
              continue;
            }
            const label = await lookupLabel(tx, refEntityFromToken(fcfg.to), value);
            rowRefs[fname] = label ? { id: value, label } : null;
          }
          sectionRefs.push(rowRefs);
        }
        lineRefDefaults[sectionKey] = sectionRefs;
      }
    }

    return { refDefaults, lineRefDefaults };
  });
}

async function lookupLabel(
  tx: unknown,
  refSlug: string | null,
  id: string,
): Promise<string | null> {
  if (!refSlug) return null;
  // biome-ignore lint/suspicious/noExplicitAny: prisma delegate isn't typed on tx generic
  const bag = tx as any;
  try {
    switch (refSlug) {
      case 'warehouse':
        return (
          (
            await bag.catalog_inventory_warehouse.findUnique({
              where: { id },
              select: { name: true },
            })
          )?.name ?? null
        );
      case 'customer':
        return (
          (
            await bag.catalog_sales_customer.findUnique({
              where: { id },
              select: { name: true },
            })
          )?.name ?? null
        );
      case 'supplier':
        return (
          (
            await bag.catalog_purchases_supplier.findUnique({
              where: { id },
              select: { name: true },
            })
          )?.name ?? null
        );
      case 'product':
        return (
          (
            await bag.catalog_inventory_product.findUnique({
              where: { id },
              select: { name: true },
            })
          )?.name ?? null
        );
      case 'price-type':
        return (
          (
            await bag.catalog_sales_price_type.findUnique({
              where: { id },
              select: { name: true },
            })
          )?.name ?? null
        );
      default:
        return null;
    }
  } catch {
    return null;
  }
}
