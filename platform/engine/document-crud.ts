import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import type { DocumentConfig, FieldConfig, LineSectionConfig } from '@/platform/metadata';
import { writeAudit } from './audit-log';
import { InvalidStatusError, NotFoundError, PermissionDeniedError } from './errors';
import { assertPeriodOpen } from './period-close-guard';
import { check } from './permissions';
import { scopeMatches, scopeWhere } from './scopes';

function applyDocScope(
  ctx: AppContext,
  config: DocumentConfig,
  op: 'read' | 'create' | 'update' | 'delete' | 'post' | 'unpost',
  where: Record<string, unknown>,
): Record<string, unknown> {
  const sw = scopeWhere(ctx, config, op);
  if (!sw) return where;
  return { AND: [where, sw] };
}

type Op = 'read' | 'create' | 'update' | 'delete' | 'post' | 'unpost';

type PrismaDoc = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<number>;
};

type PrismaSequence = {
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};

type PrismaLine = {
  findMany: (args: unknown) => Promise<unknown[]>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
  createMany: (args: unknown) => Promise<unknown>;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function docDelegate(tx: unknown, config: DocumentConfig): PrismaDoc {
  const snake = `document_${config.module}_${config.name}`;
  const camel = `document${capitalize(config.module)}${capitalize(config.name)}`;
  const bag = tx as Record<string, PrismaDoc | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) throw new Error(`docDelegate: no Prisma model for ${snake}`);
  return d;
}

function sequenceDelegate(tx: unknown): PrismaSequence {
  const bag = tx as Record<string, PrismaSequence | undefined>;
  const d = bag.document_sequence ?? bag.documentSequence;
  if (!d) throw new Error('sequenceDelegate: DocumentSequence model not found');
  return d;
}

function lineDelegate(tx: unknown, config: DocumentConfig, sectionKey: string): PrismaLine {
  // Prisma lower-cases only the first character of the model name: our model
  // "DocumentLine_sales_invoice_items" is exposed as
  // "documentLine_sales_invoice_items" on the client.
  const prismaKey = `documentLine_${config.module}_${config.name}_${sectionKey}`;
  const snake = `document_line_${config.module}_${config.name}_${sectionKey}`;
  const bag = tx as Record<string, PrismaLine | undefined>;
  const d = bag[prismaKey] ?? bag[snake];
  if (!d) throw new Error(`lineDelegate: no Prisma model for ${prismaKey}`);
  return d;
}

type IncomingLine = { id?: string } & Record<string, unknown>;

const LINE_SYSTEM_FIELDS = new Set([
  'id',
  'tenantId',
  'documentId',
  'sequence',
  'createdAt',
  'updatedAt',
]);

function stripLineSystemFields(row: IncomingLine): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (LINE_SYSTEM_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function normaliseLines(
  lines: unknown,
  sections: Record<string, LineSectionConfig>,
): Record<string, IncomingLine[]> {
  const out: Record<string, IncomingLine[]> = {};
  const source = (lines ?? {}) as Record<string, unknown>;
  for (const sectionKey of Object.keys(sections)) {
    const raw = source[sectionKey];
    out[sectionKey] = Array.isArray(raw) ? (raw as IncomingLine[]) : [];
  }
  return out;
}

type HeaderAndLines = {
  header: Record<string, unknown>;
  lines: Record<string, IncomingLine[]>;
};

function splitPayload(data: Record<string, unknown>, config: DocumentConfig): HeaderAndLines {
  const { lines: rawLines, ...rest } = data;
  const sections = config.lines ?? {};
  return {
    header: stripSystemFields(rest as Record<string, unknown>),
    lines: normaliseLines(rawLines, sections),
  };
}

function checkDoc(ctx: AppContext, config: DocumentConfig, op: Op): void {
  check(ctx, config, op);
}

function prefixFor(config: DocumentConfig): string {
  for (const cfg of Object.values(config.header) as FieldConfig[]) {
    if (cfg.type === 'docNumber') return cfg.prefix;
  }
  return `${config.name.toUpperCase()}-`;
}

async function allocateNumber(
  tx: unknown,
  tenantId: string,
  config: DocumentConfig,
): Promise<string> {
  const seq = sequenceDelegate(tx);
  const prefix = prefixFor(config);
  const existing = (await seq.findUnique({
    where: { tenantId_docType: { tenantId, docType: config.id } },
  })) as { next: number } | null;
  let next: number;
  if (!existing) {
    await seq.create({ data: { tenantId, docType: config.id, prefix, next: 2 } });
    next = 1;
  } else {
    const updated = (await seq.update({
      where: { tenantId_docType: { tenantId, docType: config.id } },
      data: { next: { increment: 1 } },
    })) as { next: number };
    next = updated.next - 1;
  }
  return `${prefix}${String(next).padStart(6, '0')}`;
}

function stripSystemFields(data: Record<string, unknown>): Record<string, unknown> {
  // `deletedAt` + timestamps added (B1): the mobile/MCP write paths pass raw
  // JSON, so the engine must drop these server-managed columns or a client
  // could create-as-deleted / un-archive a document.
  const {
    id,
    tenantId,
    number,
    status,
    postedAt,
    postedBy,
    version,
    deletedAt,
    createdAt,
    updatedAt,
    ...rest
  } = data;
  void id;
  void tenantId;
  void number;
  void status;
  void postedAt;
  void postedBy;
  void version;
  void deletedAt;
  void createdAt;
  void updatedAt;
  return rest;
}

export type DocumentListOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: 'SAVED' | 'POSTED';
  where?: Record<string, unknown>;
};

export type DocumentListResult = {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export async function createDocument(
  ctx: AppContext,
  config: DocumentConfig,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  checkDoc(ctx, config, 'create');
  if (!ctx.tenant) throw new Error('createDocument: no tenant in context');
  if (!scopeMatches(ctx, config, data)) {
    throw new PermissionDeniedError(config.id, 'create');
  }
  const tenantId = ctx.tenant.id;
  const { header, lines } = splitPayload(data, config);
  // Sprint 21: if the doc has a `currency` header field and caller didn't set
  // one, fall back to the tenant's base currency so legacy callers keep working.
  if (config.header.currency && (header.currency === undefined || header.currency === null)) {
    const base = (ctx.tenant as { currency?: string } | null)?.currency ?? 'USD';
    header.currency = base;
  }
  // Auto-fill assignedBuyerId for buyer-scoped document entities
  const membershipRoles = (ctx.membership as unknown as { roles?: Array<{ name: string }> } | null)
    ?.roles;
  const hasBuyerRole = membershipRoles?.some((r) => r.name === 'buyer') ?? false;
  if (
    (config.id === 'purchases.invoice' || config.id === 'purchases.payment_sent') &&
    hasBuyerRole &&
    (header.assignedBuyerId === undefined || header.assignedBuyerId === null)
  ) {
    header.assignedBuyerId = ctx.user.id;
  }
  return (await withTenant(tenantId, async (tx) => {
    const docDate = (header.date as Date | undefined) ?? new Date();
    await assertPeriodOpen(ctx, docDate, tx, config.module);
    const number = await allocateNumber(tx, tenantId, config);
    // Denormalize assignedRepId from customer on document create (idempotent)
    if (header.customer && header.assignedRepId === undefined) {
      const customerTx = tx as unknown as Record<
        string,
        { findUnique: (args: unknown) => Promise<unknown> } | undefined
      >;
      const customerModel = customerTx.catalog_sales_customer;
      if (customerModel) {
        const customer = (await customerModel.findUnique({
          where: { id: header.customer as string },
        })) as { assignedRepId: string | null } | null;
        if (customer?.assignedRepId) {
          header.assignedRepId = customer.assignedRepId;
        }
      }
    }
    const created = (await docDelegate(tx, config).create({
      data: { tenantId, number, status: 'SAVED', version: 0, ...header },
    })) as Record<string, unknown>;
    const documentId = created.id as string;
    if (config.lines) {
      for (const [sectionKey, section] of Object.entries(config.lines)) {
        const rows = lines[sectionKey] ?? [];
        if (rows.length === 0) continue;
        await lineDelegate(tx, config, sectionKey).createMany({
          data: rows.map((row, i) => ({
            tenantId,
            documentId,
            sequence: i + 1,
            ...stripLineSystemFields(row),
          })),
        });
        // Surface fields back on the returned doc for ergonomic posting.
        void section;
      }
    }
    const linesOut = await loadLines(tx, config, documentId);
    if (linesOut) created.lines = linesOut;
    await writeAudit(tx, ctx, {
      entity: `document.${config.module}.${config.name}`,
      entityId: documentId,
      action: 'create',
      after: created,
    });
    return created;
  })) as Record<string, unknown>;
}

async function loadLines(
  tx: unknown,
  config: DocumentConfig,
  documentId: string,
): Promise<Record<string, unknown[]> | undefined> {
  if (!config.lines) return undefined;
  const out: Record<string, unknown[]> = {};
  for (const sectionKey of Object.keys(config.lines)) {
    const rows = await lineDelegate(tx, config, sectionKey).findMany({
      where: { documentId },
      orderBy: { sequence: 'asc' },
    });
    out[sectionKey] = rows as unknown[];
  }
  return out;
}

export async function getDocument(
  ctx: AppContext,
  config: DocumentConfig,
  id: string,
): Promise<Record<string, unknown>> {
  checkDoc(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('getDocument: no tenant in context');
  const result = await withTenant(ctx.tenant.id, async (tx) => {
    const found = (await docDelegate(tx, config).findUnique({ where: { id } })) as Record<
      string,
      unknown
    > | null;
    if (!found) return null;
    const lines = await loadLines(tx, config, id);
    if (lines) found.lines = lines;
    return found;
  });
  if (!result) throw new NotFoundError(config.id, id);
  if (!scopeMatches(ctx, config, result as Record<string, unknown>)) {
    throw new NotFoundError(config.id, id);
  }
  return result as Record<string, unknown>;
}

export async function updateDocument(
  ctx: AppContext,
  config: DocumentConfig,
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  checkDoc(ctx, config, 'update');
  if (!ctx.tenant) throw new Error('updateDocument: no tenant in context');
  const tenantId = ctx.tenant.id;
  const { header, lines } = splitPayload(data, config);
  return (await withTenant(tenantId, async (tx) => {
    const current = (await docDelegate(tx, config).findUnique({ where: { id } })) as
      | (Record<string, unknown> & { status: string })
      | null;
    if (!current) throw new NotFoundError(config.id, id);
    if (!scopeMatches(ctx, config, current)) throw new NotFoundError(config.id, id);
    const merged = { ...current, ...header };
    if (!scopeMatches(ctx, config, merged)) {
      throw new PermissionDeniedError(config.id, 'update');
    }
    if (current.status === 'POSTED') {
      throw new InvalidStatusError(config.id, id, current.status, 'update');
    }
    const oldDate = current.date as Date;
    // Mobile (and any JSON caller) sends `date` as an ISO string. Prisma
    // accepts strings on the eventual `update()` below, but `getTime()` here
    // crashes with `is not a function` if we don't coerce first — surfaced to
    // the client as a generic 500 → "Something went wrong" snackbar.
    const rawNewDate = header.date as Date | string | undefined;
    const newDate =
      rawNewDate instanceof Date
        ? rawNewDate
        : typeof rawNewDate === 'string'
          ? new Date(rawNewDate)
          : oldDate;
    await assertPeriodOpen(ctx, oldDate, tx, config.module);
    if (oldDate.getTime() !== newDate.getTime()) {
      await assertPeriodOpen(ctx, newDate, tx, config.module);
    }
    const updated = (await docDelegate(tx, config).update({
      where: { id },
      data: header,
    })) as Record<string, unknown>;
    if (config.lines) {
      for (const sectionKey of Object.keys(config.lines)) {
        await syncLines(tx, config, sectionKey, id, lines[sectionKey] ?? [], tenantId);
      }
    }
    const linesOut = await loadLines(tx, config, id);
    if (linesOut) updated.lines = linesOut;
    await writeAudit(tx, ctx, {
      entity: `document.${config.module}.${config.name}`,
      entityId: id,
      action: 'update',
      after: updated,
    });
    return updated;
  })) as Record<string, unknown>;
}

async function syncLines(
  tx: unknown,
  config: DocumentConfig,
  sectionKey: string,
  documentId: string,
  incoming: IncomingLine[],
  tenantId: string,
): Promise<void> {
  const delegate = lineDelegate(tx, config, sectionKey);
  const existing = (await delegate.findMany({ where: { documentId } })) as Array<
    Record<string, unknown> & { id: string }
  >;
  const existingIds = new Set(existing.map((l) => l.id));
  const incomingIds = new Set(incoming.filter((l) => l.id).map((l) => l.id as string));

  const toDelete = existing.filter((l) => !incomingIds.has(l.id)).map((l) => l.id);
  if (toDelete.length) {
    await delegate.deleteMany({ where: { id: { in: toDelete } } });
  }
  // Two-phase sequence rewrite to avoid unique(tenantId, documentId, sequence) collisions.
  await delegate.updateMany({
    where: { documentId },
    data: { sequence: { increment: 1000 } },
  });
  for (let i = 0; i < incoming.length; i++) {
    const row = incoming[i];
    if (!row) continue;
    const sequence = i + 1;
    const fields = stripLineSystemFields(row);
    if (row.id && existingIds.has(row.id)) {
      await delegate.update({ where: { id: row.id }, data: { ...fields, sequence } });
    } else {
      await delegate.create({
        data: { tenantId, documentId, sequence, ...fields },
      });
    }
  }
}

export async function deleteDocument(
  ctx: AppContext,
  config: DocumentConfig,
  id: string,
): Promise<void> {
  checkDoc(ctx, config, 'delete');
  if (!ctx.tenant) throw new Error('deleteDocument: no tenant in context');
  const tenantId = ctx.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const current = (await docDelegate(tx, config).findUnique({ where: { id } })) as
      | (Record<string, unknown> & { status: string })
      | null;
    if (!current) throw new NotFoundError(config.id, id);
    if (!scopeMatches(ctx, config, current)) throw new NotFoundError(config.id, id);
    if (current.status === 'POSTED') {
      throw new InvalidStatusError(config.id, id, current.status, 'delete');
    }
    await assertPeriodOpen(ctx, current.date as Date, tx, config.module);
    await docDelegate(tx, config).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await writeAudit(tx, ctx, {
      entity: `document.${config.module}.${config.name}`,
      entityId: id,
      action: 'delete',
    });
  });
}

/**
 * Internal rollback for the atomic Save-and-Post path: soft-deletes a draft
 * that was just created in the same request but whose post then failed, so no
 * orphan draft is left behind (a hidden orphan led users to think nothing
 * saved → they retried → duplicate documents, QA #7/#50). Deliberately skips
 * the permission / status / period checks `deleteDocument` runs — this is an
 * internal compensating action on the caller's own just-created SAVED draft,
 * not a user-initiated delete, so it must not depend on the poster also
 * holding the `delete` permission. Best-effort: callers ignore failures and
 * surface the original posting error.
 */
export async function rollbackDraftDocument(
  ctx: AppContext,
  config: DocumentConfig,
  id: string,
): Promise<void> {
  if (!ctx.tenant) return;
  await withTenant(ctx.tenant.id, async (tx) => {
    await docDelegate(tx, config).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  });
}

export async function listDocumentsPaged(
  ctx: AppContext,
  config: DocumentConfig,
  opts: DocumentListOptions = {},
): Promise<DocumentListResult> {
  checkDoc(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('listDocumentsPaged: no tenant in context');
  const tenantId = ctx.tenant.id;
  const pageSize = Math.max(1, Math.min(opts.pageSize ?? 25, 100));
  const page = Math.max(1, opts.page ?? 1);
  const baseWhere: Record<string, unknown> = { deletedAt: null };
  if (opts.status) baseWhere.status = opts.status;
  if (opts.search) baseWhere.number = { contains: opts.search, mode: 'insensitive' };
  if (opts.where) Object.assign(baseWhere, opts.where);
  const where = applyDocScope(ctx, config, 'read', baseWhere);

  return withTenant(tenantId, async (tx) => {
    const d = docDelegate(tx, config);
    const [rows, total] = await Promise.all([
      d.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }) as Promise<Record<string, unknown>[]>,
      d.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  });
}

export async function countDocuments(ctx: AppContext, config: DocumentConfig): Promise<number> {
  checkDoc(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('countDocuments: no tenant in context');
  return withTenant(ctx.tenant.id, (tx) =>
    docDelegate(tx, config).count({
      where: applyDocScope(ctx, config, 'read', { deletedAt: null }),
    }),
  );
}

export { checkDoc };
