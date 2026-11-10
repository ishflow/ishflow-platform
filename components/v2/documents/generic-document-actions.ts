'use server';

import '@/configs';

import {
  createAndPostDocumentRecord,
  createDocumentRecord,
  deleteDocumentRecord,
  updateAndPostDocumentRecord,
  updateDocumentRecord,
} from '@/app/[locale]/(app)/documents/[entity]/actions';
import { documentKeyFromSlug } from '@/lib/v2-shell/document-slug-map';
import {
  type DocumentConfig,
  type FieldConfig,
  type LineSectionConfig,
  getRegistry,
} from '@/platform/metadata';
import type { ActionResult } from '@/platform/ui';
import { revalidatePath } from 'next/cache';

/**
 * Unified V2 document submit action.
 *
 * Reads `__slug`, `__locale`, `__intent` ('save' | 'post'), optional `__id`
 * from the form. Resolves the engine document config via the slug map and
 * parses FormData by walking the DSL header fields + each line section.
 * Routes to one of four engine actions:
 *   - create draft     →  createDocumentRecord
 *   - create + post    →  createAndPostDocumentRecord
 *   - update draft     →  updateDocumentRecord
 *   - update + post    →  updateAndPostDocumentRecord
 *
 * Field names in the FormData mirror the DSL exactly — `customer`, not
 * `customerId`, etc. Number / money / percentFraction transforms are
 * applied per-field so the engine's zod schema sees fraction-storage
 * values it expects.
 */
export async function submitDocumentAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const locale = String(formData.get('__locale') ?? 'tr');
  const slug = String(formData.get('__slug') ?? '');
  const id = String(formData.get('__id') ?? '').trim();
  const intent = String(formData.get('__intent') ?? 'save');
  const post = intent === 'post';
  if (!slug) return { ok: false, formError: 'Missing __slug' };
  const docKey = documentKeyFromSlug(slug);
  if (!docKey) return { ok: false, formError: `Unknown document slug "${slug}"` };

  const config = getRegistry().document[docKey];
  if (!config) return { ok: false, formError: `Document config not registered for ${docKey}` };

  const values = collectDocumentValues(config, formData);

  const result = id
    ? post
      ? await updateAndPostDocumentRecord(locale, docKey, id, values)
      : await updateDocumentRecord(locale, docKey, id, values)
    : post
      ? await createAndPostDocumentRecord(locale, docKey, values)
      : await createDocumentRecord(locale, docKey, values);

  if (result.ok) {
    revalidatePath(`/${locale}/documents/${slug}`, 'page');
    revalidatePath(`/${locale}/purchases/${slug}`, 'page');
    revalidatePath(`/${locale}/dashboard`, 'page');
    const { redirectTo: _drop, ...rest } = result;
    return rest;
  }
  return result;
}

export async function deleteDocumentActionBySlug(
  locale: string,
  slug: string,
  id: string,
): Promise<ActionResult> {
  const docKey = documentKeyFromSlug(slug);
  if (!docKey) return { ok: false, formError: `Unknown document slug "${slug}"` };
  return deleteDocumentRecord(locale, docKey, id);
}

/**
 * Walk the document config + form data to produce a values object the V1
 * engine's zod schema can validate. Applies field-level coercion (number,
 * money, boolean, percentFraction).
 */
function collectDocumentValues(
  config: DocumentConfig,
  formData: FormData,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  // Header.
  for (const [name, field] of Object.entries(config.header)) {
    const raw = formData.get(name);
    const value = coerceFieldValue(name, field, raw, formData);
    if (value !== undefined) values[name] = value;
  }

  // Line sections.
  if (config.lines) {
    const linesOut: Record<string, unknown[]> = {};
    for (const [sectionKey, section] of Object.entries(config.lines)) {
      linesOut[sectionKey] = collectLineSection(section, formData, sectionKey);
    }
    values.lines = linesOut;
  }

  return values;
}

function collectLineSection(
  section: LineSectionConfig,
  formData: FormData,
  sectionKey: string,
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 200; i++) {
    const row: Record<string, unknown> = {};
    let hasAny = false;
    for (const [fname, field] of Object.entries(section.fields)) {
      const raw = formData.get(`lines[${sectionKey}][${i}].${fname}`);
      // Backwards-compatible fallback: legacy V2 wizards use
      // `lines[${i}].${fname}` because they only ever support one line
      // section (`items`). Keep that working so we can migrate piecewise.
      const fallback = raw ?? formData.get(`lines[${i}].${fname}`);
      if (fallback !== null && fallback !== '') hasAny = true;
      const coerced = coerceFieldValue(fname, field, fallback, formData);
      if (coerced !== undefined) row[fname] = coerced;
    }
    if (!hasAny) break;
    if (Object.keys(row).length === 0) continue;
    rows.push(row);
  }
  return rows;
}

/**
 * Coerce a raw FormData value to the shape the engine's zod schema expects
 * for the field type. Returns `undefined` to mean "don't include in the
 * values object" (lets the engine apply DSL defaults).
 */
function coerceFieldValue(
  name: string,
  field: FieldConfig,
  raw: FormDataEntryValue | null,
  formData: FormData,
): unknown {
  if (field.type === 'boolean') {
    const marker = formData.get(`__bool:${name}`);
    if (marker !== null) {
      return marker === 'true' || marker === 'on' || marker === '1';
    }
    if (raw === null || raw === '') return false;
    return raw === 'true' || raw === 'on';
  }

  if (raw === null) return undefined;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;

  switch (field.type) {
    case 'number': {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return undefined;
      if (field.transform === 'percentFraction') return n / 100;
      return n;
    }
    case 'money': {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'date':
    case 'datetime':
      return trimmed; // engine accepts ISO-ish strings
    default:
      return trimmed;
  }
}
