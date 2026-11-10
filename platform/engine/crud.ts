import { randomUUID } from 'node:crypto';
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import type { CatalogConfig } from '@/platform/metadata';
import { writeAudit } from './audit-log';
import {
  NotFoundError,
  PermissionDeniedError,
  ReferentialError,
  ViewAsReadOnlyError,
} from './errors';
import { check } from './permissions';
import { scopeMatches, scopeWhere } from './scopes';

/**
 * Minimal structural shape of a Prisma model delegate. The Prisma client's
 * generated delegate types are model-specific, so we project to a narrow
 * shape through `unknown` — this keeps the helpers generic across all
 * generated `catalog_<module>_<name>` tables without resorting to `any`.
 */
type PrismaModelDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<number>;
};

/**
 * Resolve the Prisma delegate for a catalog's generated table.
 *
 * Tries snake_case first (`catalog_<module>_<name>`), then falls back to
 * camelCase (`catalog<Module><Name>`) to handle Prisma version/naming edge
 * cases. Throws with a list of available catalog keys if neither is found.
 */
function prismaDelegate(tx: unknown, config: CatalogConfig): PrismaModelDelegate {
  const snakeKey = `catalog_${config.module}_${config.name}`;
  const camelKey = `catalog${capitalize(config.module)}${capitalize(config.name)}`;
  const bag = tx as Record<string, PrismaModelDelegate | undefined>;
  const delegate = bag[snakeKey] ?? bag[camelKey];
  if (!delegate) {
    const available = Object.keys(bag)
      .filter((k) => k.toLowerCase().includes('catalog'))
      .join(', ');
    throw new Error(
      `prismaDelegate: no Prisma model for "${snakeKey}" (tried "${camelKey}"). Available: ${available}`,
    );
  }
  return delegate;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type ListOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
  where?: Record<string, unknown>;
};

export type ListResult = {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listRecords(
  ctx: AppContext,
  config: CatalogConfig,
): Promise<Record<string, unknown>[]> {
  check(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('listRecords: no tenant in context');
  const tenantId = ctx.tenant.id;
  return (await withTenant(tenantId, (tx) =>
    prismaDelegate(tx, config).findMany({
      where: applyScope(ctx, config, 'read', { deletedAt: null }),
      orderBy: { createdAt: 'desc' },
    }),
  )) as Record<string, unknown>[];
}

export async function listRecordsPaged(
  ctx: AppContext,
  config: CatalogConfig,
  opts: ListOptions = {},
): Promise<ListResult> {
  check(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('listRecordsPaged: no tenant in context');
  const tenantId = ctx.tenant.id;
  const pageSize = Math.max(1, Math.min(opts.pageSize ?? 25, 100));
  const page = Math.max(1, opts.page ?? 1);
  const searchField = config.displayField ?? firstStringField(config);
  const searchClause =
    opts.search && searchField
      ? { [searchField]: { contains: opts.search, mode: 'insensitive' } }
      : undefined;
  const where = applyScope(ctx, config, 'read', {
    deletedAt: null,
    ...searchClause,
    ...(opts.where || {}),
  });

  return withTenant(tenantId, async (tx) => {
    const delegate = prismaDelegate(tx, config);
    const [rows, total] = await Promise.all([
      delegate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }) as Promise<Record<string, unknown>[]>,
      delegate.count({ where }) as Promise<number>,
    ]);
    return { rows, total, page, pageSize };
  });
}

export async function countRecords(ctx: AppContext, config: CatalogConfig): Promise<number> {
  check(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('countRecords: no tenant in context');
  const tenantId = ctx.tenant.id;
  return withTenant(tenantId, (tx) =>
    prismaDelegate(tx, config).count({
      where: applyScope(ctx, config, 'read', { deletedAt: null }),
    }),
  );
}

function firstStringField(config: CatalogConfig): string | undefined {
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.type === 'string' || f.type === 'text') return name;
  }
  return undefined;
}

function applyScope(
  ctx: AppContext,
  config: CatalogConfig,
  op: 'read' | 'create' | 'update' | 'delete',
  where: Record<string, unknown>,
): Record<string, unknown> {
  const sw = scopeWhere(ctx, config, op);
  if (!sw) return where;
  return { AND: [where, sw] };
}

/**
 * Server-managed catalog columns a client must never set. Web Server Actions
 * strip unknown fields via the metadata Zod schema, but the mobile + MCP write
 * paths pass raw JSON straight to the engine, so the engine itself drops these.
 * `deletedAt` is the dangerous one (create-as-deleted / un-archive); `id` /
 * `tenantId` / timestamps are managed too. Finding B1.
 */
const CATALOG_MANAGED_FIELDS = new Set(['id', 'tenantId', 'createdAt', 'updatedAt', 'deletedAt']);

export function stripManagedFields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!CATALOG_MANAGED_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

export async function createRecord(
  ctx: AppContext,
  config: CatalogConfig,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (ctx.viewAsRole) throw new ViewAsReadOnlyError(ctx.viewAsRole);
  check(ctx, config, 'create');
  if (!ctx.tenant) throw new Error('createRecord: no tenant in context');
  if (!scopeMatches(ctx, config, data)) {
    throw new PermissionDeniedError(config.id, 'create');
  }
  const tenantId = ctx.tenant.id;
  const dataWithAutos: Record<string, unknown> = stripManagedFields(data);
  for (const [name, f] of Object.entries(config.fields)) {
    if (f.autoGenerate === 'sequence') {
      const v = dataWithAutos[name];
      // treat blank values as "not provided" — only the engine may set autoGenerate fields
      if (v === undefined || v === null || v === '') {
        dataWithAutos[name] = randomUUID().slice(0, 8).toUpperCase();
      }
    }
  }
  // Auto-fill assignedBuyerId for buyer-scoped catalog entities
  const membershipRoles = (ctx.membership as unknown as { roles?: Array<{ name: string }> } | null)
    ?.roles;
  const hasBuyerRole = membershipRoles?.some((r) => r.name === 'buyer') ?? false;
  if (
    config.id === 'purchases.supplier' &&
    hasBuyerRole &&
    (dataWithAutos.assignedBuyerId === undefined || dataWithAutos.assignedBuyerId === null)
  ) {
    dataWithAutos.assignedBuyerId = ctx.user.id;
  }
  return (await withTenant(tenantId, async (tx) => {
    const created = (await prismaDelegate(tx, config).create({
      data: { tenantId, ...dataWithAutos },
    })) as Record<string, unknown>;
    await writeAudit(tx, ctx, {
      entity: `catalog.${config.module}.${config.name}`,
      entityId: String(created.id),
      action: 'create',
      after: created,
    });
    return created;
  })) as Record<string, unknown>;
}

export async function getRecord(
  ctx: AppContext,
  config: CatalogConfig,
  id: string,
): Promise<Record<string, unknown>> {
  check(ctx, config, 'read');
  if (!ctx.tenant) throw new Error('getRecord: no tenant in context');
  const tenantId = ctx.tenant.id;
  const found = await withTenant(tenantId, (tx) =>
    prismaDelegate(tx, config).findUnique({ where: { id } }),
  );
  if (!found) throw new NotFoundError(config.id, id);
  if (!scopeMatches(ctx, config, found as Record<string, unknown>)) {
    throw new NotFoundError(config.id, id);
  }
  return found as Record<string, unknown>;
}

export async function updateRecord(
  ctx: AppContext,
  config: CatalogConfig,
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (ctx.viewAsRole) throw new ViewAsReadOnlyError(ctx.viewAsRole);
  check(ctx, config, 'update');
  if (!ctx.tenant) throw new Error('updateRecord: no tenant in context');
  const tenantId = ctx.tenant.id;
  return (await withTenant(tenantId, async (tx) => {
    const before = (await prismaDelegate(tx, config).findUnique({ where: { id } })) as Record<
      string,
      unknown
    > | null;
    if (!before) throw new NotFoundError(config.id, id);
    if (!scopeMatches(ctx, config, before)) throw new NotFoundError(config.id, id);
    // Drop server-managed columns so mobile/MCP can't un-archive (deletedAt) or
    // reassign id/tenantId via a raw update payload. Finding B1.
    const cleanData = stripManagedFields(data);
    const merged = { ...before, ...cleanData };
    if (!scopeMatches(ctx, config, merged)) {
      throw new PermissionDeniedError(config.id, 'update');
    }
    const updated = (await prismaDelegate(tx, config).update({
      where: { id },
      data: cleanData,
    })) as Record<string, unknown>;
    await writeAudit(tx, ctx, {
      entity: `catalog.${config.module}.${config.name}`,
      entityId: id,
      action: 'update',
      before,
      after: updated,
    });
    return updated;
  })) as Record<string, unknown>;
}

/**
 * Per-entity referential checks — an explicit allowlist, NOT generic FK
 * reflection (which would be fragile and risk breaking every delete). Maps a
 * catalog id to the movement table(s) + the column referencing it. Archiving
 * is blocked when the record still holds non-zero net stock.
 *
 * Scoped to **warehouse** only (QA H11b#80): a warehouse is a stock container,
 * so archiving one that still holds stock orphans the balance. Products are
 * deliberately NOT here — discontinuing a product that still has some stock is
 * a legitimate workflow (M9 calls for a soft warning there, not a hard block).
 * Entities absent from this map are unaffected (no behaviour change).
 */
const REFERENTIAL_STOCK_CHECKS: Record<string, Array<{ model: string; field: 'warehouse' }>> = {
  'inventory.warehouse': [{ model: 'movement_inventory_stock_balance', field: 'warehouse' }],
};

type GroupByDelegate = {
  groupBy: (args: unknown) => Promise<Array<{ kind: string; _sum: { quantity: number | null } }>>;
};

/**
 * Throws `ReferentialError` when archiving `id` would orphan live stock.
 * Sums signed stock movements (income − expense) for the record; a non-zero
 * net balance blocks the archive. A missing movement model is treated as "no
 * references" so the guard can never break an otherwise-valid delete.
 */
async function assertArchivable(tx: unknown, config: CatalogConfig, id: string): Promise<void> {
  const checks = REFERENTIAL_STOCK_CHECKS[config.id];
  if (!checks) return;
  const bag = tx as Record<string, GroupByDelegate | undefined>;
  for (const c of checks) {
    const delegate = bag[c.model];
    if (!delegate?.groupBy) continue;
    const grouped = await delegate.groupBy({
      by: ['kind'],
      where: { [c.field]: id, active: true },
      _sum: { quantity: true },
    });
    let net = 0;
    for (const g of grouped) {
      net += (g.kind === 'income' ? 1 : -1) * Number(g._sum.quantity ?? 0);
    }
    if (Math.abs(net) > 0) throw new ReferentialError(config.id, id, 'stock');
  }
}

export async function deleteRecord(
  ctx: AppContext,
  config: CatalogConfig,
  id: string,
): Promise<void> {
  if (ctx.viewAsRole) throw new ViewAsReadOnlyError(ctx.viewAsRole);
  check(ctx, config, 'delete');
  if (!ctx.tenant) throw new Error('deleteRecord: no tenant in context');
  const tenantId = ctx.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const before = (await prismaDelegate(tx, config).findUnique({ where: { id } })) as Record<
      string,
      unknown
    > | null;
    if (!before) throw new NotFoundError(config.id, id);
    if (!scopeMatches(ctx, config, before)) throw new NotFoundError(config.id, id);
    await assertArchivable(tx, config, id);
    await prismaDelegate(tx, config).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await writeAudit(tx, ctx, {
      entity: `catalog.${config.module}.${config.name}`,
      entityId: id,
      action: 'delete',
      before,
    });
  });
}

/**
 * Restore (un-archive) a soft-deleted record — the inverse of `deleteRecord`.
 * Clears `deletedAt` so the record reappears in the default (active) list.
 * Gated on the same `delete` permission that archived it.
 */
export async function restoreRecord(
  ctx: AppContext,
  config: CatalogConfig,
  id: string,
): Promise<void> {
  if (ctx.viewAsRole) throw new ViewAsReadOnlyError(ctx.viewAsRole);
  check(ctx, config, 'delete');
  if (!ctx.tenant) throw new Error('restoreRecord: no tenant in context');
  const tenantId = ctx.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const before = (await prismaDelegate(tx, config).findUnique({ where: { id } })) as Record<
      string,
      unknown
    > | null;
    if (!before) throw new NotFoundError(config.id, id);
    if (!scopeMatches(ctx, config, before)) throw new NotFoundError(config.id, id);
    const restored = (await prismaDelegate(tx, config).update({
      where: { id },
      data: { deletedAt: null },
    })) as Record<string, unknown>;
    await writeAudit(tx, ctx, {
      entity: `catalog.${config.module}.${config.name}`,
      entityId: id,
      action: 'restore',
      before,
      after: restored,
    });
  });
}
