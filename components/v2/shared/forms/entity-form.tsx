'use client';

import { DeleteConfirmDialog } from '@/components/v2/shared/delete-confirm-dialog';
import { PlanLimitDialog, isPlanLimitError } from '@/components/v2/shared/plan-limit-dialog';
import { Link, useRouter } from '@/platform/i18n/navigation';
import type { CatalogConfig, Locale } from '@/platform/metadata';
import type { ActionResult } from '@/platform/ui';
import { AlertTriangle, Archive, Check, Copy, Save, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { ChangeEvent } from 'react';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { V2AutoField } from './auto-field';

/**
 * Generic V2 catalog edit/create form.
 *
 * Renders fields straight from a `CatalogConfig` DSL, wraps them in the
 * variant-9 `.detail-grid` + `.card` + `.form-grid` chrome, and submits
 * through the unified `submitCatalogAction` server action. Edit and create
 * use the same component — `mode='edit'` injects a hidden `__id` so the
 * action routes to `updateCatalogRecord` instead of `createCatalogRecord`.
 *
 * Optional slots (`asideCards`, `afterFields`, `topbarExtra`) accept
 * variant-9 widgets that don't belong to every entity (tips, attachments,
 * status toggles). Most catalogs ship without slots and get a clean
 * minimal form.
 *
 * Number fields with `transform: 'percentFraction'` carry their UI ↔ DB
 * conversion via `applyDisplayTransforms` / `applySaveTransforms` —
 * mirroring V1's behavior so a markup of 10% renders as `10` but persists
 * as `0.10`. The save transform runs on the **server** action
 * (`submitCatalogAction`); the form itself only handles display transforms.
 */
export function V2EntityForm({
  config,
  mode,
  slug,
  recordId,
  defaultValues = {},
  refDefaults = {},
  listHref,
  submitAction,
  deleteActionByLocale,
  cloneActionByLocale,
  archiveActionByLocale,
  isArchived = false,
  lastEdited,
  cardTitle,
  asideCards,
  afterFields,
  readOnly = false,
}: {
  config: CatalogConfig;
  mode: 'create' | 'edit';
  /** URL slug — posted as `__slug` so the unified action can pick the entity. */
  slug: string;
  recordId?: string;
  defaultValues?: Record<string, unknown>;
  /** id → label for reference fields so RefCombobox renders the current selection in edit mode. */
  refDefaults?: Record<string, { id: string; label: string } | null>;
  listHref: string;
  submitAction: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  /** When provided in edit mode, the Delete action is rendered. */
  deleteActionByLocale?: (locale: string, slug: string, id: string) => Promise<ActionResult>;
  /** When provided in edit mode, a Clone button is rendered. Server action
   *  is expected to duplicate the record under a "(copy)" name and return
   *  the new record so the caller can decide where to redirect. */
  cloneActionByLocale?: (locale: string, slug: string, id: string) => Promise<ActionResult>;
  /** Soft-delete equivalent of Delete — sets `deletedAt` without erasing
   *  audit history. Visible only when `!isArchived` so the same button row
   *  doesn't show "Archive" on an already-archived record. */
  archiveActionByLocale?: (locale: string, slug: string, id: string) => Promise<ActionResult>;
  isArchived?: boolean;
  /** Pre-formatted "last edited at" timestamp shown on the right side of
   *  the action bar in edit mode. */
  lastEdited?: string;
  cardTitle?: string;
  asideCards?: ReactNode;
  afterFields?: ReactNode;
  /** When true the form is view-only: action buttons (Save/Clone/Archive/
   *  Delete) are hidden and every field is disabled. Used when the signed-in
   *  user lacks write permission on this entity, so they can inspect a record
   *  without hitting a server-side `Permission Denied`. */
  readOnly?: boolean;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const tc = useTranslations('v2_catalogs.common');
  const tCommon = useTranslations('common');

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    submitAction,
    null,
  );
  const [actionPending, startAction] = useTransition();
  const isEdit = mode === 'edit';

  // On success, navigate back to the list.
  useEffect(() => {
    if (state?.ok) {
      router.push(listHref);
      router.refresh();
    }
  }, [state, router, listHref]);

  const formError = state && !state.ok ? state.formError : undefined;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const isPlanLimit = isPlanLimitError(formError);

  // Soft duplicate-name warning (QA M5 / design D6): the create action returns
  // `warning: 'duplicateName'` instead of saving; the user confirms and we
  // re-submit with a hidden `__forceDuplicate=1` flag so the action skips the
  // check and saves. `force` re-fires the submit once the hidden input updates.
  const warning = state && !state.ok ? state.warning : undefined;
  const [force, setForce] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (force) formRef.current?.requestSubmit();
  }, [force]);

  const displayValues = applyDisplayTransforms(defaultValues, config);

  // Surface the entity label for the card title fallback.
  const fallbackCardTitle = config.label[locale] ?? config.label.en;

  function onDelete() {
    if (!deleteActionByLocale || !recordId) return;
    startAction(async () => {
      const r = await deleteActionByLocale(locale, slug, recordId);
      if (r.ok) {
        router.push(listHref);
        router.refresh();
      }
    });
  }

  function onClone() {
    if (!cloneActionByLocale || !recordId) return;
    startAction(async () => {
      const r = await cloneActionByLocale(locale, slug, recordId);
      if (r.ok) {
        router.push(listHref);
        router.refresh();
      }
    });
  }

  function onArchive() {
    if (!archiveActionByLocale || !recordId) return;
    startAction(async () => {
      const r = await archiveActionByLocale(locale, slug, recordId);
      if (r.ok) {
        router.push(listHref);
        router.refresh();
      }
    });
  }

  // Live form state tracking — used to evaluate showIf predicates as the user
  // toggles enum/boolean fields. Seeded from defaultValues so edit-mode renders
  // the correct shape on first paint without waiting for a user keystroke.
  const [watched, setWatched] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const name of Object.keys(config.fields)) {
      if (name in displayValues) out[name] = displayValues[name];
    }
    return out;
  });

  function onFormChange(e: ChangeEvent<HTMLFormElement>) {
    const target = e.target as unknown as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    if (!target?.name) return;
    const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
    setWatched((prev) => ({
      ...prev,
      [target.name]: isCheckbox ? (target as HTMLInputElement).checked : target.value,
    }));
  }

  const visibleFields = Object.entries(config.fields).filter(([, f]) => {
    if (f.hidden) return false;
    if (!f.showIf) return true;
    const live = watched[f.showIf.field];
    // Strict equality matches the documented contract; coerce live values to
    // string only when the predicate is a string (form inputs emit strings).
    if (typeof f.showIf.equals === 'string') {
      return String(live ?? '') === f.showIf.equals;
    }
    return live === f.showIf.equals;
  });

  // Surfaced first: fields that ARE form-hidden but need to ride the form so
  // their values still post (e.g. `code` autoGenerate).
  return (
    <form ref={formRef} action={formAction} onChange={onFormChange}>
      <input type="hidden" name="__locale" value={locale} />
      <input type="hidden" name="__slug" value={slug} />
      <input type="hidden" name="__forceDuplicate" value={force ? '1' : ''} />
      {isEdit && recordId ? <input type="hidden" name="__id" value={recordId} /> : null}

      <div className="action-bar">
        <div className="left">
          {!readOnly ? (
            <button type="submit" className="btn btn-primary" disabled={pending || actionPending}>
              {isEdit ? (
                <>
                  <Save size={14} strokeWidth={1.75} />
                  {pending ? tc('saving') : tc('save')}
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={1.75} />
                  {pending ? tc('saving') : tc('save')}
                </>
              )}
            </button>
          ) : null}

          {!readOnly && isEdit && cloneActionByLocale && recordId ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClone}
              disabled={pending || actionPending}
            >
              <Copy size={14} strokeWidth={1.75} />
              {tc('copy')}
            </button>
          ) : null}

          {!readOnly && isEdit && archiveActionByLocale && recordId && !isArchived ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onArchive}
              disabled={pending || actionPending}
            >
              <Archive size={14} strokeWidth={1.75} />
              {tc('archive')}
            </button>
          ) : null}

          {!readOnly && isEdit && deleteActionByLocale && recordId ? (
            <DeleteConfirmDialog
              title={tc('deleteConfirmTitle')}
              description={tc('deleteConfirmBody', {
                name: String(displayValues[config.displayField ?? 'name'] ?? recordId),
              })}
              onConfirm={onDelete}
              trigger={
                <button type="button" className="btn btn-ghost" disabled={pending || actionPending}>
                  <Trash2 size={14} strokeWidth={1.75} />
                  {tc('delete')}
                </button>
              }
            />
          ) : null}

          <Link href={listHref} className="btn btn-ghost">
            {isEdit ? tc('close') : tCommon('cancel')}
          </Link>
        </div>
        {lastEdited ? (
          <div className="right" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {tc('lastEdited')}: {lastEdited}
          </div>
        ) : null}
      </div>

      {formError && !isPlanLimit ? (
        <div className="field-error" style={{ marginBottom: 12 }}>
          <AlertTriangle size={12} strokeWidth={1.75} />
          {formError}
        </div>
      ) : null}
      {warning === 'duplicateName' && !force ? (
        <div
          className="field-error"
          style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <AlertTriangle size={12} strokeWidth={1.75} />
          <span>{tc('duplicateNameWarning')}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setForce(true)}
            disabled={pending || actionPending}
          >
            {tc('createAnyway')}
          </button>
        </div>
      ) : null}
      {isPlanLimit ? <PlanLimitDialog token={state} /> : null}

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">{cardTitle ?? fallbackCardTitle}</div>
          </div>
          <fieldset
            disabled={readOnly}
            style={{ display: 'contents', border: 0, padding: 0, margin: 0, minInlineSize: 0 }}
          >
            <div className="form-grid">
              {visibleFields.map(([name, field]) => (
                <V2AutoField
                  key={name}
                  name={name}
                  field={field}
                  locale={locale}
                  defaultValue={displayValues[name]}
                  refDefaultSelected={refDefaults[name]}
                  fieldError={fieldErrors?.[name]?.[0]}
                />
              ))}
            </div>
          </fieldset>
          {afterFields}
        </section>

        {asideCards ? <aside>{asideCards}</aside> : null}
      </div>
    </form>
  );
}

/**
 * Display transform: number fields tagged with `transform: 'percentFraction'`
 * are stored as fractions (0.10) but rendered as percent (10). Pure.
 */
function applyDisplayTransforms(
  values: Record<string, unknown>,
  config: CatalogConfig,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.type !== 'number') continue;
    if (f.transform !== 'percentFraction') continue;
    if (!(name in out)) continue;
    const v = out[name];
    if (v == null) continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    out[name] = num * 100;
  }
  return out;
}
