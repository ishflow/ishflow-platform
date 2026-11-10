import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/sales/registers/sale';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  balanceAsOf,
  registerBalanceAll,
  registerBalanceGrouped,
  resolveRefLabels,
} from '@/platform/engine';
import { getRegistry, isAccumulationRegister } from '@/platform/metadata';
import {
  RegisterBalanceQuerySchema,
  RegisterBalanceResponseSchema,
  RegisterParamSchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mobile slug aliases → canonical register IDs
const MOBILE_REGISTER_ALIASES: Record<string, string> = {
  'ar.receivable': 'sales.accounts_receivable',
  'inventory.stock': 'inventory.stock_balance',
  'ap.payable': 'purchases.accounts_payable',
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ register: string }> },
): Promise<Response> {
  const { register } = await ctx.params;
  const parsed = RegisterParamSchema.safeParse(register);
  if (!parsed.success) return NextResponse.json({ error: 'invalid register' }, { status: 400 });
  
  // Resolve mobile aliases to canonical register IDs
  const canonicalId = MOBILE_REGISTER_ALIASES[parsed.data] ?? parsed.data;
  const config = getRegistry().register[canonicalId];
  if (!config) return NextResponse.json({ error: 'unknown register' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const filterEntries: Array<[string, string]> = [];
  for (const [k, v] of url.searchParams.entries()) {
    if (k === 'asOf' || k === 'groupBy') continue;
    filterEntries.push([k, v]);
  }
  const filter = Object.fromEntries(filterEntries);
  const q = RegisterBalanceQuerySchema.safeParse({
    asOf: url.searchParams.get('asOf') ?? undefined,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });
  if (!q.success) return NextResponse.json({ error: 'invalid query' }, { status: 400 });

  const whereFilter: Record<string, unknown> = { ...(q.data.filter ?? {}) };
  const asOfDate = q.data.asOf ? new Date(`${q.data.asOf}T23:59:59.999Z`) : null;

  const resourceKey = Object.keys(config.resources)[0];
  if (!resourceKey) {
    return NextResponse.json({ error: 'register has no resources' }, { status: 500 });
  }

  const accumulationConfig = isAccumulationRegister(config) ? config : null;
  const groupByRaw = url.searchParams.get('groupBy');
  const groupByDims = groupByRaw
    ? groupByRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  if (groupByDims && groupByDims.length > 0) {
    if (!accumulationConfig) {
      return NextResponse.json(
        { error: 'register does not support groupBy' },
        { status: 400 },
      );
    }
    for (const dim of groupByDims) {
      if (!(dim in accumulationConfig.dimensions)) {
        return NextResponse.json({ error: `unknown dimension: ${dim}` }, { status: 400 });
      }
    }
    const groupedRows = await withTenant(app.tenant.id, async (tx) => {
      const grouped = await registerBalanceGrouped(
        tx,
        accumulationConfig,
        whereFilter,
        groupByDims,
      );
      const labelInputs = grouped.map((r) => ({
        groupKey: Object.fromEntries(groupByDims.map((d) => [d, String(r[d])])),
      }));
      const labelMaps = await resolveRefLabels(tx, accumulationConfig, labelInputs);
      return grouped.map((r, idx) => {
        const groupKey: Record<string, string> = {};
        for (const d of groupByDims) groupKey[d] = String(r[d]);
        const row: Record<string, unknown> = {
          groupKey,
          [resourceKey]: String(r[resourceKey] ?? '0'),
        };
        const labels = labelMaps[idx] ?? {};
        if (Object.keys(labels).length > 0) row.groupLabels = labels;
        return row;
      });
    });

    return NextResponse.json({
      register: config.id,
      asOf: null,
      rows: groupedRows,
    });
  }

  const groupKey: Record<string, string> = {};
  for (const [k, v] of Object.entries(q.data.filter ?? {})) {
    groupKey[k] = String(v);
  }

  const { rowResources, labels } = await withTenant(app.tenant.id, async (tx) => {
    const resources: Record<string, string> = {};
    if (asOfDate) {
      const { quantity } = await balanceAsOf(tx, config, whereFilter, asOfDate);
      resources[resourceKey] = String(quantity);
    } else {
      const all = await registerBalanceAll(tx, config, whereFilter);
      for (const [k, v] of Object.entries(all)) resources[k] = String(v);
    }
    const labelMaps = accumulationConfig
      ? await resolveRefLabels(tx, accumulationConfig, [{ groupKey }])
      : [];
    return { rowResources: resources, labels: labelMaps };
  });

  const groupLabels = labels[0] ?? {};
  const row: Record<string, unknown> = { groupKey, ...rowResources };
  if (Object.keys(groupLabels).length > 0) row.groupLabels = groupLabels;

  const body = RegisterBalanceResponseSchema.parse({
    register: config.id,
    asOf: asOfDate ? asOfDate.toISOString() : null,
    rows: [row],
  });
  return NextResponse.json(body);
}
