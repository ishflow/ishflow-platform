import { getRegistry } from '@/platform/metadata';

type DocConfig = ReturnType<typeof getRegistry>['document'][string];

/**
 * Normalize a mobile-shaped payload to the engine's field-name conventions.
 *
 * iOS / Android clients ship with `<ref>Id` field names (`customerId`,
 * `productId`, `warehouseId`, `priceTypeId`) and `unitPrice` for line money
 * fields, but the document configs / Prisma columns use the bare reference
 * name (`customer`, `product`, `warehouse`, `priceType`) and `price`. The
 * engine's `splitPayload` does NO field-name translation, so without this
 * step every mobile create / update raises `Argument 'customer' is missing`
 * from Prisma.
 *
 * The translation is config-driven: for each header / line field declared
 * in the document config, accept either the bare name OR `<name>Id`. The
 * legacy `unitPrice → price` alias is also applied at the line level when
 * the config declares a `price` field.
 *
 * Lives in a sibling helper file so both the create route (`[type]/route.ts`)
 * and the update route (`[type]/[id]/route.ts`) can share it without
 * cross-importing route handlers.
 */
export function normalizeMobileDocPayload(
  payload: Record<string, unknown>,
  config: DocConfig | undefined,
): Record<string, unknown> {
  if (!config) return payload;
  const headerFields = (config.header ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'lines') continue;
    if (k.endsWith('Id') && !(k in headerFields)) {
      const bare = k.slice(0, -2);
      if (bare in headerFields) {
        out[bare] = v;
        continue;
      }
    }
    out[k] = v;
  }

  if (config.lines && payload.lines !== undefined) {
    // iOS / Android ship `lines: [...]` (a flat array) for single-section
    // documents, but the engine expects `lines: { <sectionKey>: [...] }`.
    // When the payload is a flat array AND the config has exactly one line
    // section, wrap it under that section's key. Multi-section docs already
    // arrive as a section dict and pass through unchanged.
    const sectionConfigs = config.lines as Record<string, { fields?: Record<string, unknown> }>;
    const sectionKeys = Object.keys(sectionConfigs);
    let linesIn: Record<string, unknown>;
    if (Array.isArray(payload.lines) && sectionKeys.length === 1) {
      const onlyKey = sectionKeys[0];
      linesIn = onlyKey ? { [onlyKey]: payload.lines } : {};
    } else if (payload.lines && typeof payload.lines === 'object') {
      linesIn = payload.lines as Record<string, unknown>;
    } else {
      linesIn = {};
    }

    const linesOut: Record<string, unknown> = {};
    for (const [section, rows] of Object.entries(linesIn)) {
      const sectionConfig = sectionConfigs[section];
      if (!sectionConfig || !Array.isArray(rows)) {
        linesOut[section] = rows;
        continue;
      }
      const lineFields = sectionConfig.fields ?? {};
      linesOut[section] = rows.map((row: unknown) => {
        if (typeof row !== 'object' || row === null) return row;
        const lineOut: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
          let targetKey = k;
          if (k === 'unitPrice' && 'price' in lineFields) {
            targetKey = 'price';
          } else if (k.endsWith('Id') && !(k in lineFields)) {
            const bare = k.slice(0, -2);
            if (bare in lineFields) targetKey = bare;
          }
          const fieldDef = (lineFields as Record<string, { type?: string }>)[targetKey];
          if (fieldDef?.type === 'number' && typeof v === 'string' && v.trim() !== '') {
            const n = Number(v);
            lineOut[targetKey] = Number.isFinite(n) ? n : v;
            continue;
          }
          lineOut[targetKey] = v;
        }
        return lineOut;
      });
    }
    out.lines = linesOut;
  }
  return out;
}
