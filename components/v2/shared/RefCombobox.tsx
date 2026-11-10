'use client';

import { AlertTriangle, Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  type RefEntity,
  type RefOption,
  type RefSearchFilter,
  searchRefOptions,
} from './ref-combobox-actions';

type InlineCreateLabels = {
  /** Label for the "+ Yeni X oluştur" footer option (e.g. "Yeni kategori oluştur"). */
  cta: string;
  /** Placeholder for the inline name input. */
  namePlaceholder: string;
  /** Label for the inline Save button. */
  save: string;
  /** Label for the inline Cancel button. */
  cancel: string;
  /** Generic error label. */
  errorGeneric: string;
  /** Shown when the server reports a duplicate-name conflict. */
  errorDuplicate?: string;
};

export type InlineCreateError = 'duplicate' | 'errorGeneric';

export type InlineCreateResult =
  | { ok: true; option: RefOption }
  | { ok: false; errorKey: InlineCreateError };

type Props = {
  /** Hidden input name — the form posts `{ [name]: selected.id }`. */
  name: string;
  entity: RefEntity;
  initialOptions?: RefOption[];
  required?: boolean;
  placeholder?: string;
  /** Optional initial selection (so edit-mode forms render the current value). */
  defaultSelected?: RefOption | null;
  /**
   * If provided, the popover renders a final option "+ <cta>" that swaps the
   * popover into an inline create form. The handler must return a discriminated
   * result so the popover can distinguish duplicate-name from generic errors.
   */
  onCreate?: (name: string) => Promise<InlineCreateResult>;
  /** i18n labels for the inline-create UI. Required when `onCreate` is set. */
  createLabels?: InlineCreateLabels;
  /**
   * Optional change callback — fires whenever the user picks a new option or
   * inline-creates one. Existing callers don't need to wire it; the hidden
   * input value drives the form submission either way. Use this when the
   * parent needs to react to the selection (e.g. auto-fill a price hint when
   * a customer or product is chosen).
   */
  onChange?: (id: string | null, option: RefOption | null) => void;
  /**
   * Entity-specific filter map forwarded to the picker's search action.
   * Keys are recognized per entity (e.g. `staticOnly` for `price-type`).
   * Defaults to no filter.
   */
  filter?: RefSearchFilter;
  /**
   * Controlled selection. When supplied, the picker mirrors this value into
   * its internal state on every change — used by parents that need to push
   * a programmatic selection (e.g. the sales-invoice wizard auto-filling
   * `priceType` after the user picks a customer). Pass `undefined` to keep
   * the picker uncontrolled (the default).
   */
  value?: RefOption | null;
};

export function RefCombobox({
  name,
  entity,
  initialOptions = [],
  required,
  placeholder,
  defaultSelected = null,
  onCreate,
  createLabels,
  onChange,
  filter,
  value,
}: Props) {
  const t = useTranslations('v2_common.refCombobox');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<RefOption[]>(initialOptions);
  const [selected, setSelected] = useState<RefOption | null>(
    value !== undefined ? value : defaultSelected,
  );

  // Controlled mode: sync internal `selected` whenever the parent pushes a
  // new value (programmatic auto-fill). `undefined` means uncontrolled.
  useEffect(() => {
    if (value === undefined) return;
    setSelected(value);
  }, [value]);
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Inline-create state.
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const inlineSupported = Boolean(onCreate && createLabels);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      setOpen(false);
      setMode('list');
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setMode('list');
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function refresh(query: string) {
    start(async () => {
      try {
        const next = await searchRefOptions(entity, query, filter);
        setOptions(next);
      } catch {
        setOptions([]);
      }
    });
  }

  async function submitCreate() {
    if (!onCreate || !createLabels) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError(createLabels.errorGeneric);
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await onCreate(trimmed);
      if (!result.ok) {
        const label =
          result.errorKey === 'duplicate' && createLabels.errorDuplicate
            ? createLabels.errorDuplicate
            : createLabels.errorGeneric;
        setCreateError(label);
        return;
      }
      const option = result.option;
      setOptions((prev) => [option, ...prev.filter((o) => o.id !== option.id)]);
      setSelected(option);
      setNewName('');
      setMode('list');
      setOpen(false);
      onChange?.(option.id, option);
    } catch {
      setCreateError(createLabels.errorGeneric);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={rootRef} className={`combobox${open ? ' is-open' : ''}`}>
      <input type="hidden" name={name} value={selected?.id ?? ''} required={required} />
      <button
        type="button"
        className={`combobox-trigger${selected ? '' : ' is-empty'}`}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!next) setMode('list');
          // Lazy-load the first page when opening with no options yet.
          if (next && options.length === 0) refresh('');
        }}
      >
        <span className="lbl">{selected?.label ?? placeholder ?? t('placeholder')}</span>
        <ChevronDown size={14} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="combobox-popover">
          {mode === 'list' ? (
            <>
              <div className="combobox-search">
                <Search size={14} strokeWidth={1.75} />
                <input
                  type="text"
                  value={q}
                  placeholder={t('searchPlaceholder')}
                  onChange={(e) => {
                    setQ(e.target.value);
                    refresh(e.target.value);
                  }}
                  // biome-ignore lint/a11y/noAutofocus: focus inside a freshly-opened popover is intentional.
                  autoFocus
                />
              </div>
              <div className="combobox-list">
                {pending ? <div className="combobox-empty">…</div> : null}
                {!pending && options.length === 0 && !inlineSupported ? (
                  <div className="combobox-empty">{t('empty')}</div>
                ) : null}
                {options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="combobox-option"
                    onClick={() => {
                      setSelected(o);
                      setOpen(false);
                      onChange?.(o.id, o);
                    }}
                  >
                    <Check size={12} style={{ opacity: selected?.id === o.id ? 1 : 0 }} />
                    <span>{o.label}</span>
                    {o.sublabel ? <span className="dim">{o.sublabel}</span> : null}
                  </button>
                ))}
                {inlineSupported && createLabels ? (
                  <button
                    type="button"
                    className="combobox-option combobox-option-create"
                    onClick={() => {
                      setMode('create');
                      setNewName(q);
                      setCreateError(null);
                    }}
                  >
                    <Plus size={12} strokeWidth={1.75} />
                    <span>{createLabels.cta}</span>
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          {mode === 'create' && createLabels ? (
            <div className="combobox-create">
              <input
                type="text"
                className="combobox-create-input"
                value={newName}
                placeholder={createLabels.namePlaceholder}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submitCreate();
                  }
                }}
                disabled={creating}
                // biome-ignore lint/a11y/noAutofocus: focus inside a freshly-opened popover is intentional.
                autoFocus
              />
              {createError ? (
                <div className="combobox-create-error">
                  <AlertTriangle size={12} strokeWidth={1.75} />
                  {createError}
                </div>
              ) : null}
              <div className="combobox-create-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMode('list');
                    setNewName('');
                    setCreateError(null);
                  }}
                  disabled={creating}
                >
                  {createLabels.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void submitCreate()}
                  disabled={creating}
                >
                  {createLabels.save}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
