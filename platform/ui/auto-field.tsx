'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FieldConfig, Locale, ReferenceFieldConfig } from '@/platform/metadata';
import { useState } from 'react';
import { type FieldError, useFormContext, useFormState } from 'react-hook-form';
import { ReferenceField } from './reference-field';

/**
 * Render one metadata-driven field: <Label> + input primitive chosen by
 * field.type + optional error message. Uses only the shipped shadcn
 * primitives — no wrapper layer.
 *
 * Errors are looked up via a nested path walker so RHF field arrays like
 * `lines.items.0.quantity` surface messages correctly on document lines.
 */
export function AutoField({
  name,
  field: cfg,
  locale,
  referenceFilter,
  hideLabel = false,
  disabled,
  currency,
}: {
  name: string;
  field: FieldConfig;
  locale: Locale;
  referenceFilter?: Record<string, string>;
  hideLabel?: boolean;
  disabled?: boolean;
  currency?: string;
}) {
  const { register, setValue, watch } = useFormContext();
  // Subscribe to this specific path so unrelated errors don't re-render us.
  const { errors } = useFormState({ name });
  const error = getNestedError(errors as Record<string, unknown>, name);
  const label = cfg.label[locale] ?? cfg.label.en;
  const id = `field-${name}`;
  const invalid = Boolean(error);

  return (
    <div
      className="grid gap-2"
      title={hideLabel && error?.message ? String(error.message) : undefined}
    >
      {!hideLabel && (
        <Label htmlFor={id}>
          {label}
          {cfg.required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {renderInput({
        cfg,
        id,
        name,
        label,
        locale,
        register,
        setValue,
        watch,
        invalid,
        referenceFilter,
        disabled,
        currency,
      })}
      {!hideLabel && error?.message && (
        <p className="text-sm text-destructive">{String(error.message)}</p>
      )}
    </div>
  );
}

function getNestedError(errors: Record<string, unknown>, path: string): FieldError | undefined {
  const parts = path.split('.');
  let cursor: unknown = errors;
  for (const p of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[p];
  }
  if (cursor && typeof cursor === 'object' && 'message' in cursor) {
    return cursor as FieldError;
  }
  return undefined;
}

type RenderArgs = {
  cfg: FieldConfig;
  id: string;
  name: string;
  label: string;
  locale: Locale;
  register: ReturnType<typeof useFormContext>['register'];
  setValue: ReturnType<typeof useFormContext>['setValue'];
  watch: ReturnType<typeof useFormContext>['watch'];
  invalid: boolean;
  referenceFilter?: Record<string, string>;
  disabled?: boolean;
  currency?: string;
};

function renderInput({
  cfg,
  id,
  name,
  label,
  locale,
  register,
  setValue,
  watch,
  invalid,
  referenceFilter,
  disabled,
  currency,
}: RenderArgs) {
  const invalidProp = invalid || undefined;
  switch (cfg.type) {
    case 'text':
      return (
        <Textarea id={id} aria-invalid={invalidProp} disabled={disabled} {...register(name)} />
      );
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          placeholder="0"
          aria-invalid={invalidProp}
          disabled={disabled}
          {...register(name)}
        />
      );
    case 'money':
      return (
        <Input
          id={id}
          type="number"
          step="0.01"
          placeholder="0"
          aria-invalid={invalidProp}
          disabled={disabled}
          {...register(name)}
        />
      );
    case 'boolean':
      return (
        <Switch
          id={id}
          name={name}
          checked={Boolean(watch(name))}
          onCheckedChange={(checked) => setValue(name, checked, { shouldDirty: true })}
          disabled={disabled}
        />
      );
    case 'date':
      return (
        <DatePickerField
          id={id}
          name={name}
          locale={locale}
          withTime={false}
          invalid={invalid}
          disabled={disabled}
        />
      );
    case 'datetime':
      return (
        <DatePickerField
          id={id}
          name={name}
          locale={locale}
          withTime={true}
          invalid={invalid}
          disabled={disabled}
        />
      );
    case 'reference': {
      const refCfg = cfg as ReferenceFieldConfig;
      let balanceType: 'customer' | 'supplier' | undefined;
      let showBalance = false;

      if (refCfg.to.module === 'sales' && refCfg.to.name === 'customer') {
        balanceType = 'customer';
        showBalance = true;
      } else if (refCfg.to.module === 'purchases' && refCfg.to.name === 'supplier') {
        balanceType = 'supplier';
        showBalance = true;
      }

      // Header-level reference: resolve DSL filter spec → filter params.
      // Line-level references already resolve the spec in line-field-array.
      let effectiveFilter = referenceFilter;
      if (!effectiveFilter && typeof refCfg.referenceFilter === 'string') {
        if (refCfg.referenceFilter === 'staticOnly') {
          effectiveFilter = { 'filter.staticOnly': '1' };
        } else if (refCfg.referenceFilter === 'hasStockGt0') {
          effectiveFilter = { 'filter.hasStockGt0': '1' };
        }
      }

      return (
        <ReferenceField
          id={id}
          name={name}
          cfg={refCfg}
          placeholder={label}
          filter={effectiveFilter}
          disabled={disabled}
          showBalance={showBalance}
          balanceType={balanceType}
          locale={locale}
          currency={currency}
        />
      );
    }
    default:
      return <Input id={id} aria-invalid={invalidProp} disabled={disabled} {...register(name)} />;
  }
}

function DatePickerField({
  id,
  name,
  locale,
  withTime,
  invalid,
  disabled,
}: {
  id: string;
  name: string;
  locale: Locale;
  withTime: boolean;
  invalid: boolean;
  disabled?: boolean;
}) {
  const { watch, setValue } = useFormContext();
  const raw = watch(name) as string | Date | null | undefined;
  const date = toDate(raw);
  const [open, setOpen] = useState(false);
  const invalidProp = invalid || undefined;

  return (
    <Popover open={open} onOpenChange={disabled ? () => {} : setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        render={
          <Button
            variant="outline"
            type="button"
            aria-invalid={invalidProp}
            disabled={disabled}
            className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground')}
          >
            {date ? formatDate(date, locale, withTime) : '—'}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(picked) => {
            if (!picked) {
              setValue(name, null, { shouldDirty: true, shouldValidate: true });
              return;
            }
            const next =
              withTime && date
                ? new Date(
                    picked.getFullYear(),
                    picked.getMonth(),
                    picked.getDate(),
                    date.getHours(),
                    date.getMinutes(),
                  )
                : picked;
            setValue(name, next.toISOString(), { shouldDirty: true, shouldValidate: true });
            if (!withTime) setOpen(false);
          }}
        />
        {withTime && (
          <div className="border-t p-2">
            <Input
              type="time"
              value={date ? toTimeInput(date) : ''}
              onChange={(e) => {
                const current = date ?? new Date();
                const parts = e.target.value.split(':').map(Number);
                const h = parts[0] ?? 0;
                const m = parts[1] ?? 0;
                const next = new Date(current);
                next.setHours(h, m, 0, 0);
                setValue(name, next.toISOString(), { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function toDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? undefined : raw;
  if (typeof raw === 'string' && raw.length > 0) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function toTimeInput(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(d: Date, locale: Locale, withTime: boolean): string {
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toISOString();
  }
}
