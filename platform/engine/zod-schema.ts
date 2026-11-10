import type { CatalogConfig, FieldConfig, LineSectionConfig } from '@/platform/metadata';
import { z } from 'zod';

/**
 * Build a Zod object schema from a catalog configuration. Used by both the
 * client form (via zodResolver) and the server action for validation parity.
 * If a `lines` map is supplied (document case), each section becomes a nested
 * array of row schemas under `lines.<sectionKey>`.
 */
export function buildZodSchema(
  config: CatalogConfig,
  lines?: Record<string, LineSectionConfig>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.hidden || f.formHidden) continue;
    shape[name] = leafFor(f);
  }
  if (lines && Object.keys(lines).length > 0) {
    const linesShape: Record<string, z.ZodTypeAny> = {};
    for (const [sectionKey, section] of Object.entries(lines)) {
      linesShape[sectionKey] = buildLineArraySchema(section);
    }
    shape.lines = z.object(linesShape);
  }
  return z.object(shape);
}

function buildLineArraySchema(section: LineSectionConfig): z.ZodTypeAny {
  const rowShape: Record<string, z.ZodTypeAny> = { id: z.string().uuid().optional() };
  for (const [name, f] of Object.entries(section.fields)) {
    if (f.hidden || f.formHidden) continue;
    rowShape[name] = leafFor(f);
  }
  const minRows = section.minRows ?? 0;
  return z.array(z.object(rowShape)).min(minRows);
}

function leafFor(f: FieldConfig): z.ZodTypeAny {
  let leaf: z.ZodTypeAny;

  switch (f.type) {
    case 'string': {
      if (f.enumValues && f.enumValues.length > 0) {
        // Closed-enum string: zod's `enum` accepts a readonly tuple of
        // literals. We coerce the runtime values via a refinement so the
        // schema still surfaces a 'required' error when the field is empty.
        const values = f.enumValues as readonly [string, ...string[]];
        const e = z.enum(values);
        if (!f.required) {
          leaf = z.union([z.literal(''), e]).optional();
        } else {
          leaf = e;
        }
        break;
      }
      let s = z.string();
      if (f.maxLength) s = s.max(f.maxLength);
      if (f.required) s = s.min(1, 'required');
      if (f.email) {
        // Validate the address format, but tolerate empty so optional email
        // fields stay optional — `required` above already rejects empty.
        leaf = s.refine(
          (v) => v === '' || z.string().email().safeParse(v).success,
          'invalid_email',
        );
        break;
      }
      leaf = s;
      break;
    }
    case 'text': {
      let s = z.string();
      if (f.required) s = s.min(1, 'required');
      leaf = s;
      break;
    }
    case 'number': {
      let n = z.coerce.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      leaf = n;
      break;
    }
    case 'money': {
      leaf = z.coerce.number().nonnegative();
      break;
    }
    case 'boolean': {
      leaf = z.coerce.boolean();
      break;
    }
    case 'date':
    case 'datetime': {
      leaf = z.coerce.date();
      break;
    }
    case 'reference':
    case 'docRef': {
      leaf = z.string().uuid();
      break;
    }
    case 'docNumber': {
      leaf = z.string();
      break;
    }
    case 'documentLink': {
      // Persists the linked-invoice JSON array as a TEXT column.
      // Engine helpers (parseLinkedInvoices) handle the parse at posting.
      leaf = z.string();
      break;
    }
    case 'color': {
      // Persisted as `#rrggbb` (lowercased). Strict regex; the swatch UI is
      // responsible for never emitting invalid values.
      leaf = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalid_color');
      break;
    }
    case 'custom': {
      // Custom fields are renderer-owned; the engine accepts any value and
      // leaves validation to the renderer or the SettingsConfig.schema.
      leaf = z.unknown();
      break;
    }
  }

  if (!f.required) {
    leaf = z.preprocess((v) => (v === '' || v === null ? undefined : v), leaf.optional());
  }

  return leaf;
}
