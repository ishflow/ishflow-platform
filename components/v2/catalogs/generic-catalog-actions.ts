'use server';

import '@/configs';

import {
  createCatalogRecord,
  deleteCatalogRecord,
  updateCatalogRecord,
} from '@/app/[locale]/(app)/catalogs/[entity]/actions';
import { engineKeyFromRefEntity, entityKeyFromCatalogSlug } from '@/lib/v2-shell/entity-slug-map';
import { requireTenantContext } from '@/platform/auth/current-context';
import { NotFoundError, PermissionDeniedError, getRecord } from '@/platform/engine';
import { type CatalogConfig, getRegistry } from '@/platform/metadata';
import type { ActionResult } from '@/platform/ui';

/**
 * Unified V2 catalog submit action.
 *
 * Reads `__slug`, `__locale`, optional `__id` from the form, picks the
 * engine entity key via the slug map, and routes to `createCatalogRecord`
 * or `updateCatalogRecord`. Drops V1's `redirectTo` so the V2 client decides
 * where to navigate (V2 list paths differ from V1's).
 *
 * Booleans arrive as `'true'` / `'false'` strings — caller may emit
 * `__bool:fieldName` markers but for catalog fields a value of literal
 * `'true'` is also coerced when the DSL field type is boolean. Coercion
 * is centralized in `coerceFormValues` to keep field handling consistent.
 */
export async function submitCatalogAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = String(formData.get('__locale') ?? 'tr');
  const slug = String(formData.get('__slug') ?? '');
  const id = String(formData.get('__id') ?? '').trim();
  if (!slug) return { ok: false, formError: 'Missing __slug' };
  const entityKey = entityKeyFromCatalogSlug(slug);
  if (!entityKey) return { ok: false, formError: `Unknown catalog slug "${slug}"` };

  const config = getRegistry().catalog[entityKey];
  const rawValues = valuesFromFormData(formData);
  const values = config ? applySaveTransforms(rawValues, config) : rawValues;

  const result = id
    ? await updateCatalogRecord(locale, entityKey, id, values)
    : await createCatalogRecord(
        locale,
        entityKey,
        values,
        formData.get('__forceDuplicate') === '1',
      );
  if (result.ok) {
    // Drop V1 redirectTo — client knows its own list path.
    const { redirectTo: _drop, ...rest } = result;
    return rest;
  }
  return result;
}

/**
 * Delete a catalog record by slug + id. Returns the V1 result verbatim
 * (caller decides what to do with `redirectTo`).
 */
export async function deleteCatalogActionBySlug(
  locale: string,
  slug: string,
  id: string,
): Promise<ActionResult> {
  const entityKey = entityKeyFromCatalogSlug(slug);
  if (!entityKey) return { ok: false, formError: `Unknown catalog slug "${slug}"` };
  return deleteCatalogRecord(locale, entityKey, id);
}

/**
 * Same wire as delete — the engine's soft-delete IS setting `deletedAt`
 * via `deleteCatalogRecord`. Keep a separate action name so the UI can
 * surface a distinct "Archive" button (intent reads differently to users
 * even though the underlying mutation is identical).
 */
export async function archiveCatalogActionBySlug(
  locale: string,
  slug: string,
  id: string,
): Promise<ActionResult> {
  const entityKey = entityKeyFromCatalogSlug(slug);
  if (!entityKey) return { ok: false, formError: `Unknown catalog slug "${slug}"` };
  return deleteCatalogRecord(locale, entityKey, id);
}

/**
 * Inline-create handler for `RefCombobox` invoked from any V2 form whose
 * DSL ref field carries `inlineCreate: true`. Resolves the engine entity
 * key from the picker slug, creates a row with just the displayField set,
 * and returns the new option shape the combobox expects.
 */
export async function inlineCreateByRefEntity(
  locale: string,
  refSlug: string,
  rawName: string,
): Promise<
  { ok: true; id: string; name: string } | { ok: false; error: 'duplicate' | 'errorGeneric' }
> {
  const name = rawName.trim();
  if (!name) return { ok: false, error: 'errorGeneric' };
  const entityKey = engineKeyFromRefEntity(refSlug);
  if (!entityKey) return { ok: false, error: 'errorGeneric' };
  const config = getRegistry().catalog[entityKey];
  if (!config) return { ok: false, error: 'errorGeneric' };
  const displayField = config.displayField ?? 'name';
  const result = await createCatalogRecord(locale, entityKey, { [displayField]: name });
  if (result.ok) {
    const id = (result.data as { id?: string })?.id;
    if (!id) return { ok: false, error: 'errorGeneric' };
    return { ok: true, id, name };
  }
  const uniqueViolation = result.fieldErrors?.[displayField]?.[0] === 'fieldErrorUnique';
  return { ok: false, error: uniqueViolation ? 'duplicate' : 'errorGeneric' };
}

/**
 * Generic record clone: reads the source via the engine (RLS-scoped),
 * strips identity / timestamps / auto-generated fields, suffixes the
 * displayField with " (copy)", and creates a new record. Works for any
 * catalog without per-entity wiring.
 */
export async function cloneCatalogActionBySlug(
  locale: string,
  slug: string,
  id: string,
): Promise<ActionResult> {
  const entityKey = entityKeyFromCatalogSlug(slug);
  if (!entityKey) return { ok: false, formError: `Unknown catalog slug "${slug}"` };
  const config = getRegistry().catalog[entityKey];
  if (!config) return { ok: false, formError: 'Catalog config missing' };

  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return { ok: false, formError: 'unauthorized' };
  }

  let source: Record<string, unknown>;
  try {
    source = await getRecord(ctx, config, id);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof PermissionDeniedError) {
      return { ok: false, formError: 'notFound' };
    }
    throw err;
  }

  const cloneValues = buildCloneValues(config, source);
  return createCatalogRecord(locale, entityKey, cloneValues);
}

/**
 * Build the values for the clone insert. Drops id + timestamps + fields
 * with `autoGenerate: 'sequence'` (engine will mint fresh ones), then
 * appends " (copy)" to the displayField (or `name`) so the user can tell
 * the duplicate apart in the list.
 */
function buildCloneValues(
  config: CatalogConfig,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const skip = new Set(['id', 'tenantId', 'createdAt', 'updatedAt', 'deletedAt']);
  const out: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(config.fields)) {
    if (skip.has(name)) continue;
    // Skip fields the engine auto-generates so the clone gets a fresh
    // value rather than colliding with the source's unique sequence.
    if (field.autoGenerate === 'sequence') continue;
    if (!(name in source)) continue;
    const v = source[name];
    if (v == null || v === '') continue;
    out[name] = v;
  }
  const displayField = config.displayField ?? 'name';
  const displayValue = out[displayField];
  if (typeof displayValue === 'string') {
    out[displayField] = `${displayValue} (copy)`;
  }
  return out;
}

/**
 * Apply each number field's named save transform. Only `percentFraction`
 * is supported today (mirrors `platform/ui/entity-form.tsx`). Pure.
 */
function applySaveTransforms(
  values: Record<string, unknown>,
  config: CatalogConfig,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.type !== 'number') continue;
    if (f.transform !== 'percentFraction') continue;
    if (!(name in out)) continue;
    const v = out[name];
    if (v === '' || v == null) {
      out[name] = null;
      continue;
    }
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    out[name] = num / 100;
  }
  return out;
}

function valuesFromFormData(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const boolFields = new Set<string>();

  // First pass: collect __bool:<name> markers so we know which fields the
  // caller intends as booleans even when the checkbox was unchecked (no
  // value in formData).
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('__bool:')) {
      boolFields.add(k.slice('__bool:'.length));
      values[k.slice('__bool:'.length)] = v === 'true' || v === 'on' || v === '1';
    }
  }

  for (const [k, v] of formData.entries()) {
    if (k.startsWith('__')) continue;
    if (boolFields.has(k)) continue; // already coerced
    if (v === '') continue;
    values[k] = v;
  }

  return values;
}
