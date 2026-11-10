'use client';

import { inlineCreateByRefEntity } from '@/components/v2/catalogs/generic-catalog-actions';
import { LinkedDocumentField } from '@/components/v2/documents/linked-document-field';
import { RefCombobox } from '@/components/v2/shared/RefCombobox';
import { V2DatePicker } from '@/components/v2/shared/V2DatePicker';
import { refEntityFromToken } from '@/lib/v2-shell/entity-slug-map';
import type { FieldConfig, Locale } from '@/platform/metadata';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useWizardParty } from './wizard-party-context';

/**
 * Renders one metadata-driven catalog/document field in variant-9 styling.
 *
 * The component is **uncontrolled** — it sets `defaultValue` and lets the
 * native form action collect the value at submit. This keeps the
 * implementation tiny and avoids RHF wiring for Phase 1 (V2EntityForm is a
 * plain `<form action={...}>`); a future Phase 2 may add a RHF mode for
 * line arrays where reactive updates are needed.
 *
 * Field types covered:
 *  - `string` / `text` / `number` → native input/textarea
 *  - `boolean` → checkbox with a paired `__bool:<name>` hidden marker
 *  - `reference` → `<RefCombobox>` (handles its own hidden input)
 *  - `date` → `<V2DatePicker>` (already variant-9)
 *  - `formHidden: true` → renders an `<input type="hidden">` so the value
 *    still posts (used for `code` with `autoGenerate: 'sequence'`).
 *
 * NOT covered in Phase 1: `money`, `docNumber`, `docRef`, `activeCurrency`,
 * `datetime`. Those land in Phase 2 alongside V2DocumentWizard.
 */
export function V2AutoField({
  name,
  field,
  locale,
  defaultValue,
  refDefaultSelected,
  refControlledValue,
  fieldError,
  disabled,
  onRefChange,
}: {
  name: string;
  field: FieldConfig;
  locale: Locale;
  defaultValue?: unknown;
  refDefaultSelected?: { id: string; label: string } | null;
  /** Controlled reference selection — when supplied, the RefCombobox mirrors
   *  this value. Used by parents that need to push a programmatic pick
   *  (e.g. customer→priceType auto-fill on the sales-invoice wizard). */
  refControlledValue?: { id: string; label: string } | null;
  fieldError?: string;
  disabled?: boolean;
  /** Reference fields only — bubbles RefCombobox selection up to the form
   *  so parents (e.g. document wizard) can wire auto-price hooks. */
  onRefChange?: (id: string | null) => void;
}) {
  // Current document party (customer/supplier) from the wizard, used to scope
  // reference pickers that declare `filterByHeaderField` (QA #75). Outside the
  // wizard the context default is null → no party filter.
  const { partyId } = useWizardParty();
  if (field.hidden) return null;

  // formHidden fields still post their value (engine auto-generates code etc).
  if (field.formHidden) {
    const value = defaultValue == null ? '' : String(defaultValue);
    return <input type="hidden" name={name} value={value} />;
  }

  const label = field.label[locale] ?? field.label.en;
  const id = `v2-field-${name}`;

  return (
    <>
      <label htmlFor={id}>
        {label}
        {field.required ? <span style={{ color: 'var(--danger)' }}> *</span> : null}
      </label>
      <div className="field">
        {renderInput({
          id,
          name,
          field,
          locale,
          defaultValue,
          refDefaultSelected,
          refControlledValue,
          disabled,
          onRefChange,
          partyId,
        })}
        {fieldError ? (
          <div className="field-error">
            <AlertTriangle size={12} strokeWidth={1.75} />
            {fieldError}
          </div>
        ) : null}
      </div>
    </>
  );
}

function renderInput({
  id,
  name,
  field,
  locale,
  defaultValue,
  refDefaultSelected,
  refControlledValue,
  disabled,
  onRefChange,
  partyId,
}: {
  id: string;
  name: string;
  field: FieldConfig;
  locale: Locale;
  defaultValue?: unknown;
  refDefaultSelected?: { id: string; label: string } | null;
  refControlledValue?: { id: string; label: string } | null;
  disabled?: boolean;
  onRefChange?: (id: string | null) => void;
  partyId?: string | null;
}) {
  switch (field.type) {
    case 'string': {
      // Closed-enum string → render a <select>. Engine zod schema already
      // narrows the type, so this is purely a UX upgrade.
      if (field.enumValues && field.enumValues.length > 0) {
        const current = defaultValue == null ? '' : String(defaultValue);
        return (
          <select
            id={id}
            name={name}
            className="input select"
            defaultValue={current}
            required={field.required}
            disabled={disabled}
          >
            {!field.required && !current ? <option value="">—</option> : null}
            {field.enumValues.map((v) => {
              const label = field.enumLabels?.[v];
              return (
                <option key={v} value={v}>
                  {label ? (label[locale] ?? label.en ?? v) : v}
                </option>
              );
            })}
          </select>
        );
      }
      return (
        <input
          id={id}
          name={name}
          type={field.email ? 'email' : 'text'}
          className="input"
          defaultValue={defaultValue == null ? '' : String(defaultValue)}
          required={field.required}
          maxLength={field.maxLength}
          disabled={disabled}
        />
      );
    }
    case 'text': {
      return (
        <textarea
          id={id}
          name={name}
          className="textarea"
          defaultValue={defaultValue == null ? '' : String(defaultValue)}
          required={field.required}
          rows={3}
          disabled={disabled}
        />
      );
    }
    case 'number': {
      const valueStr = defaultValue == null || defaultValue === '' ? '' : String(defaultValue);
      return (
        <input
          id={id}
          name={name}
          type="number"
          className="input"
          defaultValue={valueStr}
          required={field.required}
          min={field.min}
          max={field.max}
          step="any"
          disabled={disabled}
        />
      );
    }
    case 'money': {
      const valueStr = defaultValue == null || defaultValue === '' ? '' : String(defaultValue);
      return (
        <input
          id={id}
          name={name}
          type="number"
          className="input mono"
          defaultValue={valueStr}
          required={field.required}
          step="0.01"
          min="0"
          style={{ textAlign: 'right' }}
          disabled={disabled}
        />
      );
    }
    case 'datetime': {
      // V2 surfaces datetime fields via V2DatePicker (date-only precision).
      // Mirrors the bespoke purchase-invoice wizard's behavior so sales and
      // purchase forms look identical, and matches the practical reality:
      // invoice/document `date` fields don't need wall-clock-of-day input.
      // The engine still accepts an ISO date string and stores it as
      // datetime — time-of-day defaults to 00:00 server-side.
      //
      // When the DSL declares `default: 'now'` and no defaultValue is
      // supplied (typical create mode), seed the picker with today's date so
      // the user doesn't have to click into the calendar before saving.
      const today = new Date().toISOString().slice(0, 10);
      const dateStr =
        typeof defaultValue === 'string'
          ? defaultValue.slice(0, 10)
          : defaultValue instanceof Date
            ? defaultValue.toISOString().slice(0, 10)
            : field.default === 'now'
              ? today
              : '';
      return (
        <V2DatePicker
          id={id}
          name={name}
          defaultValue={dateStr}
          required={field.required}
          ariaLabel={field.label.en}
        />
      );
    }
    case 'boolean': {
      // Native checkbox without value sends nothing when unchecked. Pair
      // with a hidden marker so the server action knows the intended
      // boolean state regardless.
      const checked = defaultValue === true || defaultValue === 'true' || defaultValue === 'on';
      return <BooleanInput id={id} name={name} defaultChecked={checked} disabled={disabled} />;
    }
    case 'date': {
      const dateStr =
        typeof defaultValue === 'string'
          ? defaultValue.slice(0, 10)
          : defaultValue instanceof Date
            ? defaultValue.toISOString().slice(0, 10)
            : '';
      return (
        <V2DatePicker
          id={id}
          name={name}
          defaultValue={dateStr}
          required={field.required}
          ariaLabel={field.label.en}
        />
      );
    }
    case 'reference': {
      const refEntity = refEntityFromToken(field.to);
      if (!refEntity) {
        return (
          <input
            id={id}
            name={name}
            type="text"
            className="input"
            defaultValue={defaultValue == null ? '' : String(defaultValue)}
            placeholder={`(unmapped ref: ${field.to.module}.${field.to.name})`}
            disabled={disabled}
          />
        );
      }
      // Map DSL `referenceFilter` spec → picker `filter` map.
      // Plain string specs become `{ <spec>: '1' }`. Object specs are not
      // wired yet on V2; ignored harmlessly.
      const refFilter =
        typeof field.referenceFilter === 'string'
          ? { [field.referenceFilter]: '1' }
          : field.filterByHeaderField && partyId
            ? { byParty: partyId }
            : undefined;
      return (
        <InlineCreateAwareRefCombobox
          name={name}
          refEntity={refEntity}
          required={field.required}
          defaultSelected={refDefaultSelected ?? null}
          value={refControlledValue}
          onChange={onRefChange}
          inlineCreate={field.inlineCreate === true}
          locale={locale}
          filter={refFilter}
        />
      );
    }
    case 'documentLink': {
      const refEntity = refEntityFromToken(field.to);
      if (!refEntity) {
        return (
          <input
            id={id}
            name={name}
            type="hidden"
            defaultValue=""
            placeholder={`(unmapped ref: ${field.to.module}.${field.to.name})`}
          />
        );
      }
      return (
        <LinkedDocumentField
          name={name}
          // biome-ignore lint/suspicious/noExplicitAny: RefEntity union is closed; runtime-safe via the slug map.
          refEntity={refEntity as any}
          filterByHeaderField={field.filterByHeaderField}
          amountSource={field.amountSource ?? 'openBalance'}
          defaultValue={defaultValue == null ? undefined : String(defaultValue)}
        />
      );
    }
    default: {
      // docNumber, docRef — Phase 2 (document-only).
      return (
        <input
          id={id}
          name={name}
          type="text"
          className="input"
          defaultValue={defaultValue == null ? '' : String(defaultValue)}
          placeholder={`(unsupported in Phase 1: ${field.type})`}
          disabled
        />
      );
    }
  }
}

/**
 * Wraps RefCombobox with optional inline-create wiring. When the DSL field
 * sets `inlineCreate: true`, the combobox's "+ new" affordance is exposed:
 * typing a fresh name + confirming mints a row in the referenced catalog
 * via the generic `inlineCreateByRefEntity` server action. i18n labels
 * come from the `v2_catalogs.shared` namespace (same keys the bespoke
 * forms used) so the UX stays identical for end users.
 */
function InlineCreateAwareRefCombobox({
  name,
  refEntity,
  required,
  defaultSelected,
  value,
  onChange,
  inlineCreate,
  locale,
  filter,
}: {
  name: string;
  refEntity: string;
  required?: boolean;
  defaultSelected: { id: string; label: string } | null;
  value?: { id: string; label: string } | null;
  onChange?: (id: string | null) => void;
  inlineCreate: boolean;
  locale: Locale;
  filter?: Record<string, string>;
}) {
  const tShared = useTranslations('v2_catalogs.shared');
  const pickKey = refEntityToPickKey(refEntity);
  const placeholder = pickKey ? tShared(`pick.${pickKey}`) : undefined;
  return (
    <RefCombobox
      name={name}
      // biome-ignore lint/suspicious/noExplicitAny: RefEntity union is closed; runtime-safe via the slug map.
      entity={refEntity as any}
      required={required}
      defaultSelected={defaultSelected}
      value={value}
      placeholder={placeholder}
      onChange={onChange ? (id) => onChange(id) : undefined}
      filter={filter}
      onCreate={
        inlineCreate
          ? async (rawName) => {
              const res = await inlineCreateByRefEntity(locale, refEntity, rawName);
              if (res.ok) {
                return { ok: true, option: { id: res.id, label: res.name } };
              }
              return {
                ok: false,
                errorKey: res.error === 'duplicate' ? 'duplicate' : 'errorGeneric',
              };
            }
          : undefined
      }
      createLabels={
        inlineCreate
          ? {
              cta: tShared('newCategoryCta'),
              namePlaceholder: tShared('inlineCreateNamePlaceholder'),
              save: tShared('inlineCreateSave'),
              cancel: tShared('inlineCreateCancel'),
              errorGeneric: tShared('inlineCreateError'),
              errorDuplicate: tShared('inlineCreateErrorDuplicate'),
            }
          : undefined
      }
    />
  );
}

/**
 * Tiny client wrapper that pairs a checkbox with its `__bool:<name>` marker
 * so unchecked → 'false' still reaches the server. Local state mirrors the
 * checkbox so React updates the hidden input on every toggle.
 */
function BooleanInput({
  id,
  name,
  defaultChecked,
  disabled,
}: {
  id: string;
  name: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  // Native uncontrolled — listen to `change` via a tiny effect-free pattern.
  // We piggyback on the form's reset/submit lifecycle: the hidden marker
  // gets its value updated by an onChange handler.
  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const marker = e.currentTarget.form?.elements.namedItem(
      `__bool:${name}`,
    ) as HTMLInputElement | null;
    if (marker) marker.value = e.currentTarget.checked ? 'true' : 'false';
  }
  return (
    <>
      <input
        id={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
      />
      <input
        type="hidden"
        name={`__bool:${name}`}
        defaultValue={defaultChecked ? 'true' : 'false'}
      />
    </>
  );
}

/** Map RefEntity slug → camelCase key under `v2_catalogs.shared.pick.*` so
 *  the picker shows a locale-aware placeholder ("Müşteri seç…" / "Pick
 *  customer…" / "Выбрать клиента…") instead of the raw entity slug. */
function refEntityToPickKey(refEntity: string): string | null {
  switch (refEntity) {
    case 'customer':
    case 'supplier':
    case 'product':
    case 'warehouse':
      return refEntity;
    case 'sales-invoice':
      return 'salesInvoice';
    case 'purchase-invoice':
      return 'purchaseInvoice';
    case 'product-category':
      return 'productCategory';
    case 'product-group':
      return 'productGroup';
    case 'price-type':
      return 'priceType';
    default:
      return null;
  }
}
