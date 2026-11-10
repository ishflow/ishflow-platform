import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema as convert } from 'zod-to-json-schema';

/**
 * Convert a Zod schema to a JSON Schema 7 object suitable for the MCP
 * `tools/list` response. The `$schema` meta-key is stripped because MCP
 * clients infer the JSON Schema version from context and the meta-key
 * adds noise to the prompt budget.
 */
export function zodToJsonSchema(schema: ZodTypeAny): object {
  const { $schema: _omit, ...rest } = convert(schema, { target: 'jsonSchema7' }) as Record<
    string,
    unknown
  > & { $schema?: unknown };
  return rest;
}
