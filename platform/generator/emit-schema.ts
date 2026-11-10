import { getRegistry } from '@/platform/metadata';
import type {
  AccumulationRegisterConfig,
  CatalogConfig,
  DocumentConfig,
  FieldConfig,
  LineSectionConfig,
} from '@/platform/metadata';

export function emitSchema(): string {
  const out: string[] = [];
  const registry = getRegistry();

  for (const c of Object.values(registry.catalog).sort(byId)) {
    out.push(emitCatalog(c));
  }
  for (const d of Object.values(registry.document).sort(byId)) {
    out.push(emitDocument(d));
    if (d.lines) {
      for (const sectionKey of Object.keys(d.lines).sort()) {
        const section = d.lines[sectionKey];
        if (section) out.push(emitDocumentLine(d, sectionKey, section));
      }
    }
  }
  for (const r of Object.values(registry.register).sort(byId)) {
    out.push(emitMovement(r));
  }

  return out.join('\n\n');
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id);
}

// ─── Catalog ───────────────────────────────────────────────────────────────

function emitCatalog(c: CatalogConfig): string {
  const modelName = `Catalog_${c.module}_${c.name}`;
  const tableName = `catalog_${c.module}_${c.name}`;
  const lines: string[] = [`model ${modelName} {`];
  lines.push('  id        String   @id @default(uuid()) @db.Uuid');
  lines.push('  tenantId  String   @map("tenant_id") @db.Uuid');
  for (const [name, cfg] of Object.entries(c.fields)) {
    lines.push(`  ${renderField(name, cfg)}`);
  }
  lines.push('  createdAt DateTime @default(now()) @map("created_at")');
  lines.push('  updatedAt DateTime @updatedAt @map("updated_at")');
  lines.push('  deletedAt DateTime? @map("deleted_at")');
  lines.push('');
  lines.push(`  @@map("${tableName}")`);
  for (const uniq of emitCompositeUniques(c.fields)) {
    lines.push(uniq);
  }
  lines.push('  @@index([tenantId])');
  lines.push('  @@index([tenantId, deletedAt])');
  lines.push('  @@index([tenantId, createdAt])');
  const displayIndex = displayFieldIndex(c.displayField, c.fields);
  if (displayIndex) lines.push(`  @@index([tenantId, ${displayIndex}])`);
  lines.push('}');
  return lines.join('\n');
}

// ─── Document ──────────────────────────────────────────────────────────────

function emitDocument(d: DocumentConfig): string {
  const modelName = `Document_${d.module}_${d.name}`;
  const tableName = `document_${d.module}_${d.name}`;
  const lines: string[] = [`model ${modelName} {`];
  lines.push('  id        String   @id @default(uuid()) @db.Uuid');
  lines.push('  tenantId  String   @map("tenant_id") @db.Uuid');
  lines.push('  number    String');
  lines.push('  status    String   @default("SAVED")');
  lines.push('  postedAt  DateTime? @map("posted_at")');
  lines.push('  postedBy  String?   @map("posted_by") @db.Uuid');
  lines.push('  version   Int       @default(0)');
  for (const [name, cfg] of Object.entries(d.header)) {
    // docNumber is represented by the top-level `number` column above.
    // Reserved system columns cannot be shadowed by header fields.
    if (cfg.type === 'docNumber') continue;
    if (RESERVED_DOC_FIELDS.has(name)) continue;
    lines.push(`  ${renderField(name, cfg)}`);
  }
  lines.push('  createdAt DateTime @default(now()) @map("created_at")');
  lines.push('  updatedAt DateTime @updatedAt @map("updated_at")');
  lines.push('  deletedAt DateTime? @map("deleted_at")');
  lines.push('');
  lines.push(`  @@map("${tableName}")`);
  lines.push('  @@unique([tenantId, number])');
  for (const uniq of emitCompositeUniques(d.header)) {
    lines.push(uniq);
  }
  lines.push('  @@index([tenantId])');
  lines.push('  @@index([tenantId, deletedAt])');
  lines.push('  @@index([tenantId, status])');
  lines.push('  @@index([tenantId, postedAt])');
  lines.push('  @@index([tenantId, createdAt])');
  const displayIndex = displayFieldIndex(d.displayField, d.header);
  if (displayIndex) lines.push(`  @@index([tenantId, ${displayIndex}])`);
  lines.push('}');
  return lines.join('\n');
}

// ─── Document Line (per section) ───────────────────────────────────────────

function emitDocumentLine(
  d: DocumentConfig,
  sectionKey: string,
  section: LineSectionConfig,
): string {
  const modelName = `DocumentLine_${d.module}_${d.name}_${sectionKey}`;
  const tableName = `document_line_${d.module}_${d.name}_${sectionKey}`;
  const lines: string[] = [`model ${modelName} {`];
  lines.push('  id        String   @id @default(uuid()) @db.Uuid');
  lines.push('  tenantId  String   @map("tenant_id") @db.Uuid');
  lines.push('  documentId String   @map("document_id") @db.Uuid');
  lines.push('  sequence  Int');
  for (const [name, cfg] of Object.entries(section.fields)) {
    if (RESERVED_LINE_FIELDS.has(name)) continue;
    lines.push(`  ${renderField(name, cfg)}`);
  }
  lines.push('  createdAt DateTime @default(now()) @map("created_at")');
  lines.push('  updatedAt DateTime @updatedAt @map("updated_at")');
  lines.push('');
  lines.push(`  @@map("${tableName}")`);
  lines.push('  @@unique([tenantId, documentId, sequence])');
  lines.push('  @@index([tenantId])');
  lines.push('  @@index([tenantId, documentId])');
  lines.push('}');
  return lines.join('\n');
}

const RESERVED_LINE_FIELDS = new Set([
  'id',
  'tenantId',
  'documentId',
  'sequence',
  'createdAt',
  'updatedAt',
]);

// ─── Movement (per Accumulation Register) ──────────────────────────────────

function emitMovement(r: AccumulationRegisterConfig): string {
  const modelName = `Movement_${r.module}_${r.name}`;
  const tableName = `movement_${r.module}_${r.name}`;
  const lines: string[] = [`model ${modelName} {`];
  lines.push('  id        String   @id @default(uuid()) @db.Uuid');
  lines.push('  tenantId  String   @map("tenant_id") @db.Uuid');
  lines.push('  docRef    String   @map("doc_ref") @db.Uuid');
  lines.push('  docType   String   @map("doc_type")');
  lines.push('  kind      String');
  lines.push('  active    Boolean  @default(true)');
  lines.push('  timestamp DateTime');
  for (const [name, cfg] of Object.entries(r.dimensions)) {
    lines.push(`  ${renderField(name, cfg)}`);
  }
  for (const [name, cfg] of Object.entries(r.resources)) {
    lines.push(`  ${renderField(name, cfg)}`);
  }
  lines.push('  createdAt DateTime @default(now()) @map("created_at")');
  lines.push('');
  lines.push(`  @@map("${tableName}")`);
  lines.push('  @@index([tenantId])');
  lines.push('  @@index([tenantId, active])');
  lines.push('  @@index([tenantId, docRef])');
  lines.push('  @@index([tenantId, active, timestamp])');
  const dimKeys = Object.keys(r.dimensions);
  if (dimKeys.length > 0) {
    lines.push(`  @@index([tenantId, ${dimKeys.join(', ')}, timestamp])`);
  }
  lines.push('}');
  return lines.join('\n');
}

const RESERVED_DOC_FIELDS = new Set([
  'id',
  'tenantId',
  'number',
  'status',
  'postedAt',
  'postedBy',
  'version',
  'createdAt',
  'updatedAt',
  'deletedAt',
]);

// ─── Shared helpers ────────────────────────────────────────────────────────

function displayFieldIndex(
  fieldName: string | undefined,
  fields: Record<string, FieldConfig>,
): string | undefined {
  if (!fieldName) return undefined;
  const cfg = fields[fieldName];
  if (!cfg) return undefined;
  if (cfg.type !== 'string' && cfg.type !== 'text') return undefined;
  return fieldName;
}

function renderField(name: string, cfg: FieldConfig): string {
  const optional = cfg.required ? '' : '?';
  // Pad to at least 10 chars but always leave a minimum of 1 space.
  const n = name.padEnd(Math.max(10, name.length + 1));
  switch (cfg.type) {
    case 'string':
      return `${n}${`String${optional}`.padEnd(9)}`.trimEnd();
    case 'text':
      return `${n}${`String${optional}`.padEnd(9)}@db.Text`.trimEnd();
    case 'number':
      return `${n}${`Int${optional}`.padEnd(9)}`.trimEnd();
    case 'money':
      return `${n}${`Decimal${optional}`.padEnd(9)}@db.Decimal(14, 2)`.trimEnd();
    case 'boolean': {
      const def = cfg.default !== undefined ? `@default(${cfg.default})` : '';
      return `${n}${`Boolean${optional}`.padEnd(9)}${def}`.trimEnd();
    }
    case 'date':
      return `${n}${`DateTime${optional}`.padEnd(9)}`.trimEnd();
    case 'datetime':
      return `${n}${`DateTime${optional}`.padEnd(9)}`.trimEnd();
    case 'reference':
      return `${n}${`String${optional}`.padEnd(9)}@db.Uuid // ref -> ${cfg.to.module}.${cfg.to.name}`.trimEnd();
    case 'docNumber':
      return `${n}${`String${optional}`.padEnd(9)}`.trimEnd();
    case 'docRef':
      return `${n}${`String${optional}`.padEnd(9)}@db.Uuid`.trimEnd();
    case 'documentLink':
      // Persists as TEXT — payload is a JSON `[{invoiceId, amount}]` array.
      return `${n}${`String${optional}`.padEnd(9)}@db.Text`.trimEnd();
    case 'color':
      // 7-char `#rrggbb` value validated by the engine's zod schema.
      return `${n}${`String${optional}`.padEnd(9)}@db.VarChar(7)`.trimEnd();
    case 'custom':
      // Custom fields are renderer-owned; stored as TEXT in the DB.
      return `${n}${`String${optional}`.padEnd(9)}@db.Text`.trimEnd();
  }
}

// Tenant-scoped composite unique — two fresh tenants can share the same
// user-facing "unique" field value (e.g. product SKU) without colliding at
// the database level.
function emitCompositeUniques(fields: Record<string, FieldConfig>): string[] {
  const out: string[] = [];
  for (const [name, cfg] of Object.entries(fields)) {
    if ('unique' in cfg && cfg.unique) {
      out.push(`  @@unique([tenantId, ${name}])`);
    }
  }
  return out;
}
