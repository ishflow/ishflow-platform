import '@/configs';

import { V2EntityForm } from '@/components/v2/shared/forms';
import { V2Topbar } from '@/components/v2/shell/topbar';
import {
  type V2CatalogSlug,
  entityKeyFromCatalogSlug,
  listHrefForCatalogSlug,
  refEntityFromToken,
} from '@/lib/v2-shell/entity-slug-map';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { NotFoundError, PermissionDeniedError, getRecord } from '@/platform/engine';
import { can } from '@/platform/engine/permissions';
import { type CatalogConfig, type Locale, getRegistry } from '@/platform/metadata';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  archiveCatalogActionBySlug,
  cloneCatalogActionBySlug,
  deleteCatalogActionBySlug,
  submitCatalogAction,
} from './generic-catalog-actions';

/**
 * Render the "new record" page for any V2 catalog slug.
 *
 * Resolves the engine config from the slug, then mounts `V2EntityForm` in
 * create mode. Topbar uses the entity's `pluralLabel` for breadcrumb + a
 * locale-specific "Yeni …" title.
 */
export async function renderV2CatalogNew({
  slug,
  asideCards,
  defaultValues,
}: {
  slug: V2CatalogSlug;
  asideCards?: React.ReactNode;
  /**
   * Optional initial form values — typically derived from URL search params
   * by the calling page (e.g. price-types/new?kind=dynamic pre-fills the
   * kind discriminator so showIf-gated fields render immediately).
   */
  defaultValues?: Record<string, unknown>;
}) {
  const entityKey = entityKeyFromCatalogSlug(slug);
  if (!entityKey) notFound();

  const config = getRegistry().catalog[entityKey];
  if (!config) notFound();

  // Gate the create route: a user without write permission must never reach
  // the new-record form (the "New" button is already hidden for them; this
  // covers a direct URL hit) — 404 instead of a server-side Permission Denied.
  const ctx = await requireTenantContext();
  if (!can(ctx, config, 'create')) notFound();

  const locale = (await getLocale()) as Locale;
  const tc = await getTranslations('v2_catalogs.common');
  const tNav = await getTranslations('v2_nav');

  const entityLabel = config.label[locale] ?? config.label.en;
  const pluralLabel = config.pluralLabel?.[locale] ?? config.pluralLabel?.en ?? entityLabel;
  const catalogsLabel = tNav('catalogs.section.main');
  const listHref = listHrefForCatalogSlug(slug);

  return (
    <>
      <V2Topbar
        breadcrumb={`${catalogsLabel} / ${pluralLabel}`}
        title={`${tc('new')} ${entityLabel}`}
      />
      <div className="content">
        <V2EntityForm
          config={config}
          mode="create"
          slug={slug}
          listHref={listHref}
          submitAction={submitCatalogAction}
          asideCards={asideCards}
          defaultValues={defaultValues}
        />
      </div>
    </>
  );
}

/**
 * Render the "edit record" page for any V2 catalog slug.
 *
 * Fetches the record (tenant-scoped, RLS-enforced), then mounts
 * `V2EntityForm` in edit mode. Reference-field labels are pre-resolved
 * server-side so the RefCombobox renders the current selection without an
 * extra client roundtrip.
 */
export async function renderV2CatalogDetail({
  slug,
  id,
  asideCards,
}: {
  slug: V2CatalogSlug;
  id: string;
  asideCards?: React.ReactNode;
}) {
  const entityKey = entityKeyFromCatalogSlug(slug);
  if (!entityKey) notFound();

  const config = getRegistry().catalog[entityKey];
  if (!config) notFound();

  const ctx = await requireTenantContext();
  let record: Record<string, unknown>;
  try {
    record = await getRecord(ctx, config, id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof PermissionDeniedError) notFound();
    throw err;
  }

  const locale = (await getLocale()) as Locale;
  const tNav = await getTranslations('v2_nav');

  const entityLabel = config.label[locale] ?? config.label.en;
  const pluralLabel = config.pluralLabel?.[locale] ?? config.pluralLabel?.en ?? entityLabel;
  const catalogsLabel = tNav('catalogs.section.main');
  const displayField = config.displayField ?? Object.keys(config.fields)[0];
  // Prefer the DSL's `presentation(record)` function when present — lets
  // catalogs like sales.price_agreement render a composite label
  // (e.g. "PA-A1B2C3D4 · 2026-06-01") instead of a raw date string from
  // displayField alone.
  const displayValue = (() => {
    if (config.presentation) {
      try {
        const out = config.presentation(record);
        if (out && out.trim().length > 0) return out;
      } catch {
        // fall through to the displayField fallback below
      }
    }
    return displayField && displayField in record ? String(record[displayField] ?? id) : id;
  })();

  const refDefaults = await resolveReferenceDefaults(config, record, ctx.tenant.id);

  const listHref = listHrefForCatalogSlug(slug);

  const updatedAt = record.updatedAt;
  const lastEdited =
    updatedAt instanceof Date
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(updatedAt)
      : undefined;
  const isArchived = Boolean(record.deletedAt);

  // Permission-gate the affordances. A user with only `read` opens the record
  // view-only: fields disabled, no Save/Clone/Archive/Delete — and never a
  // "Permission Denied" on submit, because there is nothing to submit.
  const canEdit = can(ctx, config, 'update');
  const canDelete = can(ctx, config, 'delete');
  const canClone = can(ctx, config, 'create');

  return (
    <>
      <V2Topbar
        breadcrumb={`${catalogsLabel} / ${pluralLabel} / ${displayValue}`}
        title={displayValue}
      />
      <div className="content">
        <V2EntityForm
          config={config}
          mode="edit"
          slug={slug}
          recordId={id}
          defaultValues={record}
          refDefaults={refDefaults}
          listHref={listHref}
          submitAction={submitCatalogAction}
          deleteActionByLocale={canDelete ? deleteCatalogActionBySlug : undefined}
          cloneActionByLocale={canClone ? cloneCatalogActionBySlug : undefined}
          archiveActionByLocale={canDelete ? archiveCatalogActionBySlug : undefined}
          isArchived={isArchived}
          lastEdited={lastEdited}
          asideCards={asideCards}
          readOnly={!canEdit}
        />
      </div>
    </>
  );
}

/**
 * For every reference field on the config, look up the referenced record's
 * `displayField` so the RefCombobox can render the current selection. The
 * lookups are batched per target table (rare to have multiple refs to the
 * same table, but harmless if we do).
 */
async function resolveReferenceDefaults(
  config: CatalogConfig,
  record: Record<string, unknown>,
  tenantId: string,
): Promise<Record<string, { id: string; label: string } | null>> {
  const refs = Object.entries(config.fields).filter(([, f]) => f.type === 'reference');
  if (refs.length === 0) return {};

  return withTenant(tenantId, async (tx) => {
    const out: Record<string, { id: string; label: string } | null> = {};
    for (const [name, field] of refs) {
      if (field.type !== 'reference') continue;
      const value = record[name];
      if (!value || typeof value !== 'string') {
        out[name] = null;
        continue;
      }
      const refSlug = refEntityFromToken(field.to);
      const label = await lookupRefLabel(tx, refSlug, value);
      out[name] = label ? { id: value, label } : null;
    }
    return out;
  });
}

/**
 * Minimal label lookup per supported ref entity. Mirrors the search route
 * in `components/v2/shared/ref-combobox-actions.ts` but for a single id.
 * Unknown entities return null so the combobox shows just the id.
 */
async function lookupRefLabel(
  tx: unknown,
  refSlug: string | null,
  id: string,
): Promise<string | null> {
  if (!refSlug) return null;
  // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed on tx generic
  const bag = tx as any;
  try {
    switch (refSlug) {
      case 'warehouse': {
        const row = await bag.catalog_inventory_warehouse.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      case 'customer': {
        const row = await bag.catalog_sales_customer.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      case 'supplier': {
        const row = await bag.catalog_purchases_supplier.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      case 'product': {
        const row = await bag.catalog_inventory_product.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      case 'product-category': {
        const row = await bag.catalog_inventory_product_category.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      case 'product-group': {
        const row = await bag.catalog_inventory_product_group.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      case 'price-type': {
        const row = await bag.catalog_sales_price_type.findUnique({
          where: { id },
          select: { name: true },
        });
        return row?.name ?? null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
