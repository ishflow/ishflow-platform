import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { type CatalogConfig, getRegistry } from '@/platform/metadata';
import { check } from './permissions';

export type ReferenceFilter = (tx: unknown, value: string) => Promise<string[] | null>;

const filterRegistry = new Map<string, Map<string, ReferenceFilter>>();

export function registerReferenceFilter(
  catalogId: string,
  key: string,
  filter: ReferenceFilter,
): void {
  const m = filterRegistry.get(catalogId) ?? new Map();
  m.set(key, filter);
  filterRegistry.set(catalogId, m);
}

export function getReferenceFilter(catalogId: string, key: string): ReferenceFilter | null {
  return filterRegistry.get(catalogId)?.get(key) ?? null;
}

export async function applyReferenceFilters(
  tx: unknown,
  catalogId: string,
  filterParams: Record<string, string>,
): Promise<string[] | null> {
  let allowlist: Set<string> | null = null;
  for (const [key, value] of Object.entries(filterParams)) {
    const fn = getReferenceFilter(catalogId, key);
    if (!fn) continue;
    const ids = await fn(tx, value);
    if (ids === null) continue;
    if (allowlist === null) {
      allowlist = new Set(ids);
    } else {
      for (const id of [...allowlist]) {
        if (!ids.includes(id)) allowlist.delete(id);
      }
    }
    if (allowlist.size === 0) return [];
  }
  return allowlist === null ? null : [...allowlist];
}

type PrismaSearchDelegate = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prismaDelegate(tx: unknown, config: CatalogConfig): PrismaSearchDelegate {
  const snake = `catalog_${config.module}_${config.name}`;
  const camel = `catalog${capitalize(config.module)}${capitalize(config.name)}`;
  const bag = tx as Record<string, PrismaSearchDelegate | undefined>;
  const d = bag[snake] ?? bag[camel];
  if (!d) {
    throw new Error(`reference-search: no Prisma model for "${snake}"`);
  }
  return d;
}

function requireConfig(module: string, name: string): CatalogConfig {
  const id = `${module}.${name}`;
  const cfg = getRegistry().catalog[id];
  if (!cfg) throw new Error(`reference-search: catalog "${id}" not registered`);
  return cfg;
}

function displayFieldFor(config: CatalogConfig): string {
  return config.displayField ?? 'name';
}

export type SearchReferenceArgs = {
  ctx: AppContext;
  module: string;
  name: string;
  query: string;
  limit?: number;
  filter?: Record<string, string>;
};

export async function searchReference(
  args: SearchReferenceArgs,
): Promise<{ id: string; label: string }[]> {
  const { ctx, module, name, query, limit = 20 } = args;
  const filter = args.filter ?? {};
  if (!ctx.tenant) throw new Error('searchReference: no tenant in context');
  const config = requireConfig(module, name);
  check(ctx, config, 'read');
  const displayField = displayFieldFor(config);

  return withTenant(ctx.tenant.id, async (tx) => {
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.trim().length > 0) {
      where[displayField] = { contains: query, mode: 'insensitive' };
    }
    const allowlist = await applyReferenceFilters(tx, `${module}.${name}`, filter);
    if (allowlist !== null) {
      if (allowlist.length === 0) return [];
      where.id = { in: allowlist };
    }
    const rows = await prismaDelegate(tx, config).findMany({
      where,
      orderBy: { [displayField]: 'asc' },
      take: Math.min(Math.max(limit, 1), 100),
      select: { id: true, [displayField]: true },
    });
    return rows.map((r) => ({
      id: String(r.id),
      label: String(r[displayField] ?? ''),
    }));
  });
}

export type ResolveReferenceArgs = {
  ctx: AppContext;
  module: string;
  name: string;
  id: string;
  filter?: Record<string, string>;
};

export async function resolveReference(
  args: ResolveReferenceArgs,
): Promise<{ id: string; label: string } | null> {
  const { ctx, module, name, id } = args;
  const filter = args.filter ?? {};
  if (!ctx.tenant) throw new Error('resolveReference: no tenant in context');
  const config = requireConfig(module, name);
  check(ctx, config, 'read');
  const displayField = displayFieldFor(config);

  return withTenant(ctx.tenant.id, async (tx) => {
    const row = await prismaDelegate(tx, config).findUnique({
      where: { id },
      select: { id: true, [displayField]: true, deletedAt: true },
    });
    if (!row || row.deletedAt) return null;
    const allowlist = await applyReferenceFilters(tx, `${module}.${name}`, filter);
    if (allowlist !== null && !allowlist.includes(id)) return null;
    return { id: String(row.id), label: String(row[displayField] ?? '') };
  });
}

async function hasStockGt0(tx: unknown): Promise<string[]> {
  const rows = await (
    tx as {
      movement_inventory_stock_balance: {
        groupBy: (
          a: unknown,
        ) => Promise<Array<{ product: string; _sum: { quantity: number | string | null } }>>;
      };
    }
  ).movement_inventory_stock_balance.groupBy({
    by: ['product'],
    where: { active: true },
    _sum: { quantity: true },
  });
  return rows.filter((r) => Number(r._sum.quantity ?? 0) > 0).map((r) => String(r.product));
}

async function hasProductStockGt0(tx: unknown, productId: string): Promise<string[]> {
  const rows = await (
    tx as {
      movement_inventory_stock_balance: {
        groupBy: (
          a: unknown,
        ) => Promise<Array<{ warehouse: string; _sum: { quantity: number | string | null } }>>;
      };
    }
  ).movement_inventory_stock_balance.groupBy({
    by: ['warehouse'],
    where: { active: true, product: productId },
    _sum: { quantity: true },
  });
  return rows.filter((r) => Number(r._sum.quantity ?? 0) > 0).map((r) => String(r.warehouse));
}

async function staticOnly(tx: unknown): Promise<string[]> {
  const rows = await (
    tx as {
      catalog_sales_price_type: {
        findMany: (a: unknown) => Promise<Array<{ id: string }>>;
      };
    }
  ).catalog_sales_price_type.findMany({
    where: { kind: 'static', deletedAt: null },
    select: { id: true },
  });
  return rows.map((r) => String(r.id));
}

registerReferenceFilter('inventory.product', 'hasStockGt0', hasStockGt0);
registerReferenceFilter('inventory.warehouse', 'hasProductStockGt0', hasProductStockGt0);
registerReferenceFilter('sales.price_type', 'staticOnly', staticOnly);
