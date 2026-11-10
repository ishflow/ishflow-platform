'use client';

import type { FieldConfig, SettingsConfig } from '@/platform/metadata';
import { Save } from 'lucide-react';
import { useActionState, useState } from 'react';
import { type SettingsSubmitState, submitSettingsAction } from './settings-actions';

export type SettingsLabels = {
  /** Pre-resolved per-field label, keyed by field name. */
  field: Record<string, string>;
  /** Pre-resolved per-enum-value label, keyed by `<fieldName>.<value>`. */
  enumOption: Record<string, string>;
  /** Pre-resolved group legend, keyed by group id. Missing keys fall back to raw id. */
  group: Record<string, string>;
  /** Save button copy. */
  saveCta: string;
  /** Pending state copy ("Saving…"). */
  saving: string;
  /** Success toast copy ("Saved."). */
  saved: string;
  /** Generic error prefix (e.g. "Couldn't save:"). */
  errorPrefix: string;
  /** Confirm copy shown (admin.general only) when the currency is changed. */
  currencyChangeWarn?: string;
};

type GroupedField = { key: string; field: FieldConfig };

function groupFields(cfg: SettingsConfig): Array<{ group: string | null; fields: GroupedField[] }> {
  const order: string[] = [];
  const byGroup = new Map<string, GroupedField[]>();
  for (const [key, field] of Object.entries(cfg.fields)) {
    const g = field.group ?? '__default__';
    let bucket = byGroup.get(g);
    if (!bucket) {
      bucket = [];
      byGroup.set(g, bucket);
      order.push(g);
    }
    bucket.push({ key, field });
  }
  return order.map((g) => ({
    group: g === '__default__' ? null : g,
    fields: byGroup.get(g) ?? [],
  }));
}

function defaultFor(field: FieldConfig): unknown {
  switch (field.type) {
    case 'string':
    case 'text':
    case 'color':
      return field.default ?? '';
    case 'number':
    case 'money':
      return field.default ?? '';
    case 'boolean':
      return field.default ?? false;
    default:
      return '';
  }
}

/**
 * Generic V2 settings form. Driven entirely by a `SettingsConfig` plus a
 * pre-resolved `labels` bundle (so the client side never re-resolves i18n).
 *
 * Supports field types: string, text, number, money, boolean, color, and any
 * string field with `enumValues` (rendered as a select). Fields with a `group`
 * hint render inside a labelled `<fieldset>`. Defaults from the DSL config
 * are applied when the persisted row lacks a value.
 *
 * Unsupported field types render a "type X deferred" hint instead of crashing.
 */
export function V2SettingsForm({
  slug,
  config,
  initialValues,
  labels,
}: {
  slug: string;
  config: SettingsConfig;
  initialValues: Record<string, unknown>;
  labels: SettingsLabels;
}) {
  const [state, formAction, pending] = useActionState<SettingsSubmitState, FormData>(
    (prev, fd) => submitSettingsAction(slug, prev, fd),
    null,
  );

  const groups = groupFields(config);

  // admin.general only: changing the single operational currency relabels all
  // money across the app — confirm before saving. No-op for every other form
  // (the field simply isn't present). Native confirm keeps the generic form
  // dependency-free.
  const initialCurrency = String(initialValues.defaultCurrencyCode ?? '');
  function confirmCurrencyChange(e: React.FormEvent<HTMLFormElement>) {
    const el = e.currentTarget.elements.namedItem('defaultCurrencyCode');
    const next = el instanceof HTMLSelectElement ? el.value : '';
    if (next && initialCurrency && next !== initialCurrency) {
      const msg = labels.currencyChangeWarn ?? 'Change the currency for the whole workspace?';
      if (!window.confirm(msg)) e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={confirmCurrencyChange}>
      <div className="action-bar">
        <div className="left">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Save size={14} strokeWidth={1.75} />
            {pending ? labels.saving : labels.saveCta}
          </button>
          {state?.ok ? <span className="dim">{labels.saved}</span> : null}
          {state && !state.ok ? (
            <span style={{ color: 'var(--danger, #c33)' }}>
              {labels.errorPrefix} {state.error}
            </span>
          ) : null}
        </div>
      </div>

      {groups.map(({ group, fields }, idx) => (
        <div key={group ?? `__default__${idx}`}>
          {idx > 0 ? <div className="spacer" /> : null}
          <section className="card">
            {group ? (
              <div className="card-header">
                <div className="card-title">{labels.group[group] ?? group}</div>
              </div>
            ) : null}
            <div className="form-grid">
              {fields.map(({ key, field }) => (
                <SettingsField
                  key={key}
                  fieldKey={key}
                  field={field}
                  value={initialValues[key] ?? defaultFor(field)}
                  labels={labels}
                />
              ))}
            </div>
          </section>
        </div>
      ))}
    </form>
  );
}

function SettingsField({
  fieldKey,
  field,
  value,
  labels,
}: {
  fieldKey: string;
  field: FieldConfig;
  value: unknown;
  labels: SettingsLabels;
}) {
  const id = `s-${fieldKey}`;
  const label = labels.field[fieldKey] ?? fieldKey;

  // Enum string → select
  if (field.type === 'string' && field.enumValues && field.enumValues.length > 0) {
    return (
      <>
        <label htmlFor={id}>{label}</label>
        <div className="field">
          <select id={id} name={fieldKey} className="input" defaultValue={String(value ?? '')}>
            {field.required ? null : <option value="" />}
            {field.enumValues.map((opt) => (
              <option key={opt} value={opt}>
                {labels.enumOption[`${fieldKey}.${opt}`] ?? opt}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  }

  if (field.type === 'string') {
    return (
      <>
        <label htmlFor={id}>{label}</label>
        <div className="field">
          <input
            id={id}
            name={fieldKey}
            className="input"
            placeholder={field.placeholder}
            defaultValue={String(value ?? '')}
          />
        </div>
      </>
    );
  }

  if (field.type === 'text') {
    return (
      <>
        <label htmlFor={id}>{label}</label>
        <div className="field">
          <textarea
            id={id}
            name={fieldKey}
            className="textarea"
            rows={field.rows ?? 4}
            placeholder={field.placeholder}
            defaultValue={String(value ?? '')}
          />
        </div>
      </>
    );
  }

  if (field.type === 'number' || field.type === 'money') {
    const suffix = field.type === 'number' ? field.suffix : undefined;
    return (
      <>
        <label htmlFor={id}>{label}</label>
        <div
          className="field"
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <input
            id={id}
            name={fieldKey}
            type="number"
            className="input mono"
            step={field.type === 'money' ? '0.01' : 'any'}
            min={field.type === 'number' ? field.min : undefined}
            max={field.type === 'number' ? field.max : undefined}
            placeholder={field.type === 'number' ? field.placeholder : undefined}
            defaultValue={
              value === '' || value === null || value === undefined ? '' : String(value)
            }
            style={{ maxWidth: 180 }}
          />
          {suffix ? (
            <span className="dim" style={{ fontSize: 12 }}>
              {suffix}
            </span>
          ) : null}
        </div>
      </>
    );
  }

  if (field.type === 'boolean') {
    return <BooleanToggle id={id} name={fieldKey} label={label} initial={Boolean(value)} />;
  }

  if (field.type === 'color') {
    return (
      <ColorPicker
        id={id}
        name={fieldKey}
        label={label}
        initial={String(value ?? field.default ?? '#000000')}
      />
    );
  }

  // Unsupported field type — render a hint instead of crashing the page.
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="field">
        <span className="dim">type &quot;{field.type}&quot; rendering deferred</span>
      </div>
    </>
  );
}

function BooleanToggle({
  id,
  name,
  label,
  initial,
}: {
  id: string;
  name: string;
  label: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  // Inline width/height because `.toggle` in _settings.css is only loaded
  // under /v2/settings/* — admin pages share this component without that
  // stylesheet, so the button would otherwise be 0×0 and Playwright would
  // refuse to click it. Visual polish still upgrades via the CSS class when
  // it IS loaded.
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className={`toggle ${on ? 'is-on' : ''}`}
          aria-pressed={on}
          onClick={() => setOn(!on)}
          id={id}
          style={{
            width: 34,
            height: 20,
            borderRadius: 999,
            background: on ? 'var(--accent, #0F5EEF)' : 'var(--border-strong, #ccc)',
            position: 'relative',
            cursor: 'pointer',
            border: 0,
            padding: 0,
            transition: 'background 120ms',
            flexShrink: 0,
            display: 'inline-block',
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 16,
              height: 16,
              borderRadius: 999,
              background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              transform: on ? 'translateX(14px)' : 'translateX(0)',
              transition: 'transform 120ms',
            }}
          />
        </button>
        <input type="hidden" name={name} value={on ? 'on' : ''} />
        <span className="dim" style={{ fontSize: 12 }}>
          {on ? 'On' : 'Off'}
        </span>
      </div>
    </>
  );
}

function ColorPicker({
  id,
  name,
  label,
  initial,
}: {
  id: string;
  name: string;
  label: string;
  initial: string;
}) {
  const [hex, setHex] = useState(initial);
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000';
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="field">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 24,
              height: 24,
              borderRadius: 6,
              background: safe,
              border: '1px solid var(--border)',
              flexShrink: 0,
            }}
          />
          <input
            id={id}
            name={name}
            className="input mono"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#0F5EEF"
            style={{ maxWidth: 140 }}
          />
        </div>
      </div>
    </>
  );
}
