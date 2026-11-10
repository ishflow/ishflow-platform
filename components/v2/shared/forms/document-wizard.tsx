'use client';

import { resolveCustomerDefaults } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-customer-defaults';
import { resolveLinePrice } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-line-price';
import { resolveReturnFromInvoice } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-return-from-invoice';
import { StockChipRow } from '@/components/app/stock-chip-row';
import { BelowCostHint } from '@/components/v2/documents/below-cost-hint';
import { documentErrorMessage } from '@/components/v2/documents/document-error-message';
import { DeleteConfirmDialog } from '@/components/v2/shared/delete-confirm-dialog';
import { PlanLimitDialog, isPlanLimitError } from '@/components/v2/shared/plan-limit-dialog';
import { formatMoney } from '@/lib/format-money';
import { Link, useRouter } from '@/platform/i18n/navigation';
import type { FieldConfig, LineSectionConfig, Locale, LocalizedLabel } from '@/platform/metadata';
import type { ActionResult } from '@/platform/ui';
import { AlertTriangle, Check, Plus, Save, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Fragment, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { V2AutoField } from './auto-field';
import { WizardPartyContext } from './wizard-party-context';

/**
 * Plain-data subset of `DocumentConfig` that crosses the RSC boundary.
 * Skips `posting` (function map), `validators`, `permissions` so the
 * server can hand the descriptor to a client component without React
 * complaining about non-serializable props.
 */
export type V2DocumentDescriptor = {
  id: string;
  module: string;
  name: string;
  label: LocalizedLabel;
  pluralLabel?: LocalizedLabel;
  header: Record<string, FieldConfig>;
  lines?: Record<string, LineSectionConfig>;
  direction?: 'in' | 'out';
};

/**
 * Generic V2 document create/edit wizard.
 *
 * Mirrors V2EntityForm but for `defineDocument` configs — renders a header
 * form-grid plus one tabular line-array per `config.lines[<section>]`.
 *
 * Two submit modes:
 *  - "Save" → form posts with `__intent=save`, server routes to
 *    `createDocumentRecord` / `updateDocumentRecord` (draft).
 *  - "Save and post" → `__intent=post`, server routes to
 *    `createAndPostDocumentRecord` / `updateAndPostDocumentRecord`.
 *
 * Auto-price for sales lines (`section.lineBehavior === 'sales'`):
 *   header customer change → `resolveCustomerDefaults` fills `priceType`;
 *   line product change + customer + date → `resolveLinePrice` fills price
 *   unless the user has typed in it (`priceDirty`).
 *
 * Field-name convention: form keys match DSL field names directly so the
 * generic `submitDocumentAction` can parse FormData into the engine's value
 * shape without an extra rename layer.
 */
export function V2DocumentWizard({
  config,
  mode,
  slug,
  recordId,
  defaultValues = {},
  refDefaults = {},
  lineRefDefaults = {},
  listHref,
  submitAction,
  deleteActionByLocale,
  asideCards,
  topbarExtra,
  customSections,
  currency = 'USD',
  taxEnabled = false,
  taxRatePct = 0,
  readOnly = false,
}: {
  config: V2DocumentDescriptor;
  mode: 'create' | 'edit';
  slug: string;
  recordId?: string;
  defaultValues?: Record<string, unknown>;
  refDefaults?: Record<string, { id: string; label: string } | null>;
  lineRefDefaults?: Record<string, Array<Record<string, { id: string; label: string } | null>>>;
  listHref: string;
  submitAction: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  deleteActionByLocale?: (locale: string, slug: string, id: string) => Promise<ActionResult>;
  /** Right-column aside content (tips, attachments, etc). */
  asideCards?: ReactNode;
  /** Extra slot rendered in the top action bar's left cluster — e.g. an
   *  "Import from OCR" trigger or a "Quick add" button. */
  topbarExtra?: ReactNode;
  /** Extra sections rendered alongside the header fields. The key is opaque
   *  (used as React key); the value is either:
   *   - A bare `ReactNode`, rendered after the form-grid (legacy slot used
   *     for tip cards and aside extras).
   *   - `{ node, after }` — rendered inline inside the form-grid right after
   *     the named field. Used by the linked-invoices picker to slot under
   *     the customer/supplier row. */
  customSections?: Record<string, ReactNode | { node: ReactNode; after?: string }>;
  /** Currency for the receipt-totals widget. Defaults to USD. */
  currency?: string;
  /** VAT settings (admin.tax), resolved server-side. When off, no VAT row. */
  taxEnabled?: boolean;
  taxRatePct?: number;
  /** Permission-driven view-only: hide Save/Post and disable every field/line.
   *  Combined with the posted-doc lock so a user without write permission can
   *  inspect a draft without hitting a server-side Permission Denied. */
  readOnly?: boolean;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const tc = useTranslations('v2_catalogs.common');
  const tDocs = useTranslations('v2_documents.new');
  const tStickyBar = useTranslations('v2_documents.new.stickyBar');
  const tDoc = useTranslations('document');
  const tErr = useTranslations('v2_documents.errors');
  // Resolve raw server error keys (e.g. 'insufficientStock') to localized text.
  const errMsg = (k?: string | null) =>
    k ? documentErrorMessage({ tDoc, tErr }, k, k) : undefined;

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    submitAction,
    null,
  );
  const isEdit = mode === 'edit';

  const isPostedDoc = (defaultValues as { status?: string }).status === 'POSTED';
  // Posted docs are field-locked but still re-savable; a permission `readOnly`
  // additionally hides Save/Post. `viewOnly` covers field/line disabling.
  const viewOnly = readOnly || isPostedDoc;

  // Locate the header reference fields the auto-price hooks key off of.
  const headerFieldNames = useMemo(() => Object.keys(config.header), [config.header]);
  const customerFieldName = useMemo(
    () =>
      headerFieldNames.find((n) => {
        const f = config.header[n];
        if (!f || f.type !== 'reference') return false;
        return (
          (f.to.module === 'sales' || f.to.module === 'purchases') &&
          (f.to.name === 'customer' || f.to.name === 'supplier')
        );
      }),
    [headerFieldNames, config.header],
  );
  const dateFieldName = useMemo(
    () =>
      headerFieldNames.find((n) => {
        const f = config.header[n];
        return f?.type === 'date' || f?.type === 'datetime';
      }),
    [headerFieldNames, config.header],
  );

  // Track header reference selections live (for auto-price keying).
  const [refSelections, setRefSelections] = useState<Record<string, string | null>>(() => {
    const out: Record<string, string | null> = {};
    for (const [name, field] of Object.entries(config.header)) {
      if (field.type !== 'reference') continue;
      const v = defaultValues[name];
      out[name] = typeof v === 'string' ? v : null;
    }
    return out;
  });

  // Programmatically pushed reference selections — used to override the
  // RefCombobox's internal state when the wizard auto-fills a value (e.g.
  // priceType after a customer pick). Distinct from refSelections because
  // we need both the id (for auto-price keying) AND the display label
  // (for the picker UI).
  const [refControlledValues, setRefControlledValues] = useState<
    Record<string, { id: string; label: string } | null>
  >({});

  // Initial line state from defaultValues.lines.
  const lineSections = config.lines ?? {};
  // Mirror of `lineRefDefaults` prop in state so wizard effects (e.g. return
  // auto-fill) can push fresh product labels into the line ref pickers.
  const [lineRefDefaultsBySection, setLineRefDefaultsBySection] = useState<
    Record<string, Array<Record<string, { id: string; label: string } | null>>>
  >(() => ({ ...lineRefDefaults }));
  const [linesBySection, setLinesBySection] = useState<Record<string, LineRow[]>>(() => {
    const out: Record<string, LineRow[]> = {};
    const seedLines = (defaultValues.lines ?? {}) as Record<string, unknown>;
    let nextKey = 0;
    for (const [sectionKey, section] of Object.entries(lineSections)) {
      const incoming = (seedLines[sectionKey] as unknown[]) ?? [];
      if (incoming.length > 0) {
        out[sectionKey] = incoming.map((row) => {
          const r: LineRow = { __key: nextKey++ };
          for (const fname of Object.keys(section.fields)) {
            const v = (row as Record<string, unknown>)[fname];
            r[fname] = v == null ? '' : String(v);
          }
          r.__priceDirty = false;
          return r;
        });
      } else {
        out[sectionKey] = [emptyLine(section, nextKey++)];
      }
    }
    return out;
  });

  // On success, redirect.
  useEffect(() => {
    if (state?.ok) {
      router.push(listHref);
      router.refresh();
    }
  }, [state, router, listHref]);

  const formError = state && !state.ok ? state.formError : undefined;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const isPlanLimit = isPlanLimitError(formError);

  // Auto-price hooks (sales lineBehavior only).
  const salesSectionKey = useMemo(
    () => Object.keys(lineSections).find((k) => lineSections[k]?.lineBehavior === 'sales'),
    [lineSections],
  );
  const customerId = customerFieldName ? (refSelections[customerFieldName] ?? null) : null;
  const priceTypeFieldName = useMemo(
    () =>
      headerFieldNames.find((n) => {
        const f = config.header[n];
        if (!f || f.type !== 'reference') return false;
        return f.to.module === 'sales' && f.to.name === 'price_type';
      }),
    [headerFieldNames, config.header],
  );
  const priceTypeId = priceTypeFieldName ? (refSelections[priceTypeFieldName] ?? null) : null;

  // Return-doc auto-fill hooks. Mirrors the sales hook above but keyed on the
  // `originalInvoice` reference picking up a value: pulls counterparty +
  // warehouse + lines from the source invoice into the wizard's state.
  const returnSectionKey = useMemo(
    () =>
      Object.keys(lineSections).find((k) => lineSections[k]?.lineBehavior === 'returnFromInvoice'),
    [lineSections],
  );
  const originalInvoiceFieldName = useMemo(
    () =>
      headerFieldNames.find((n) => {
        const f = config.header[n];
        if (!f || f.type !== 'reference') return false;
        return (f.to.module === 'sales' || f.to.module === 'purchases') && f.to.name === 'invoice';
      }),
    [headerFieldNames, config.header],
  );
  const warehouseFieldName = useMemo(
    () =>
      headerFieldNames.find((n) => {
        const f = config.header[n];
        return f?.type === 'reference' && f.to.module === 'inventory' && f.to.name === 'warehouse';
      }),
    [headerFieldNames, config.header],
  );
  const originalInvoiceId = originalInvoiceFieldName
    ? (refSelections[originalInvoiceFieldName] ?? null)
    : null;

  // Mirror V2AutoField's datetime default: when the DSL declares `default: 'now'`
  // and the record has no persisted date, seed today's ISO date so the auto-price
  // resolver can fire on first interaction without waiting for a user click.
  const dateValue = ((): string => {
    if (!dateFieldName) return '';
    const v = defaultValues[dateFieldName];
    if (v != null && v !== '') {
      return typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
    }
    const dateField = config.header[dateFieldName];
    if (dateField && dateField.type === 'datetime' && dateField.default === 'now') {
      return new Date().toISOString().slice(0, 10);
    }
    return '';
  })();

  // priceType defaults from customer.
  useEffect(() => {
    if (!salesSectionKey) return;
    if (!customerFieldName || !priceTypeFieldName) return;
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      const r = await resolveCustomerDefaults({ customerId });
      if (cancelled) return;
      if (r?.defaultPriceType) {
        const id = r.defaultPriceType;
        const label = r.defaultPriceTypeLabel ?? id;
        setRefSelections((prev) => ({
          ...prev,
          [priceTypeFieldName]: id,
        }));
        setRefControlledValues((prev) => ({
          ...prev,
          [priceTypeFieldName]: { id, label },
        }));
      } else {
        // Customer has no default — clear any prior controlled selection so
        // the picker doesn't keep showing a stale value across switches.
        setRefControlledValues((prev) => ({
          ...prev,
          [priceTypeFieldName]: null,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, customerFieldName, priceTypeFieldName, salesSectionKey]);

  // Auto-resolve line prices.
  useEffect(() => {
    if (!salesSectionKey) return;
    if (!customerId) return;
    if (!dateValue) return;
    const rows = linesBySection[salesSectionKey] ?? [];
    const targets = rows
      .map((row, idx) => ({
        idx,
        productId: String(row.product ?? ''),
        dirty: row.__priceDirty === true,
      }))
      .filter((t) => t.productId && !t.dirty);
    if (targets.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        targets.map((t) =>
          resolveLinePrice({
            customerId,
            productId: t.productId,
            date: dateValue,
            priceTypeId,
          }).then((res) => ({ idx: t.idx, price: res?.price ?? null })),
        ),
      );
      if (cancelled) return;
      setLinesBySection((prev) => {
        const sectionRows = prev[salesSectionKey];
        if (!sectionRows) return prev;
        let changed = false;
        const next = sectionRows.map((row, i) => {
          const hit = results.find((r) => r.idx === i);
          if (!hit || hit.price == null) return row;
          if (row.__priceDirty) return row;
          const nextPrice = String(hit.price);
          if (row.price === nextPrice) return row;
          changed = true;
          return { ...row, price: nextPrice };
        });
        return changed ? { ...prev, [salesSectionKey]: next } : prev;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [salesSectionKey, customerId, priceTypeId, dateValue, linesBySection]);

  // Auto-fill lines + counterparty + warehouse when the user picks an
  // originalInvoice on a return doc. Guards via lastReturnInvoiceIdRef so
  // we only fire once per distinct invoice pick — re-renders triggered by
  // unrelated state changes (e.g. user edits a line) cannot re-clobber.
  const lastReturnInvoiceIdRef = useRef<string | null>(null);
  const originalInvoiceModule = useMemo<'sales' | 'purchases' | null>(() => {
    if (!originalInvoiceFieldName) return null;
    const f = config.header[originalInvoiceFieldName];
    if (!f || f.type !== 'reference') return null;
    return f.to.module === 'sales' || f.to.module === 'purchases' ? f.to.module : null;
  }, [originalInvoiceFieldName, config.header]);

  useEffect(() => {
    if (mode !== 'create') return;
    if (!returnSectionKey || !originalInvoiceId || !originalInvoiceModule) return;
    if (lastReturnInvoiceIdRef.current === originalInvoiceId) return;
    lastReturnInvoiceIdRef.current = originalInvoiceId;
    let cancelled = false;
    (async () => {
      const r = await resolveReturnFromInvoice({
        invoiceModule: originalInvoiceModule,
        invoiceId: originalInvoiceId,
      });
      if (cancelled || !r) return;

      if (customerFieldName) {
        const cf = customerFieldName;
        setRefSelections((prev) => ({ ...prev, [cf]: r.counterparty.id }));
        setRefControlledValues((prev) => ({
          ...prev,
          [cf]: { id: r.counterparty.id, label: r.counterparty.label },
        }));
      }
      if (warehouseFieldName) {
        const wf = warehouseFieldName;
        setRefSelections((prev) => ({ ...prev, [wf]: r.warehouse.id }));
        setRefControlledValues((prev) => ({
          ...prev,
          [wf]: { id: r.warehouse.id, label: r.warehouse.label },
        }));
      }
      setLinesBySection((prev) => {
        let key = 100000;
        return {
          ...prev,
          [returnSectionKey]: r.lines.map((l) => ({
            __key: key++,
            __priceDirty: true,
            product: l.product.id,
            quantity: String(l.quantity),
            price: String(l.price),
          })),
        };
      });
      setLineRefDefaultsBySection((prev) => ({
        ...prev,
        [returnSectionKey]: r.lines.map((l) => ({ product: l.product })),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    returnSectionKey,
    originalInvoiceId,
    originalInvoiceModule,
    customerFieldName,
    warehouseFieldName,
  ]);

  function addLine(sectionKey: string) {
    const section = lineSections[sectionKey];
    if (!section) return;
    setLinesBySection((prev) => {
      const list = prev[sectionKey] ?? [];
      const maxKey = list.reduce((m, r) => Math.max(m, r.__key), -1);
      return { ...prev, [sectionKey]: [...list, emptyLine(section, maxKey + 1)] };
    });
  }

  function removeLine(sectionKey: string, idx: number) {
    setLinesBySection((prev) => {
      const list = prev[sectionKey] ?? [];
      if (list.length <= 1) return prev;
      return { ...prev, [sectionKey]: list.filter((_, i) => i !== idx) };
    });
  }

  function updateLine(sectionKey: string, idx: number, patch: Partial<LineRow>) {
    setLinesBySection((prev) => {
      const list = prev[sectionKey] ?? [];
      return {
        ...prev,
        [sectionKey]: list.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
      };
    });
  }

  function onDelete() {
    if (!deleteActionByLocale || !recordId) return;
    deleteActionByLocale(locale, slug, recordId).then((r) => {
      if (r.ok) {
        router.push(listHref);
        router.refresh();
      }
    });
  }

  const visibleHeader = headerFieldNames
    .map((name) => [name, config.header[name]] as [string, FieldConfig])
    .filter(([, f]) => !f.hidden);

  const titleText =
    (defaultValues as { number?: string }).number ??
    (isEdit ? (recordId ?? '') : `${tc('new')} ${config.label[locale] ?? config.label.en}`);

  return (
    <WizardPartyContext.Provider value={{ partyId: customerId }}>
      <form action={formAction}>
        <input type="hidden" name="__locale" value={locale} />
        <input type="hidden" name="__slug" value={slug} />
        {isEdit && recordId ? <input type="hidden" name="__id" value={recordId} /> : null}
        <input type="hidden" name="__intent" value="save" id="v2-doc-intent" />

        <div className="action-bar">
          <div className="left">{topbarExtra}</div>
          <div className="right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href={listHref} className="btn btn-ghost">
              {isEdit ? tc('close') : tDocs('close')}
            </Link>
            {!readOnly && isEdit && deleteActionByLocale && recordId ? (
              <DeleteConfirmDialog
                title={tc('deleteConfirmTitle')}
                description={tc('deleteConfirmBody', { name: titleText })}
                onConfirm={onDelete}
                trigger={
                  <button type="button" className="btn btn-ghost" disabled={pending}>
                    <Trash2 size={14} strokeWidth={1.75} />
                    {tc('delete')}
                  </button>
                }
              />
            ) : null}
            {!readOnly ? (
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => setIntent('save')}
              >
                <Save size={14} strokeWidth={1.75} />
                {pending ? tc('saving') : tStickyBar('save')}
              </button>
            ) : null}
            {!viewOnly ? (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={pending}
                onClick={() => setIntent('post')}
              >
                <Check size={14} strokeWidth={1.75} />
                {pending ? tc('saving') : tStickyBar('savePost')}
              </button>
            ) : null}
          </div>
        </div>

        {formError && !isPlanLimit ? (
          <div className="field-error" style={{ marginBottom: 12 }}>
            <AlertTriangle size={12} strokeWidth={1.75} />
            {errMsg(formError)}
          </div>
        ) : null}
        {isPlanLimit ? <PlanLimitDialog token={state} /> : null}

        <div className="detail-grid">
          <section className="card">
            <div className="card-header">
              <div className="card-title">{tDocs('cardInfo')}</div>
            </div>
            <div className="form-grid">
              {visibleHeader.map(([name, field]) => (
                <Fragment key={name}>
                  <V2AutoField
                    name={name}
                    field={field}
                    locale={locale}
                    defaultValue={defaultValues[name]}
                    refDefaultSelected={refDefaults[name]}
                    refControlledValue={refControlledValues[name]}
                    fieldError={errMsg(fieldErrors?.[name]?.[0])}
                    disabled={viewOnly}
                    onRefChange={
                      field.type === 'reference'
                        ? (id) => {
                            setRefSelections((prev) => ({ ...prev, [name]: id }));
                            // User-driven pick wins over a prior programmatic
                            // selection — clear the controlled override so the
                            // picker stays in user-control until the next
                            // auto-fill event fires.
                            setRefControlledValues((prev) => {
                              if (!(name in prev)) return prev;
                              const next = { ...prev };
                              delete next[name];
                              return next;
                            });
                          }
                        : undefined
                    }
                  />
                  {customSections
                    ? Object.entries(customSections)
                        .filter(
                          ([, v]) => v && typeof v === 'object' && 'after' in v && v.after === name,
                        )
                        .map(([k, v]) => (
                          <Fragment key={`inline-${k}`}>{(v as { node: ReactNode }).node}</Fragment>
                        ))
                    : null}
                </Fragment>
              ))}
            </div>

            {customSections
              ? Object.entries(customSections)
                  .filter(([, v]) => !(v && typeof v === 'object' && 'after' in v))
                  .map(([key, node]) => (
                    <Fragment key={`custom-${key}`}>{node as ReactNode}</Fragment>
                  ))
              : null}

            {Object.entries(lineSections).map(([sectionKey, section]) => {
              const headerWarehouseId = warehouseFieldName
                ? (refSelections[warehouseFieldName] ?? null)
                : null;
              return (
                <LinesSection
                  key={sectionKey}
                  sectionKey={sectionKey}
                  section={section}
                  rows={linesBySection[sectionKey] ?? []}
                  refDefaultsList={lineRefDefaultsBySection[sectionKey]}
                  locale={locale}
                  fieldErrors={fieldErrors}
                  readOnly={viewOnly}
                  headerWarehouseId={headerWarehouseId}
                  onAddLine={() => addLine(sectionKey)}
                  onRemoveLine={(idx) => removeLine(sectionKey, idx)}
                  onUpdateLine={(idx, patch) => updateLine(sectionKey, idx, patch)}
                />
              );
            })}

            <ReceiptTotals
              lineSections={lineSections}
              linesBySection={linesBySection}
              locale={locale}
              currency={currency}
              taxEnabled={taxEnabled}
              taxRatePct={taxRatePct}
            />
          </section>

          {asideCards ? <aside className="sticky-rail">{asideCards}</aside> : null}
        </div>

        {/* Hidden inputs for header ref selections that need to stay in sync with
          our local state. RefCombobox already emits its own hidden input named
          after the field; we mirror it from refSelections via inline-render so
          the form's submitted FormData carries the current selection even if
          the user clears + re-picks. */}
      </form>
    </WizardPartyContext.Provider>
  );
}

type LineRow = {
  __key: number;
  __priceDirty?: boolean;
  [fieldName: string]: unknown;
};

function emptyLine(section: LineSectionConfig, key: number): LineRow {
  const r: LineRow = { __key: key, __priceDirty: false };
  for (const fname of Object.keys(section.fields)) {
    r[fname] = '';
  }
  return r;
}

function lineSectionHasRowTotal(section: LineSectionConfig): boolean {
  return 'quantity' in section.fields && 'price' in section.fields;
}

function lineRowTotal(row: LineRow): number {
  const q = Number(row.quantity ?? 0);
  const p = Number(row.price ?? 0);
  const t = q * p;
  return Number.isFinite(t) ? t : 0;
}

function setIntent(intent: 'save' | 'post') {
  const el = document.getElementById('v2-doc-intent') as HTMLInputElement | null;
  if (el) el.value = intent;
}

/**
 * Computes a subtotal across all sections that have both a `quantity`
 * (number) and a `price` (money) field, rendering the variant-9
 * receipt-totals widget when at least one such section has rows. Sections
 * without those fields contribute nothing — invoices and payments coexist.
 */
function ReceiptTotals({
  lineSections,
  linesBySection,
  locale,
  currency,
  taxEnabled,
  taxRatePct,
}: {
  lineSections: Record<string, LineSectionConfig>;
  linesBySection: Record<string, LineRow[]>;
  locale: Locale;
  currency: string;
  taxEnabled: boolean;
  taxRatePct: number;
}) {
  const t = useTranslations('v2_documents.new.totals');
  let subtotal = 0;
  let applicable = false;
  for (const [sectionKey, section] of Object.entries(lineSections)) {
    const hasQty = section.fields.quantity?.type === 'number';
    const hasPrice =
      section.fields.price?.type === 'money' || section.fields.price?.type === 'number';
    if (!hasQty || !hasPrice) continue;
    applicable = true;
    const rows = linesBySection[sectionKey] ?? [];
    for (const r of rows) {
      const q = Number(r.quantity);
      const p = Number(r.price);
      if (!Number.isFinite(q) || !Number.isFinite(p)) continue;
      subtotal += q * p;
    }
  }
  if (!applicable) return null;

  const fmt = (n: number, ccy: string) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: ccy,
      currencyDisplay: 'narrowSymbol',
    }).format(n);

  // Exclusive VAT, mirrors platform/engine/tax.ts computeVat. When tax is
  // disabled the VAT row is hidden entirely (no "VAT" text anywhere).
  const vat =
    taxEnabled && taxRatePct > 0 ? Math.round(subtotal * (taxRatePct / 100) * 100) / 100 : 0;
  const grand = subtotal + vat;

  return (
    <div className="receipt-totals" style={{ marginTop: 6 }}>
      <div className="row">
        <span className="lbl">{t('subtotal')}</span>
        <span className="val">{fmt(subtotal, currency)}</span>
      </div>
      {taxEnabled ? (
        <div className="row">
          <span className="lbl">{`${t('vat')} (${taxRatePct}%)`}</span>
          <span className="val">{fmt(vat, currency)}</span>
        </div>
      ) : null}
      <div className="row grand">
        <span className="lbl">{t('grand')}</span>
        <span className="val">{fmt(grand, currency)}</span>
      </div>
    </div>
  );
}

function LinesSection({
  sectionKey,
  section,
  rows,
  refDefaultsList,
  locale,
  fieldErrors,
  readOnly,
  headerWarehouseId,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}: {
  sectionKey: string;
  section: LineSectionConfig;
  rows: LineRow[];
  refDefaultsList?: Array<Record<string, { id: string; label: string } | null>>;
  locale: Locale;
  fieldErrors?: Record<string, string[]>;
  readOnly: boolean;
  headerWarehouseId?: string | null;
  onAddLine: () => void;
  onRemoveLine: (idx: number) => void;
  onUpdateLine: (idx: number, patch: Partial<LineRow>) => void;
}) {
  const tDocs = useTranslations('v2_documents.new');
  const tc = useTranslations('v2_catalogs.common');
  const tDoc = useTranslations('document');
  const tErr = useTranslations('v2_documents.errors');
  const fieldNames = Object.keys(section.fields);

  return (
    <>
      <div className="spacer" />
      <div className="card-header">
        <div className="card-title">
          {section.pluralLabel?.[locale] ?? section.pluralLabel?.en ?? tDocs('cardLines')}
        </div>
      </div>

      {fieldErrors?.lines ? (
        <div className="field-error" style={{ marginBottom: 8 }}>
          <AlertTriangle size={12} strokeWidth={1.75} />
          {documentErrorMessage({ tDoc, tErr }, fieldErrors.lines[0], fieldErrors.lines[0])}
        </div>
      ) : null}

      <table
        className="data is-compact v2-doc-lines"
        style={{ border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)' }}
      >
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            {fieldNames.map((fname) => {
              const f = section.fields[fname];
              if (!f) return null;
              const label = f.label[locale] ?? f.label.en;
              const align =
                f.type === 'number' || f.type === 'money' ? ('num' as const) : undefined;
              return (
                <th key={fname} className={align}>
                  {label}
                </th>
              );
            })}
            {lineSectionHasRowTotal(section) ? (
              <th className="num">{tDocs('lines.rowTotal')}</th>
            ) : null}
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <Fragment key={row.__key}>
              <tr>
                <td className="dim">{idx + 1}</td>
                {fieldNames.map((fname) => {
                  const f = section.fields[fname];
                  if (!f) return null;
                  const refDefault = refDefaultsList?.[idx]?.[fname] ?? null;
                  return (
                    <td
                      key={fname}
                      className={f.type === 'number' || f.type === 'money' ? 'num' : undefined}
                    >
                      <V2LineCell
                        name={`lines[${sectionKey}][${idx}].${fname}`}
                        field={f}
                        locale={locale}
                        value={row[fname]}
                        refDefault={refDefault}
                        disabled={readOnly}
                        onChange={(value, extra) => {
                          const patch: Partial<LineRow> = { [fname]: value };
                          // Mark price dirty whenever the user edits price OR
                          // unset it when product changes (so resolver re-runs).
                          if (fname === 'price' && extra?.userEdit) {
                            patch.__priceDirty = true;
                          }
                          if (fname === 'product') {
                            patch.__priceDirty = false;
                          }
                          onUpdateLine(idx, patch);
                        }}
                      />
                    </td>
                  );
                })}
                {lineSectionHasRowTotal(section) ? (
                  <td className="num dim">{formatMoney(lineRowTotal(row), locale)}</td>
                ) : null}
                <td>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="row-menu"
                      aria-label={tc('delete')}
                      onClick={() => onRemoveLine(idx)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  ) : null}
                </td>
              </tr>
              {section.lineBehavior === 'sales' && row.product ? (
                <tr className="line-meta-row">
                  <td />
                  <td colSpan={fieldNames.length + (lineSectionHasRowTotal(section) ? 2 : 1)}>
                    <SalesLineMeta
                      productId={String(row.product)}
                      warehouseId={headerWarehouseId ?? null}
                      price={String(row.price ?? '')}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!readOnly ? (
        <button type="button" className="btn btn-ghost btn-sm v2-doc-lines-add" onClick={onAddLine}>
          <Plus size={14} strokeWidth={1.75} />
          {tDocs('lines.addLine')}
        </button>
      ) : null}
    </>
  );
}

/**
 * Cell-level field renderer for lines. Owns the user-edit signal so the
 * parent wizard knows when a price was manually changed (priceDirty).
 */
function V2LineCell({
  name,
  field,
  locale,
  value,
  refDefault,
  disabled,
  onChange,
}: {
  name: string;
  field: FieldConfig;
  locale: Locale;
  value: unknown;
  refDefault?: { id: string; label: string } | null;
  disabled?: boolean;
  onChange: (value: string, extra?: { userEdit: boolean }) => void;
}) {
  // RefCombobox + V2DatePicker: re-use V2AutoField wrapping (passes change
  // through to formData). Render an inline label-less variant: hide the
  // label since the table header already says what the column is.
  if (
    field.type === 'reference' ||
    field.type === 'date' ||
    field.type === 'datetime' ||
    field.type === 'boolean'
  ) {
    return (
      <div className="v2-line-cell">
        <V2AutoField
          name={name}
          field={{ ...field, label: { en: '', ru: '', tr: '' }, required: false } as FieldConfig}
          locale={locale}
          defaultValue={value}
          refDefaultSelected={refDefault}
          disabled={disabled}
          onRefChange={
            field.type === 'reference' ? (id) => onChange(id ?? '', { userEdit: true }) : undefined
          }
        />
      </div>
    );
  }

  const v = value == null ? '' : String(value);
  if (field.type === 'number') {
    return (
      <input
        name={name}
        className="input"
        type="number"
        value={v}
        step="any"
        style={{ textAlign: 'right' }}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, { userEdit: true })}
      />
    );
  }
  if (field.type === 'money') {
    return (
      <input
        name={name}
        className="input mono"
        type="number"
        value={v}
        step="0.01"
        min="0"
        style={{ textAlign: 'right' }}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, { userEdit: true })}
      />
    );
  }
  return (
    <input
      name={name}
      className="input"
      type="text"
      value={v}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value, { userEdit: true })}
    />
  );
}

function SalesLineMeta({
  productId,
  warehouseId,
  price,
}: {
  productId: string;
  warehouseId: string | null;
  price: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-1">
      <StockChipRow productId={productId} />
      <BelowCostHint productId={productId} warehouseId={warehouseId} price={price} />
    </div>
  );
}
