'use client';

import { resolveCustomerDefaults } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-customer-defaults';
import { resolveWarehouseDefaults } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-warehouse-defaults';
import { WarehouseStockPanel } from '@/components/app/warehouse-stock-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { buildZodSchema } from '@/platform/engine/zod-schema';
import type { CatalogConfig, FieldConfig, LineSectionConfig, Locale } from '@/platform/metadata';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useTransition } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AutoField } from './auto-field';
import { LineFieldArray } from './line-field-array';

/**
 * Detect the first visible header reference field that points at the inventory
 * warehouse catalog. Returns the field name or null. Pure — exported for tests.
 */
export function findWarehouseFieldName(fields: Record<string, FieldConfig>): string | null {
  for (const [name, f] of Object.entries(fields)) {
    if (f.hidden || f.formHidden) continue;
    if (f.type !== 'reference') continue;
    if (f.to.module === 'inventory' && f.to.name === 'warehouse') return name;
  }
  return null;
}

export type ActionResult =
  | { ok: true; data: Record<string, unknown>; redirectTo?: string }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string[]>;
      /**
       * Soft, recoverable warning (e.g. duplicate name). The form shows a
       * confirm prompt and re-submits with `__forceDuplicate=1` to proceed.
       * Distinct from `formError` (a hard failure). QA M5 (design D6).
       */
      warning?: string;
    };

export type EntityFormMode = 'save' | 'saveAndClose' | 'postAndClose';

export type EntityFormHandle = {
  submit: (mode: EntityFormMode) => void;
  isDirty: () => boolean;
  /** Pass a field name to get that field's value; omit to get all form values. */
  getFieldValue: (name?: string) => unknown;
  /** Reset the form baseline. Pass new values to update defaults; omit to reset to original defaults. */
  reset: (values?: Record<string, unknown>) => void;
};

export type EntityFormProps = {
  config: CatalogConfig;
  lines?: Record<string, LineSectionConfig>;
  locale: Locale;
  defaultValues?: Record<string, unknown>;
  /** Either provide cancelHref (Link nav) or onCancel (in-place close, e.g. dialog). */
  cancelHref?: string;
  cancelLabel: string;
  onCancel?: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<ActionResult>;
  /**
   * Optional secondary submit handler. When provided alongside
   * submitAltLabel + savingAltLabel, a second button is rendered that
   * runs this handler instead of onSubmit (used for "Save & Post"
   * document flows).
   */
  onSubmitAlt?: (values: Record<string, unknown>) => Promise<ActionResult>;
  /** When set, success skips router.push(redirectTo) and invokes the callback instead. */
  onSuccess?: (data: Record<string, unknown>, mode: EntityFormMode) => void;
  /** Called whenever react-hook-form's dirty flag flips. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Called whenever the submit transition flips pending state. */
  onPendingChange?: (pending: boolean) => void;
  submitLabel: string;
  savingLabel: string;
  submitAltLabel?: string;
  savingAltLabel?: string;
  savedMessage: string;
  /** When false, the form body omits the built-in submit row. Callers that use EntityCover pass false. */
  renderActions?: boolean;
  /**
   * When present, every header field NOT in this list is rendered disabled,
   * and every LineFieldArray is rendered readOnly. Used by EntityCover to lock
   * posted documents while still allowing specific fields to be edited.
   */
  readOnlyExcept?: string[];
  /**
   * Individual header field names to render as disabled. Additive with
   * readOnlyExcept. Used for URL-driven field locks like `?kind=` on
   * sales.price_type.
   */
  lockedFields?: string[];
  /** Tenant currency for balance badge display on customer/supplier fields. */
  currency?: string;
  /**
   * Optional rail rendered in the right column next to the form. Stacks
   * below WarehouseStockPanel when both are present; on its own forces the
   * 2-column grid so the rail is visible without scrolling. Use for the
   * AttachmentsPanel on doc create/edit so file upload stays in view as the
   * user fills out the form, instead of being buried under the line table.
   */
  rightRail?: React.ReactNode;
};

/**
 * Metadata-driven create/edit form. Uses react-hook-form directly with
 * zodResolver. Field layout is delegated to AutoField; this component owns
 * the submit lifecycle (pending transition, server error surfacing, toast +
 * redirect).
 */
export const EntityForm = forwardRef<EntityFormHandle, EntityFormProps>(function EntityForm(
  {
    config,
    lines,
    locale,
    defaultValues,
    cancelHref,
    cancelLabel,
    onCancel,
    onSubmit,
    onSubmitAlt,
    onSuccess,
    onDirtyChange,
    onPendingChange,
    submitLabel,
    savingLabel,
    submitAltLabel,
    savingAltLabel,
    savedMessage,
    renderActions = true,
    readOnlyExcept,
    lockedFields,
    currency,
    rightRail,
  },
  ref,
) {
  const schema = buildZodSchema(config, lines);
  const router = useRouter();
  // Server actions return formError as a translation key (e.g.
  // "priceType.errors.markupRequiredForDynamic"). Resolve via the root
  // translator; if the key doesn't exist next-intl returns the key itself,
  // so passing arbitrary strings is safe.
  const tRoot = useTranslations();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? applyDisplayTransforms(defaultValues, config, lines)
      : emptyDefaults(config, lines),
  });
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<null | 'primary' | 'alt'>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Watch sales-invoice header fields so any child `LineFieldArray` with
  // `lineBehavior === 'sales'` can debounce-resolve auto-prices off the
  // (customer, date) pair. Scoped to header names `customer`/`date`; catalogs
  // and non-sales documents simply ignore the returned `salesContext`.
  const salesCustomerId = form.watch('customer') as string | null | undefined;
  const salesDate = form.watch('date') as string | null | undefined;
  const salesPriceTypeId = form.watch('priceType') as string | null | undefined;
  const salesWarehouseId = form.watch('warehouse') as string | null | undefined;

  // Auto-fill `priceType` header from customer.defaultPriceType. Refreshes on
  // EVERY customer change (so picking a different customer mid-edit reflows
  // every line price downstream), but respects two guards:
  //   1. priceTypeIsDirty — user manually picked a price type, don't override.
  //   2. resolvedCustomerRef — start tracked from the customer present on
  //      mount so an existing invoice's saved priceType isn't blown away on
  //      first render. Subsequent customer changes always re-resolve.
  const priceTypeIsDirty = form.formState.dirtyFields.priceType === true;
  const resolvedCustomerRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (resolvedCustomerRef.current === undefined) {
      // First effect tick — capture whatever customer is on mount so we don't
      // overwrite an already-saved priceType for an existing record.
      resolvedCustomerRef.current = salesCustomerId ?? null;
      return;
    }
    if (resolvedCustomerRef.current === (salesCustomerId ?? null)) return;
    resolvedCustomerRef.current = salesCustomerId ?? null;
    if (priceTypeIsDirty) return;
    if (!salesCustomerId) {
      // Customer cleared — drop the auto-filled priceType so the field shows
      // its placeholder again instead of staying glued to the prior customer.
      form.setValue('priceType', '', { shouldDirty: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await resolveCustomerDefaults({ customerId: salesCustomerId });
      if (cancelled) return;
      if (res?.defaultPriceType) {
        form.setValue('priceType', res.defaultPriceType, { shouldDirty: false });
      } else {
        // No default on the new customer — clear so SalesLineExtras falls
        // back to the tenant default rather than reusing the previous
        // customer's price type.
        form.setValue('priceType', '', { shouldDirty: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [salesCustomerId, priceTypeIsDirty, form]);

  // Auto-fill warehouse header on mount for single-warehouse tenants.
  const warehouseFieldName = findWarehouseFieldName(config.fields);
  const warehouseValue = warehouseFieldName
    ? (form.watch(warehouseFieldName) as string | null | undefined)
    : null;
  const warehouseIsDirty = warehouseFieldName
    ? form.formState.dirtyFields[warehouseFieldName] === true
    : false;
  useEffect(() => {
    if (!warehouseFieldName) return;
    if (warehouseIsDirty) return;
    if (warehouseValue) return;
    let cancelled = false;
    (async () => {
      const res = await resolveWarehouseDefaults();
      if (cancelled) return;
      if (res.warehouseId) {
        form.setValue(warehouseFieldName, res.warehouseId, { shouldDirty: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseFieldName, warehouseIsDirty, warehouseValue, form]);

  // Ref guards against double-fire between the click handler and any
  // concurrent form-submit path (Enter, shadcn Button slot weirdness).
  const dispatchingRef = useRef(false);
  // Records which mode the caller asked for so onSuccess can report it.
  // Primary form submits without a caller-specified mode fall back to 'saveAndClose'
  // (matches EntityCover's Yaz ve kapat primary).
  const modeRef = useRef<EntityFormMode | null>(null);

  const runSubmit = (
    handler: (values: Record<string, unknown>) => Promise<ActionResult>,
    which: 'primary' | 'alt',
  ) =>
    form.handleSubmit((values) => {
      if (dispatchingRef.current) return;
      dispatchingRef.current = true;
      setMode(which);
      setFormError(null);
      const transformed = applySaveTransforms(values, config, lines);
      startTransition(async () => {
        try {
          const result = await handler(transformed);
          if (result.ok) {
            toast.success(savedMessage);
            const activeMode: EntityFormMode =
              which === 'alt' ? 'postAndClose' : (modeRef.current ?? 'saveAndClose');
            if (onSuccess) {
              onSuccess(result.data, activeMode);
              return;
            }
            if (result.redirectTo) router.push(result.redirectTo);
            return;
          }
          if (result.formError) setFormError(result.formError);
          if (result.fieldErrors) {
            for (const [name, messages] of Object.entries(result.fieldErrors)) {
              const message = messages[0];
              if (message) form.setError(name, { message });
            }
          }
        } finally {
          dispatchingRef.current = false;
          setMode(null);
          modeRef.current = null;
        }
      });
    });

  const handlePrimary = runSubmit(onSubmit, 'primary');
  const handleAlt = onSubmitAlt
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        modeRef.current = 'postAndClose';
        void runSubmit(onSubmitAlt, 'alt')();
      }
    : null;

  const showAltButton = Boolean(onSubmitAlt && submitAltLabel && savingAltLabel && handleAlt);

  // `runSubmit` is stable inside a single render pass; we intentionally close
  // over the current `handlePrimary` / `onSubmitAlt` via closure so the handle
  // always dispatches the latest submit handler.
  const runAltRef = useRef<typeof runSubmit>(runSubmit);
  runAltRef.current = runSubmit;
  useImperativeHandle(
    ref,
    () => ({
      submit: (m) => {
        modeRef.current = m;
        if (m === 'postAndClose' && onSubmitAlt) {
          void runAltRef.current(onSubmitAlt, 'alt')();
        } else {
          void handlePrimary();
        }
      },
      isDirty: () => form.formState.isDirty,
      getFieldValue: (name?: string) => form.getValues(name as string),
      reset: (values?: Record<string, unknown>) => {
        if (values !== undefined) form.reset(values);
        else form.reset();
      },
    }),
    [handlePrimary, onSubmitAlt, form.formState.isDirty, form.getValues, form.reset],
  );

  const dirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  // price_type kind-driven visibility: basePriceType + markupPct only when
  // kind === 'dynamic'. Other catalogs are unaffected.
  const priceTypeKind = form.watch('kind') as string | undefined;
  const isPriceTypeConfig = config.id === 'sales.price_type';
  const shouldHidePriceTypeField = (fieldName: string): boolean => {
    if (!isPriceTypeConfig) return false;
    if (fieldName !== 'basePriceType' && fieldName !== 'markupPct') return false;
    return priceTypeKind !== 'dynamic';
  };

  const headerFields = (
    <div className="flex max-w-2xl flex-col gap-4">
      {Object.entries(config.fields)
        .filter(([name, f]) => !f.hidden && !f.formHidden && !shouldHidePriceTypeField(name))
        .map(([name, f]) => (
          <AutoField
            key={name}
            name={name}
            field={f}
            locale={locale}
            disabled={
              (readOnlyExcept !== undefined && !readOnlyExcept.includes(name)) ||
              (lockedFields?.includes(name) ?? false)
            }
            currency={currency}
          />
        ))}
    </div>
  );

  const lineSections = lines
    ? Object.entries(lines).map(([sectionKey, section]) => (
        <LineFieldArray
          key={sectionKey}
          sectionKey={sectionKey}
          section={section}
          locale={locale}
          readOnly={readOnlyExcept !== undefined}
          salesContext={
            section.lineBehavior === 'sales'
              ? {
                  customerId: salesCustomerId ?? null,
                  date: salesDate ?? null,
                  priceTypeId: salesPriceTypeId ?? null,
                  warehouseId: salesWarehouseId ?? null,
                }
              : undefined
          }
        />
      ))
    : null;

  const actions = renderActions ? (
    <div className="flex items-center gap-2 pt-2">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending && mode === 'primary' ? savingLabel : submitLabel}
      </Button>
      {showAltButton && (
        <Button type="button" disabled={pending} onClick={handleAlt ?? undefined}>
          {pending && mode === 'alt' ? savingAltLabel : submitAltLabel}
        </Button>
      )}
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      ) : cancelHref ? (
        <Link href={cancelHref} className={buttonVariants({ variant: 'ghost' })}>
          {cancelLabel}
        </Link>
      ) : null}
    </div>
  ) : null;

  return (
    <FormProvider {...form}>
      <form onSubmit={handlePrimary} className="flex flex-col gap-6">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{translateFormError(tRoot, formError)}</AlertDescription>
          </Alert>
        )}
        {(warehouseFieldName || rightRail) && !readOnlyExcept ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="flex min-w-0 flex-col gap-6">
              {headerFields}
              {lineSections}
              {actions}
            </div>
            <div className="flex flex-col gap-4 lg:sticky lg:top-4">
              {warehouseFieldName ? (
                <WarehouseStockPanel watchFieldName={warehouseFieldName} />
              ) : null}
              {rightRail}
            </div>
          </div>
        ) : (
          <>
            {headerFields}
            {lineSections}
            {actions}
          </>
        )}
      </form>
    </FormProvider>
  );
});

/**
 * Best-effort translation of server-returned `formError`. Action layers return
 * dotted i18n keys (e.g. `priceType.errors.markupRequiredForDynamic`); when
 * the key resolves we render the translation, otherwise we render the raw
 * string so the user still sees something. We only attempt lookup for strings
 * that look like keys (contain a dot and no whitespace).
 */
function translateFormError(t: ReturnType<typeof useTranslations>, raw: string): string {
  if (!raw.includes('.') || /\s/.test(raw)) return raw;
  try {
    const translated = t(raw);
    return translated && translated !== raw ? translated : raw;
  } catch {
    return raw;
  }
}

/**
 * Resolve a named display transform to its function. Named transforms travel
 * across the RSC boundary as strings; the actual function lives here on the
 * client. Returns null when the name is unknown (unexpected) or absent.
 */
function resolveDisplayTransform(name: string | undefined): ((v: unknown) => unknown) | null {
  if (name === 'percentFraction') return (v) => (v == null ? v : Number(v) * 100);
  return null;
}

/**
 * Resolve a named save transform. Mirror of resolveDisplayTransform.
 */
function resolveSaveTransform(name: string | undefined): ((v: unknown) => unknown) | null {
  if (name === 'percentFraction') {
    return (v) => (v === null || v === '' || v === undefined ? null : Number(v) / 100);
  }
  return null;
}

/**
 * Walk the config + line sections and apply each number field's named display
 * transform to the matching value in `values`. Pure — returns a new record.
 * Used to hydrate form state from the DB representation (e.g. NUMERIC(5,4)
 * fraction → percent).
 */
function applyDisplayTransforms(
  values: Record<string, unknown>,
  config: CatalogConfig,
  lines?: Record<string, LineSectionConfig>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...values };
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.type !== 'number') continue;
    const fn = resolveDisplayTransform(f.transform);
    if (!fn || !(name in next)) continue;
    next[name] = fn(next[name]);
  }
  if (lines && next.lines && typeof next.lines === 'object') {
    const nextLines: Record<string, unknown> = { ...(next.lines as Record<string, unknown>) };
    for (const [sectionKey, section] of Object.entries(lines)) {
      const rows = nextLines[sectionKey];
      if (!Array.isArray(rows)) continue;
      nextLines[sectionKey] = rows.map((row) => {
        if (!row || typeof row !== 'object') return row;
        const nextRow: Record<string, unknown> = { ...(row as Record<string, unknown>) };
        for (const [fieldName, f] of Object.entries(section.fields)) {
          if (f.type !== 'number') continue;
          const fn = resolveDisplayTransform(f.transform);
          if (!fn || !(fieldName in nextRow)) continue;
          nextRow[fieldName] = fn(nextRow[fieldName]);
        }
        return nextRow;
      });
    }
    next.lines = nextLines;
  }
  return next;
}

/**
 * Walk the config + line sections and apply each number field's named save
 * transform to the matching value in `values`. Pure — returns a new record.
 * Used on submit to convert UI representation (percent) to the storage
 * representation (fraction) before invoking the server action.
 */
function applySaveTransforms(
  values: Record<string, unknown>,
  config: CatalogConfig,
  lines?: Record<string, LineSectionConfig>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...values };
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.type !== 'number') continue;
    const fn = resolveSaveTransform(f.transform);
    if (!fn || !(name in next)) continue;
    next[name] = fn(next[name]);
  }
  if (lines && next.lines && typeof next.lines === 'object') {
    const nextLines: Record<string, unknown> = { ...(next.lines as Record<string, unknown>) };
    for (const [sectionKey, section] of Object.entries(lines)) {
      const rows = nextLines[sectionKey];
      if (!Array.isArray(rows)) continue;
      nextLines[sectionKey] = rows.map((row) => {
        if (!row || typeof row !== 'object') return row;
        const nextRow: Record<string, unknown> = { ...(row as Record<string, unknown>) };
        for (const [fieldName, f] of Object.entries(section.fields)) {
          if (f.type !== 'number') continue;
          const fn = resolveSaveTransform(f.transform);
          if (!fn || !(fieldName in nextRow)) continue;
          nextRow[fieldName] = fn(nextRow[fieldName]);
        }
        return nextRow;
      });
    }
    next.lines = nextLines;
  }
  return next;
}

function emptyDefaults(
  config: CatalogConfig,
  lines?: Record<string, LineSectionConfig>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.hidden || f.formHidden) continue;
    if (f.type === 'boolean') {
      out[name] = false;
      continue;
    }
    if ((f.type === 'datetime' || f.type === 'date') && 'default' in f && f.default === 'now') {
      out[name] = new Date().toISOString();
      continue;
    }
    out[name] = '';
  }
  if (lines) {
    const linesOut: Record<string, unknown[]> = {};
    for (const sectionKey of Object.keys(lines)) {
      linesOut[sectionKey] = [];
    }
    out.lines = linesOut;
  }
  return out;
}
