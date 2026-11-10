/**
 * DSL field → Zod schema helpers.
 *
 * Currently unused by the catalog codegen (Task 5), which uses
 * `z.record(z.unknown())` for the polymorphic `fields` parameter to keep the
 * tool description prompt budget small (per-catalog field schemas would
 * explode the budget for ~9 catalogs × dozens of fields).
 *
 * Tasks 6-8 (document / register / report tools) MAY use these helpers if
 * those tools need to validate per-config schemas at the MCP boundary rather
 * than the engine. Keeping the helpers + their tests now so the codegen has a
 * battle-tested utility when those tasks land.
 *
 * Kept aligned with the field-type discriminator in
 * `platform/metadata/types.ts`. The `FieldType` union there is the source of
 * truth; this file mirrors it in a smaller surface focused on MCP needs.
 */
import { z, type ZodTypeAny } from 'zod';

/**
 * Mirror of the DSL field types used by configs/*.
 * Subset of FieldType from platform/metadata/types.ts focused on MCP I/O.
 *
 * Notes:
 * - `text` collapses onto `string` semantics for MCP arg shapes (length
 *   bounds are enforced engine-side).
 * - `decimal` exists for parity with NUMERIC columns; `int` rejects floats.
 * - `ref` accepts a UUID string — config DSL refs always point to catalog
 *   primary keys, which are UUIDs across the entire schema.
 */
export type DslFieldType =
  | 'string'
  | 'text'
  | 'int'
  | 'decimal'
  | 'bool'
  | 'date'
  | 'dateTime'
  | 'ref'
  | 'enum';

export interface DslFieldDescriptor {
  type: DslFieldType;
  optional?: boolean;
  enumValues?: string[];
  refConfigId?: string;
}

export function fieldToZod(field: DslFieldDescriptor): ZodTypeAny {
  let base: ZodTypeAny;
  switch (field.type) {
    case 'string':
    case 'text':
      base = z.string();
      break;
    case 'int':
      base = z.number().int();
      break;
    case 'decimal':
      base = z.number();
      break;
    case 'bool':
      base = z.boolean();
      break;
    case 'date':
    case 'dateTime':
      base = z.string().datetime({ offset: true });
      break;
    case 'ref':
      base = z.string().uuid();
      break;
    case 'enum':
      if (!field.enumValues?.length) throw new Error('enum field missing enumValues');
      base = z.enum(field.enumValues as [string, ...string[]]);
      break;
    default: {
      // Exhaustive-narrow guard — any future addition to DslFieldType breaks
      // the build here until this switch is extended.
      const _exhaustive: never = field.type;
      throw new Error(`unsupported field type: ${_exhaustive as string}`);
    }
  }
  return field.optional ? base.optional() : base;
}

export function fieldsToZodObject(
  fields: Record<string, DslFieldDescriptor>,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [k, f] of Object.entries(fields)) shape[k] = fieldToZod(f);
  return z.object(shape);
}
