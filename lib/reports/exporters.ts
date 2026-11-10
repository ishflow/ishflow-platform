import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  type Dimension,
  type Filters,
  type PivotNode,
  computeGrossProfitPivot,
} from '@/platform/engine/gross-profit-pivot';
import ExcelJS from 'exceljs';

export type ReportType =
  | 'gross-profit'
  | 'ar-aging'
  | 'ap-aging'
  | 'sales-by-customer'
  | 'sales-by-product';

export type ReportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportRenderResult {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
}

export interface ReportParams {
  from?: Date;
  to?: Date;
  dims?: string[];
  [key: string]: unknown;
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toMajor(minor: bigint): number {
  return Number(minor) / 100;
}

// ─── Gross Profit ─────────────────────────────────────────────────────────────

const dimConfig: Record<Dimension, { table: string; field: string; label: string }> = {
  counterparty: { table: 'catalog_sales_customer', field: 'name', label: 'Counterparty' },
  product: { table: 'catalog_inventory_product', field: 'name', label: 'Product' },
  category: { table: 'catalog_inventory_product_category', field: 'name', label: 'Category' },
  group: { table: 'catalog_inventory_product_group', field: 'name', label: 'Group' },
};

async function fetchLabelsForDimension(
  dim: Dimension,
  ids: string[],
  tenantId: string,
): Promise<Map<string, string>> {
  return withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as Record<
      string,
      { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> } | undefined
    >;

    const { table, field } = dimConfig[dim];
    const delegate = bag[table];
    if (!delegate) return new Map();

    const rows = await delegate.findMany({
      where: { id: { in: ids } },
      select: { id: true, [field]: true },
    });

    return new Map(rows.map((r) => [String(r.id), String(r[field] ?? r.id)]));
  });
}

async function resolveTreeLabels(
  nodes: PivotNode[],
  dimensions: Dimension[],
  depth: number,
  tenantId: string,
): Promise<PivotNode[]> {
  if (depth >= dimensions.length || nodes.length === 0) {
    return nodes;
  }

  const dim = dimensions[depth];
  if (!dim) return nodes;

  const ids = Array.from(
    new Set(
      nodes.map((n) => n.key).filter((k): k is string => typeof k === 'string' && k !== 'null'),
    ),
  );

  const labelMap =
    ids.length > 0 ? await fetchLabelsForDimension(dim, ids, tenantId) : new Map<string, string>();

  const resolvedNodes: PivotNode[] = [];
  for (const node of nodes) {
    const resolvedKey = labelMap.get(node.key) ?? node.key;
    const resolvedChildren = node.children
      ? await resolveTreeLabels(node.children, dimensions, depth + 1, tenantId)
      : undefined;
    resolvedNodes.push({
      ...node,
      key: resolvedKey,
      children: resolvedChildren,
    });
  }

  return resolvedNodes;
}

interface CsvRow {
  dimValues: string[];
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
}

function flattenTree(
  nodes: PivotNode[],
  dimensions: Dimension[],
  depth: number,
  prefix: string[],
): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const node of nodes) {
    const dimValues = [...prefix];
    while (dimValues.length < depth) {
      dimValues.push('');
    }
    dimValues.push(node.key);
    while (dimValues.length < dimensions.length) {
      dimValues.push('');
    }

    rows.push({
      dimValues,
      qty: node.qty,
      revenue: toMajor(node.revenueMinor),
      cost: toMajor(node.costMinor),
      margin: toMajor(node.marginMinor),
      marginPct: node.marginPct,
    });

    if (node.children && node.children.length > 0) {
      rows.push(...flattenTree(node.children, dimensions, depth + 1, [...prefix, node.key]));
    }
  }

  return rows;
}

export async function fetchGrossProfitRows(
  params: ReportParams,
  ctx: AppContext,
): Promise<{ headers: string[]; rows: unknown[][]; filenameSuffix: string }> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const tenantId = ctx.tenant.id;
  const fromDate =
    params.from ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const toDate = params.to ?? new Date();

  const allSupportedDims: Dimension[] = ['counterparty', 'product', 'category', 'group'];
  const selectedDims = (params.dims ?? []).filter((k): k is Dimension =>
    allSupportedDims.includes(k as Dimension),
  );

  const filters: Filters = {};
  for (const dim of allSupportedDims) {
    const rawValue = params[`f.${dim}`] ?? params[dim];
    if (rawValue && typeof rawValue === 'string' && rawValue.length > 0) {
      filters[dim] = rawValue.split(',').filter(Boolean);
    }
  }

  const result = await computeGrossProfitPivot({
    tenantId,
    from: fromDate,
    to: toDate,
    dimensions: selectedDims,
    filters,
  });

  const resolvedRows = await resolveTreeLabels(result.rows, selectedDims, 0, tenantId);

  const dimHeaders = selectedDims.map((d) => dimConfig[d].label);
  const numericHeaders = ['Quantity', 'Revenue', 'Cost', 'Margin', 'Margin %'];
  const headers = [...dimHeaders, ...numericHeaders];

  const csvRows = flattenTree(resolvedRows, selectedDims, 0, []);
  const rows: unknown[][] = [];

  for (const row of csvRows) {
    rows.push([
      ...row.dimValues,
      row.qty,
      row.revenue.toFixed(2),
      row.cost.toFixed(2),
      row.margin.toFixed(2),
      row.marginPct.toFixed(2),
    ]);
  }

  // Totals row
  rows.push([
    ...Array(selectedDims.length).fill('Total'),
    result.totals.qty,
    toMajor(result.totals.revenueMinor).toFixed(2),
    toMajor(result.totals.costMinor).toFixed(2),
    toMajor(result.totals.marginMinor).toFixed(2),
    result.totals.marginPct.toFixed(2),
  ]);

  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);
  const dimsSlug = selectedDims.join('-') || 'all';

  return { headers, rows, filenameSuffix: `${dimsSlug}-${fromIso}-${toIso}` };
}

// ─── A/R Aging ────────────────────────────────────────────────────────────────

export async function fetchARAgingRows(
  _params: ReportParams,
  ctx: AppContext,
): Promise<{ headers: string[]; rows: unknown[][]; filenameSuffix: string }> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const tenantId = ctx.tenant.id;

  const rows = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_accounts_receivable: {
        findMany: (args: unknown) => Promise<
          Array<{
            customer: string;
            kind: string;
            amount: unknown;
            timestamp: Date;
          }>
        >;
      };
      catalog_sales_customer: {
        findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
      };
    };

    const arRows = await bag.movement_sales_accounts_receivable.findMany({
      where: { active: true },
      select: { customer: true, kind: true, amount: true, timestamp: true },
    });

    const balanceByCustomer = new Map<string, number>();
    const lastActivityByCustomer = new Map<string, Date>();

    for (const r of arRows) {
      const prev = balanceByCustomer.get(r.customer) ?? 0;
      const signed = r.kind === 'income' ? Number(r.amount) : -Number(r.amount);
      balanceByCustomer.set(r.customer, prev + signed);

      const last = lastActivityByCustomer.get(r.customer);
      if (!last || r.timestamp > last) {
        lastActivityByCustomer.set(r.customer, r.timestamp);
      }
    }

    const customerIds = Array.from(balanceByCustomer.keys());
    const customers =
      customerIds.length === 0
        ? []
        : await bag.catalog_sales_customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
          });
    const nameById = new Map(customers.map((c) => [c.id, c.name]));

    const now = new Date();
    const result: Array<{
      customer: string;
      balance: number;
      current: number;
      days30: number;
      days60: number;
      days90: number;
      days90Plus: number;
    }> = [];

    for (const [customerId, balance] of balanceByCustomer) {
      if (balance <= 0) continue;

      const lastActivity = lastActivityByCustomer.get(customerId) ?? now;
      const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      result.push({
        customer: nameById.get(customerId) ?? customerId,
        balance,
        current: daysDiff <= 30 ? balance : 0,
        days30: daysDiff > 30 && daysDiff <= 60 ? balance : 0,
        days60: daysDiff > 60 && daysDiff <= 90 ? balance : 0,
        days90: daysDiff > 90 && daysDiff <= 120 ? balance : 0,
        days90Plus: daysDiff > 120 ? balance : 0,
      });
    }

    return result.sort((a, b) => b.balance - a.balance);
  });

  const headers = ['Customer', 'Balance', 'Current (≤30)', '31-60', '61-90', '91-120', '120+'];
  const dataRows = rows.map((r) => [
    r.customer,
    r.balance.toFixed(2),
    r.current.toFixed(2),
    r.days30.toFixed(2),
    r.days60.toFixed(2),
    r.days90.toFixed(2),
    r.days90Plus.toFixed(2),
  ]);

  return { headers, rows: dataRows, filenameSuffix: new Date().toISOString().slice(0, 10) };
}

// ─── A/P Aging ────────────────────────────────────────────────────────────────

export async function fetchAPAgingRows(
  _params: ReportParams,
  ctx: AppContext,
): Promise<{ headers: string[]; rows: unknown[][]; filenameSuffix: string }> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const tenantId = ctx.tenant.id;

  const rows = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_purchases_accounts_payable: {
        findMany: (args: unknown) => Promise<
          Array<{
            supplier: string;
            kind: string;
            amount: unknown;
            timestamp: Date;
          }>
        >;
      };
      catalog_purchases_supplier: {
        findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
      };
    };

    const apRows = await bag.movement_purchases_accounts_payable.findMany({
      where: { active: true },
      select: { supplier: true, kind: true, amount: true, timestamp: true },
    });

    const balanceBySupplier = new Map<string, number>();
    const lastActivityBySupplier = new Map<string, Date>();

    for (const r of apRows) {
      const prev = balanceBySupplier.get(r.supplier) ?? 0;
      const signed = r.kind === 'income' ? Number(r.amount) : -Number(r.amount);
      balanceBySupplier.set(r.supplier, prev + signed);

      const last = lastActivityBySupplier.get(r.supplier);
      if (!last || r.timestamp > last) {
        lastActivityBySupplier.set(r.supplier, r.timestamp);
      }
    }

    const supplierIds = Array.from(balanceBySupplier.keys());
    const suppliers =
      supplierIds.length === 0
        ? []
        : await bag.catalog_purchases_supplier.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, name: true },
          });
    const nameById = new Map(suppliers.map((s) => [s.id, s.name]));

    const now = new Date();
    const result: Array<{
      supplier: string;
      balance: number;
      current: number;
      days30: number;
      days60: number;
      days90: number;
      days90Plus: number;
    }> = [];

    for (const [supplierId, balance] of balanceBySupplier) {
      if (balance <= 0) continue;

      const lastActivity = lastActivityBySupplier.get(supplierId) ?? now;
      const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      result.push({
        supplier: nameById.get(supplierId) ?? supplierId,
        balance,
        current: daysDiff <= 30 ? balance : 0,
        days30: daysDiff > 30 && daysDiff <= 60 ? balance : 0,
        days60: daysDiff > 60 && daysDiff <= 90 ? balance : 0,
        days90: daysDiff > 90 && daysDiff <= 120 ? balance : 0,
        days90Plus: daysDiff > 120 ? balance : 0,
      });
    }

    return result.sort((a, b) => b.balance - a.balance);
  });

  const headers = ['Supplier', 'Balance', 'Current (≤30)', '31-60', '61-90', '91-120', '120+'];
  const dataRows = rows.map((r) => [
    r.supplier,
    r.balance.toFixed(2),
    r.current.toFixed(2),
    r.days30.toFixed(2),
    r.days60.toFixed(2),
    r.days90.toFixed(2),
    r.days90Plus.toFixed(2),
  ]);

  return { headers, rows: dataRows, filenameSuffix: new Date().toISOString().slice(0, 10) };
}

// ─── Sales by Customer ────────────────────────────────────────────────────────

export async function fetchSalesByCustomerRows(
  params: ReportParams,
  ctx: AppContext,
): Promise<{ headers: string[]; rows: unknown[][]; filenameSuffix: string }> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const tenantId = ctx.tenant.id;
  const fromDate =
    params.from ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const toDate = params.to ?? new Date();

  const rows = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_sale: {
        findMany: (args: unknown) => Promise<
          Array<{
            counterparty: string;
            revenue: unknown;
            cost: unknown;
            quantity: unknown;
            timestamp: Date;
          }>
        >;
      };
      catalog_sales_customer: {
        findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
      };
    };

    const salesRows = await bag.movement_sales_sale.findMany({
      where: {
        active: true,
        kind: 'income',
        timestamp: { gte: fromDate, lte: toDate },
      },
      select: { counterparty: true, revenue: true, cost: true, quantity: true, timestamp: true },
    });

    const aggByCustomer = new Map<string, { revenue: number; cost: number; quantity: number }>();

    for (const r of salesRows) {
      const prev = aggByCustomer.get(r.counterparty) ?? { revenue: 0, cost: 0, quantity: 0 };
      aggByCustomer.set(r.counterparty, {
        revenue: prev.revenue + Number(r.revenue),
        cost: prev.cost + Number(r.cost),
        quantity: prev.quantity + Number(r.quantity),
      });
    }

    const customerIds = Array.from(aggByCustomer.keys());
    const customers =
      customerIds.length === 0
        ? []
        : await bag.catalog_sales_customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
          });
    const nameById = new Map(customers.map((c) => [c.id, c.name]));

    const result: Array<{
      customer: string;
      revenue: number;
      cost: number;
      margin: number;
      marginPct: number;
      quantity: number;
    }> = [];

    for (const [customerId, agg] of aggByCustomer) {
      const margin = agg.revenue - agg.cost;
      result.push({
        customer: nameById.get(customerId) ?? customerId,
        revenue: agg.revenue,
        cost: agg.cost,
        margin,
        marginPct: agg.revenue > 0 ? (margin / agg.revenue) * 100 : 0,
        quantity: agg.quantity,
      });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
  });

  const headers = ['Customer', 'Revenue', 'Cost', 'Margin', 'Margin %', 'Quantity'];
  const dataRows = rows.map((r) => [
    r.customer,
    r.revenue.toFixed(2),
    r.cost.toFixed(2),
    r.margin.toFixed(2),
    r.marginPct.toFixed(2),
    r.quantity,
  ]);

  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);

  return { headers, rows: dataRows, filenameSuffix: `${fromIso}-${toIso}` };
}

// ─── Sales by Product ─────────────────────────────────────────────────────────

export async function fetchSalesByProductRows(
  params: ReportParams,
  ctx: AppContext,
): Promise<{ headers: string[]; rows: unknown[][]; filenameSuffix: string }> {
  if (!ctx.tenant) throw new Error('Tenant context required');
  const tenantId = ctx.tenant.id;
  const fromDate =
    params.from ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const toDate = params.to ?? new Date();

  const rows = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_sale: {
        findMany: (args: unknown) => Promise<
          Array<{
            product: string;
            revenue: unknown;
            cost: unknown;
            quantity: unknown;
            timestamp: Date;
          }>
        >;
      };
      catalog_inventory_product: {
        findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
      };
    };

    const salesRows = await bag.movement_sales_sale.findMany({
      where: {
        active: true,
        kind: 'income',
        timestamp: { gte: fromDate, lte: toDate },
      },
      select: { product: true, revenue: true, cost: true, quantity: true, timestamp: true },
    });

    const aggByProduct = new Map<string, { revenue: number; cost: number; quantity: number }>();

    for (const r of salesRows) {
      const prev = aggByProduct.get(r.product) ?? { revenue: 0, cost: 0, quantity: 0 };
      aggByProduct.set(r.product, {
        revenue: prev.revenue + Number(r.revenue),
        cost: prev.cost + Number(r.cost),
        quantity: prev.quantity + Number(r.quantity),
      });
    }

    const productIds = Array.from(aggByProduct.keys());
    const products =
      productIds.length === 0
        ? []
        : await bag.catalog_inventory_product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true },
          });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    const result: Array<{
      product: string;
      revenue: number;
      cost: number;
      margin: number;
      marginPct: number;
      quantity: number;
    }> = [];

    for (const [productId, agg] of aggByProduct) {
      const margin = agg.revenue - agg.cost;
      result.push({
        product: nameById.get(productId) ?? productId,
        revenue: agg.revenue,
        cost: agg.cost,
        margin,
        marginPct: agg.revenue > 0 ? (margin / agg.revenue) * 100 : 0,
        quantity: agg.quantity,
      });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
  });

  const headers = ['Product', 'Revenue', 'Cost', 'Margin', 'Margin %', 'Quantity'];
  const dataRows = rows.map((r) => [
    r.product,
    r.revenue.toFixed(2),
    r.cost.toFixed(2),
    r.margin.toFixed(2),
    r.marginPct.toFixed(2),
    r.quantity,
  ]);

  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);

  return { headers, rows: dataRows, filenameSuffix: `${fromIso}-${toIso}` };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatAsCsv(headers: string[], rows: unknown[][]): Uint8Array {
  const lines: string[] = [];
  lines.push(headers.map(csvField).join(','));
  for (const row of rows) {
    lines.push(row.map(csvField).join(','));
  }
  const csvBody = lines.join('\r\n');
  const bom = '\uFEFF';
  const body = bom + csvBody;
  return new TextEncoder().encode(body);
}

export async function formatAsXlsx(
  headers: string[],
  rows: unknown[][],
  sheetName: string,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.addRow(headers);
  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

// ─── Main entrypoint ──────────────────────────────────────────────────────────

export async function renderReport(
  type: ReportType,
  format: ReportFormat,
  params: ReportParams,
  ctx: AppContext,
): Promise<ReportRenderResult> {
  let data: { headers: string[]; rows: unknown[][]; filenameSuffix: string };

  switch (type) {
    case 'gross-profit':
      data = await fetchGrossProfitRows(params, ctx);
      break;
    case 'ar-aging':
      data = await fetchARAgingRows(params, ctx);
      break;
    case 'ap-aging':
      data = await fetchAPAgingRows(params, ctx);
      break;
    case 'sales-by-customer':
      data = await fetchSalesByCustomerRows(params, ctx);
      break;
    case 'sales-by-product':
      data = await fetchSalesByProductRows(params, ctx);
      break;
    default:
      throw new Error(`Unknown report type: ${type}`);
  }

  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  const filename = `${type}-${data.filenameSuffix}.${ext}`;

  if (format === 'csv') {
    return {
      bytes: formatAsCsv(data.headers, data.rows),
      contentType: 'text/csv; charset=utf-8',
      filename,
    };
  }

  return {
    bytes: await formatAsXlsx(data.headers, data.rows, type),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename,
  };
}
