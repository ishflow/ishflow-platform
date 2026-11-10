'use client';

import { resolveLineCost } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-line-cost';
import { resolveLinePrice } from '@/app/[locale]/(app)/documents/[entity]/_actions/resolve-line-price';
import { StockChipRow } from '@/components/app/stock-chip-row';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type {
  FieldConfig,
  LineSectionConfig,
  Locale,
  ReferenceFieldConfig,
  ReferenceFilterSpec,
} from '@/platform/metadata';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import { AutoField } from './auto-field';

/**
 * Tabular child-section editor backed by react-hook-form's useFieldArray.
 * Renders one row per line; dispatches per-cell rendering to AutoField so
 * the section picks up combobox/date-picker/money formatting for free.
 */
export function LineFieldArray({
  sectionKey,
  section,
  locale,
  basePath,
  salesContext,
  readOnly = false,
}: {
  sectionKey: string;
  section: LineSectionConfig;
  locale: Locale;
  basePath?: string;
  /**
   * Header-level context for `section.lineBehavior === 'sales'`. When
   * provided and the row has a product, `SalesLineExtras` renders a hint
   * row under the stock chip row and auto-fills the `price` field.
   */
  salesContext?: {
    customerId: string | null;
    date: string | null;
    priceTypeId: string | null;
    warehouseId: string | null;
  };
  /** When true, hides add/remove/move controls and disables all inputs. */
  readOnly?: boolean;
}) {
  const path = basePath ?? `lines.${sectionKey}`;
  const { control, watch } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: path });
  const { errors } = useFormState({ name: path });
  const lineErrors =
    (getNestedErrorTree(errors as Record<string, unknown>, path) as
      | Array<Record<string, unknown> | undefined>
      | undefined) ?? [];
  const seededRef = useRef(false);
  useEffect(() => {
    if (readOnly) return;
    if (seededRef.current) return;
    if (fields.length === 0) {
      append(emptyRow(section), { shouldFocus: false });
    }
    seededRef.current = true;
  }, [readOnly, append, fields.length, section]);
  const t = useTranslations('document.lines');
  const sectionLabel = section.label[locale] ?? section.label.en;

  const fieldEntries = Object.entries(section.fields).filter(([, f]) => !f.hidden) as Array<
    [string, FieldConfig]
  >;
  const showRowTotal = 'quantity' in section.fields && 'price' in section.fields;

  const rows = watch(path) as Array<Record<string, unknown>> | undefined;
  const total = computeTotal(rows, section);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{sectionLabel}</h3>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">{t('sequence')}</TableHead>
              {fieldEntries.map(([name, cfg]) => {
                const isNumeric = cfg.type === 'number' || cfg.type === 'money';
                return (
                  <TableHead key={name} className={cn(isNumeric && 'w-28 text-right')}>
                    {cfg.label[locale] ?? cfg.label.en}
                  </TableHead>
                );
              })}
              {showRowTotal && <TableHead className="w-32 text-right">{t('rowTotal')}</TableHead>}
              {!readOnly && <TableHead className="w-28" aria-label={t('removeButton')} />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((row, i) => {
              const rowValues = (rows?.[i] ?? {}) as Record<string, unknown>;
              const hasRowError = Boolean(lineErrors?.[i]);
              const productId = typeof rowValues.product === 'string' ? rowValues.product : null;
              return (
                <Fragment key={row.id}>
                  <TableRow className={cn(hasRowError && 'bg-destructive/5')}>
                    <TableCell className="text-center text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    {fieldEntries.map(([name, cfg]) => {
                      const filter =
                        cfg.type === 'reference'
                          ? resolveReferenceFilter(
                              (cfg as ReferenceFieldConfig).referenceFilter,
                              rowValues,
                            )
                          : undefined;
                      const isNumeric = cfg.type === 'number' || cfg.type === 'money';
                      return (
                        <TableCell
                          key={name}
                          className={cn('align-top', isNumeric && 'text-right')}
                        >
                          <AutoField
                            name={`${path}.${i}.${name}`}
                            field={cfg}
                            locale={locale}
                            referenceFilter={filter}
                            hideLabel
                            disabled={readOnly}
                          />
                        </TableCell>
                      );
                    })}
                    {showRowTotal && (
                      <TableCell className="align-middle text-right tabular-nums">
                        {formatMoney(computeRowTotal(rows?.[i], section), locale)}
                      </TableCell>
                    )}
                    {!readOnly && (
                      <TableCell>
                        <div className="flex justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('moveUp')}
                            disabled={i === 0}
                            onClick={() => move(i, i - 1)}
                          >
                            <ChevronUp className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('moveDown')}
                            disabled={i === fields.length - 1}
                            onClick={() => move(i, i + 1)}
                          >
                            <ChevronDown className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('removeButton')}
                            onClick={() => remove(i)}
                          >
                            <X className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {section.lineBehavior === 'sales' && productId && (
                    <TableRow
                      className={cn(
                        'border-t-0 hover:bg-transparent',
                        hasRowError && 'bg-destructive/5',
                      )}
                      aria-hidden="true"
                    >
                      <TableCell className="py-0" />
                      <TableCell className="py-0" colSpan={fieldEntries.length + 1}>
                        <StockChipRow productId={productId} />
                      </TableCell>
                      {!readOnly && <TableCell className="py-0" />}
                    </TableRow>
                  )}
                  {!readOnly &&
                    section.lineBehavior === 'sales' &&
                    productId &&
                    salesContext?.customerId &&
                    salesContext?.date && (
                      <TableRow
                        className={cn(
                          'border-t-0 hover:bg-transparent',
                          hasRowError && 'bg-destructive/5',
                        )}
                        aria-hidden="true"
                      >
                        <TableCell className="py-0" />
                        <TableCell className="py-0" colSpan={fieldEntries.length + 1}>
                          <SalesLineExtras
                            path={path}
                            rowIndex={i}
                            productId={productId}
                            customerId={salesContext.customerId}
                            date={salesContext.date}
                            priceTypeId={salesContext.priceTypeId}
                          />
                        </TableCell>
                        <TableCell className="py-0" />
                      </TableRow>
                    )}
                  {!readOnly && section.lineBehavior === 'price-setting' && productId && (
                    <TableRow
                      className={cn(
                        'border-t-0 hover:bg-transparent',
                        hasRowError && 'bg-destructive/5',
                      )}
                      aria-hidden="true"
                    >
                      <TableCell className="py-0" />
                      <TableCell className="py-0" colSpan={fieldEntries.length + 1}>
                        <PriceSettingLineExtras path={path} rowIndex={i} productId={productId} />
                      </TableCell>
                      <TableCell className="py-0" />
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              {!readOnly && (
                <TableCell colSpan={fieldEntries.length + 1}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append(emptyRow(section))}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {t('addButton')}
                  </Button>
                </TableCell>
              )}
              <TableCell
                colSpan={
                  readOnly ? fieldEntries.length + (showRowTotal ? 2 : 1) : showRowTotal ? 2 : 1
                }
                className="text-right font-medium tabular-nums"
              >
                {total !== null && `${t('total')}: ${formatMoney(total, locale)}`}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

function emptyRow(section: LineSectionConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, f] of Object.entries(section.fields)) {
    if (f.hidden) continue;
    switch (f.type) {
      case 'boolean':
        out[name] = false;
        break;
      case 'number':
      case 'money':
        out[name] = '';
        break;
      default:
        out[name] = '';
    }
  }
  return out;
}

function computeRowTotal(
  row: Record<string, unknown> | undefined,
  section: LineSectionConfig,
): number {
  if (!row) return 0;
  const hasQuantity = 'quantity' in section.fields;
  const hasPrice = 'price' in section.fields;
  if (!hasQuantity || !hasPrice) return 0;
  const q = Number(row.quantity ?? 0);
  const p = Number(row.price ?? 0);
  if (Number.isNaN(q) || Number.isNaN(p)) return 0;
  return q * p;
}

function computeTotal(
  rows: Array<Record<string, unknown>> | undefined,
  section: LineSectionConfig,
): number | null {
  if (!rows || rows.length === 0) return null;
  const hasQuantity = 'quantity' in section.fields;
  const hasPrice = 'price' in section.fields;
  if (!hasQuantity || !hasPrice) return null;
  let sum = 0;
  for (const row of rows) {
    const q = Number(row.quantity ?? 0);
    const p = Number(row.price ?? 0);
    if (!Number.isNaN(q) && !Number.isNaN(p)) sum += q * p;
  }
  return sum;
}

function formatMoney(value: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'decimal', minimumFractionDigits: 2 }).format(
      value,
    );
  } catch {
    return value.toFixed(2);
  }
}

function getNestedErrorTree(errors: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cursor: unknown = errors;
  for (const p of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[p];
  }
  return cursor;
}

/**
 * Debounced price-hint row: when (product, customer, date) are all set, call
 * the resolve-line-price server action, surface a single-line hint, and
 * auto-fill the `price` field unless the user has already dirtied it.
 * Silent on error — the hint is a nicety, not a requirement.
 */
function SalesLineExtras({
  path,
  rowIndex,
  productId,
  customerId,
  date,
  priceTypeId,
}: {
  path: string;
  rowIndex: number;
  productId: string | null;
  customerId: string | null;
  date: string | null;
  priceTypeId: string | null;
}) {
  const { setValue, getValues } = useFormContext();
  const priceName = `${path}.${rowIndex}.price`;
  const [hint, setHint] = useState<null | {
    cost: number;
    markupPct: number | null;
    price: number;
    source: string;
  }>(null);
  // Track the exact value WE wrote so we can tell whether the current price
  // came from us (re-writable on a downstream resolve) or from the user
  // (hands off). RHF's `isDirty` is unreliable here — even with
  // shouldDirty:false on our setValue, the flag can latch true when the
  // form-state recomputes during nested array operations, which previously
  // froze prices on customer change after the first auto-fill.
  const lastWrittenSource = useRef<string | null>(null);
  const lastWrittenPrice = useRef<number | null>(null);
  const t = useTranslations('document.lines.priceHint');

  useEffect(() => {
    if (!productId || !customerId || !date) {
      setHint(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const out = await resolveLinePrice({ customerId, productId, date, priceTypeId });
        if (cancelled) return;
        if (!out) {
          setHint(null);
          return;
        }
        setHint({
          cost: out.cost,
          markupPct: out.markupPct,
          price: out.price,
          source: out.source,
        });
        if (out.price > 0) {
          const wePreviouslyWrote = lastWrittenSource.current !== null;
          const currentPrice = Number(getValues(priceName) ?? 0);
          const userOverrode =
            wePreviouslyWrote &&
            lastWrittenPrice.current !== null &&
            currentPrice !== lastWrittenPrice.current;
          if (!wePreviouslyWrote || !userOverrode) {
            setValue(priceName, out.price, { shouldValidate: false, shouldDirty: false });
            lastWrittenSource.current = out.source;
            lastWrittenPrice.current = out.price;
          }
        }
      } catch {
        if (!cancelled) setHint(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productId, customerId, date, priceTypeId, priceName, getValues, setValue]);

  if (!hint) return null;
  if (hint.source === 'no-cost') {
    return <p className="text-xs text-muted-foreground">{t('noCost')}</p>;
  }
  const priceFmt = hint.price.toFixed(2);
  const label = hint.source.startsWith('special:')
    ? t('special')
    : hint.source.startsWith('stored:')
      ? t('stored', { price: priceFmt })
      : hint.source.startsWith('derived:')
        ? t('derived', { price: priceFmt })
        : hint.source.startsWith('live-markup:')
          ? hint.markupPct !== null
            ? t('markup', { pct: (hint.markupPct * 100).toFixed(1) })
            : t('markup', { pct: '0.0' })
          : hint.markupPct !== null
            ? t('tenantDefault', { pct: (hint.markupPct * 100).toFixed(1) })
            : t('tenantDefault', { pct: '10.0' });
  return (
    <p className="text-xs text-muted-foreground">
      {t('cost', { cost: hint.cost.toFixed(2) })} · {label} ·{' '}
      {t('min', { min: hint.cost.toFixed(2) })}
    </p>
  );
}

/**
 * Price-setting line hint: shows the live avg cost as a floor and turns
 * red when the entered price is below cost. No auto-write — the user
 * chooses the price; we just surface the cost so they don't have to
 * leave the form to look it up.
 */
function PriceSettingLineExtras({
  path,
  rowIndex,
  productId,
}: {
  path: string;
  rowIndex: number;
  productId: string;
}) {
  const { watch } = useFormContext();
  const priceName = `${path}.${rowIndex}.price`;
  const enteredPrice = Number(watch(priceName) ?? 0);
  const [cost, setCost] = useState<number | null>(null);
  const [hasCost, setHasCost] = useState<boolean | null>(null);
  const t = useTranslations('document.lines.costHint');

  useEffect(() => {
    let cancelled = false;
    setCost(null);
    setHasCost(null);
    (async () => {
      try {
        const out = await resolveLineCost({ productId });
        if (cancelled) return;
        if (!out || out.quantity <= 0 || out.cost <= 0) {
          setCost(null);
          setHasCost(false);
          return;
        }
        setCost(out.cost);
        setHasCost(true);
      } catch {
        if (!cancelled) {
          setCost(null);
          setHasCost(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (hasCost === null) return null;
  if (!hasCost || cost === null) {
    return <p className="text-xs text-muted-foreground">{t('noCost')}</p>;
  }
  const below = enteredPrice > 0 && enteredPrice < cost;
  return (
    <p className={cn('text-xs', below ? 'font-medium text-destructive' : 'text-muted-foreground')}>
      {t('cost', { cost: cost.toFixed(2) })}
      {below ? ` · ${t('below')}` : ''}
    </p>
  );
}

/**
 * Resolve a serializable reference-filter spec to the filter object that
 * ReferenceField expects. Kept client-side so the metadata config stays plain
 * data across the RSC boundary.
 */
function resolveReferenceFilter(
  spec: ReferenceFilterSpec | undefined,
  _row: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!spec) return undefined;
  if (spec === 'hasStockGt0') return { 'filter.hasStockGt0': '1' };
  if (spec === 'staticOnly') return { 'filter.staticOnly': '1' };
  return undefined;
}
