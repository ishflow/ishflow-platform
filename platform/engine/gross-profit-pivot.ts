import { withTenant } from '@/platform/db/tenant-context';

export type Dimension = 'counterparty' | 'product' | 'category' | 'group';

export type Filters = Partial<Record<Dimension, string[]>>;

export type PivotInput = {
  tenantId: string;
  from: Date;
  to: Date;
  dimensions: Dimension[];
  filters: Filters;
};

export type PivotNode = {
  key: string;
  qty: number;
  revenueMinor: bigint;
  costMinor: bigint;
  marginMinor: bigint;
  marginPct: number;
  children?: PivotNode[];
};

export type PivotResult = {
  rows: PivotNode[];
  totals: {
    qty: number;
    revenueMinor: bigint;
    costMinor: bigint;
    marginMinor: bigint;
    marginPct: number;
  };
};

const dimColumn: Record<Dimension, string> = {
  counterparty: 'm.counterparty',
  product: 'm.product',
  category: 'p.category_id',
  group: 'p.group_id',
};

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.round(value));
  if (typeof value === 'string') return BigInt(value);
  return 0n;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  return 0;
}

function buildTree(
  rows: Array<Record<string, unknown>>,
  dimensions: Dimension[],
  dimIndex: number,
): PivotNode[] {
  if (dimIndex >= dimensions.length) return [];

  const dim = dimensions[dimIndex];
  if (!dim) return [];
  const groups = new Map<string, Array<Record<string, unknown>>>();

  for (const row of rows) {
    const key = row[dim] === null || row[dim] === undefined ? '' : String(row[dim]);
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }
    group.push(row);
  }

  const nodes: PivotNode[] = [];
  for (const [key, groupRows] of groups) {
    const children =
      dimIndex + 1 < dimensions.length ? buildTree(groupRows, dimensions, dimIndex + 1) : undefined;

    let qty = 0;
    let revenueMinor = 0n;
    let costMinor = 0n;

    if (children && children.length > 0) {
      for (const child of children) {
        qty += child.qty;
        revenueMinor += child.revenueMinor;
        costMinor += child.costMinor;
      }
    } else {
      for (const row of groupRows) {
        qty += toNumber(row.qty);
        revenueMinor += toBigInt(row.revenue_minor);
        costMinor += toBigInt(row.cost_minor);
      }
    }

    const marginMinor = revenueMinor - costMinor;
    const marginPct =
      revenueMinor !== 0n
        ? Math.round((Number(marginMinor) / Number(revenueMinor)) * 10000) / 100
        : 0;

    nodes.push({
      key,
      qty,
      revenueMinor,
      costMinor,
      marginMinor,
      marginPct,
      ...(children && children.length > 0 ? { children } : {}),
    });
  }

  return nodes;
}

export async function computeGrossProfitPivot(input: PivotInput): Promise<PivotResult> {
  const { tenantId, from, to, dimensions, filters } = input;

  return withTenant(tenantId, async (tx) => {
    const dimSelects = dimensions.map((d) => `${dimColumn[d]} as ${d}`).join(', ');
    const selectClause = dimSelects ? `${dimSelects}, ` : '';
    const dimGroups = dimensions.map((d) => dimColumn[d]).join(', ');

    const filterConditions: string[] = [];
    const filterParams: string[] = [];

    for (const [dim, values] of Object.entries(filters)) {
      if (values && values.length > 0) {
        const placeholders = values
          .map((_, i) => `$${filterParams.length + i + 4}::uuid`)
          .join(', ');
        filterConditions.push(`${dimColumn[dim as Dimension]} IN (${placeholders})`);
        filterParams.push(...values);
      }
    }

    const filterSql = filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';

    const query = `
      SELECT
        ${selectClause}SUM(m.quantity)::int as qty,
        (SUM(m.revenue) * 100)::bigint as revenue_minor,
        (SUM(m.cost) * 100)::bigint as cost_minor
      FROM movement_sales_sale m
      LEFT JOIN catalog_inventory_product p
        ON p.id = m.product AND p.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1::uuid
        AND m.active = true
        AND m.timestamp >= $2
        AND m.timestamp <= $3
        AND m.kind = 'income'
        ${filterSql}
      ${dimensions.length > 0 ? `GROUP BY ${dimGroups}` : ''}
    `;

    const params = [tenantId, from, to, ...filterParams];
    const rawRows = (await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      query,
      ...params,
    )) as Array<Record<string, unknown>>;

    const rows = buildTree(rawRows, dimensions, 0);

    let totalQty = 0;
    let totalRevenue = 0n;
    let totalCost = 0n;

    if (dimensions.length === 0 && rawRows.length > 0) {
      const row = rawRows[0];
      if (row) {
        totalQty = toNumber(row.qty);
        totalRevenue = toBigInt(row.revenue_minor);
        totalCost = toBigInt(row.cost_minor);
      }
    } else {
      for (const row of rows) {
        totalQty += row.qty;
        totalRevenue += row.revenueMinor;
        totalCost += row.costMinor;
      }
    }

    const totalMargin = totalRevenue - totalCost;
    const totalMarginPct =
      totalRevenue !== 0n
        ? Math.round((Number(totalMargin) / Number(totalRevenue)) * 10000) / 100
        : 0;

    return {
      rows,
      totals: {
        qty: totalQty,
        revenueMinor: totalRevenue,
        costMinor: totalCost,
        marginMinor: totalMargin,
        marginPct: totalMarginPct,
      },
    };
  });
}
