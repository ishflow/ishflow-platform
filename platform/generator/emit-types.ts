import { getRegistry } from '@/platform/metadata';
import type { CatalogConfig, FieldConfig } from '@/platform/metadata';

const HEADER = `// GENERATED FILE — do not edit by hand. Run \`pnpm generate\`.
`;

export function emitTypes(): string {
  const parts: string[] = [HEADER];
  const catalogs = Object.values(getRegistry().catalog).sort((a, b) => a.id.localeCompare(b.id));
  for (const c of catalogs) {
    parts.push(emitInterface(c));
  }
  return parts.join('\n');
}

function emitInterface(c: CatalogConfig): string {
  const name = toPascal(`${c.module}_${c.name}`);
  const lines: string[] = [`export interface ${name} {`];
  lines.push('  id: string;');
  lines.push('  tenantId: string;');
  for (const [fieldName, cfg] of Object.entries(c.fields)) {
    const ts = tsType(cfg);
    const opt = cfg.required ? '' : ' | null';
    lines.push(`  ${fieldName}: ${ts}${opt};`);
  }
  lines.push('  createdAt: Date;');
  lines.push('  updatedAt: Date;');
  lines.push('  deletedAt: Date | null;');
  lines.push('}');
  return lines.join('\n');
}

function tsType(cfg: FieldConfig): string {
  switch (cfg.type) {
    case 'string':
    case 'text':
    case 'reference':
      return 'string';
    case 'number':
      return 'number';
    case 'money':
      return 'string'; // Prisma Decimal -> string at the wire
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
      return 'Date';
    case 'docNumber':
    case 'docRef':
    case 'documentLink':
      return 'string';
    case 'color':
      return 'string';
    case 'custom':
      // Custom fields are renderer-owned; stored as TEXT in the DB.
      return 'string';
  }
}

function toPascal(s: string): string {
  return s
    .split(/[_-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}
