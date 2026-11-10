import type { SuperAdminCatalogLoader, SuperAdminCatalogSourceSpec } from './types';

/**
 * Build a standard findMany + count loader from a declarative source spec.
 * Handles search OR-building, chip → where merging, pagination, and the
 * parallel count query.
 *
 * Use cases the spec can't express (use a manual `loader` instead):
 *   - Post-query filters (e.g. multitenant chip on user/tenant catalogs)
 *   - Raw SQL
 *   - Cross-table aggregates without a Prisma relation
 *
 * The engine calls this from `defineSuperAdminCatalog` when `source` is set
 * and `loader` is absent.
 */
export function buildAutoLoader(spec: SuperAdminCatalogSourceSpec): SuperAdminCatalogLoader {
  if (!spec.map && !spec.postFetch) {
    throw new Error(
      `super-admin auto-loader for source "${spec.source}" requires either map or postFetch`,
    );
  }

  return async ({ tx, search, chip, page, pageSize }) => {
    const where: Record<string, unknown> = { ...(spec.baseWhere ?? {}) };

    if (search) {
      const trimmed = search.trim();
      if (trimmed.length > 0) {
        const orClauses: Array<Record<string, unknown>> = [];
        for (const f of spec.searchFields ?? []) {
          orClauses.push({ [f]: { contains: trimmed, mode: 'insensitive' } });
        }
        for (const f of spec.searchExactFields ?? []) {
          orClauses.push({ [f]: trimmed });
        }
        if (orClauses.length > 0) {
          where.OR = orClauses;
        }
      }
    }

    if (chip && chip !== 'all' && spec.chipFilters?.[chip]) {
      Object.assign(where, spec.chipFilters[chip]);
    }

    const model = (tx as Record<string, unknown>)[spec.source] as
      | {
          findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
          count: (args: unknown) => Promise<number>;
        }
      | undefined;

    if (!model) {
      throw new Error(`super-admin auto-loader: unknown Prisma model "${spec.source}"`);
    }

    const [rows, total] = await Promise.all([
      model.findMany({
        where,
        ...(spec.include ? { include: spec.include } : {}),
        orderBy: spec.orderBy ?? { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      model.count({ where }),
    ]);

    const mapped = spec.postFetch
      ? await spec.postFetch(rows, tx)
      : rows.map((r) => {
          if (!spec.map) {
            throw new Error('unreachable: map required when postFetch is absent');
          }
          return spec.map(r);
        });

    return { rows: mapped, total };
  };
}
