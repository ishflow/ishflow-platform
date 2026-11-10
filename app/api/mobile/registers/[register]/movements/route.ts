import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/registers/accounts-receivable';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { listMovementsPaged } from '@/platform/engine';
import { getRegistry, isAccumulationRegister } from '@/platform/metadata';
import {
  RegisterMovementsQuerySchema,
  RegisterParamSchema,
  type RegisterMovementsResponse,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MOBILE_REGISTER_ALIASES: Record<string, string> = {
  'ar.receivable': 'sales.accounts_receivable',
  'inventory.stock': 'inventory.stock_balance',
  'ap.payable': 'purchases.accounts_payable',
};

type AnyRow = Record<string, unknown>;

function asString(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  return null;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (v && typeof v === 'object') {
    const obj = v as { toNumber?: () => number; toString?: () => string };
    if (typeof obj.toNumber === 'function') return obj.toNumber();
    if (typeof obj.toString === 'function') return Number(obj.toString());
  }
  return 0;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ register: string }> },
): Promise<Response> {
  const { register } = await ctx.params;
  const parsed = RegisterParamSchema.safeParse(register);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid register' }, { status: 400 });
  }
  const canonicalId = MOBILE_REGISTER_ALIASES[parsed.data] ?? parsed.data;
  const config = getRegistry().register[canonicalId];
  if (!config) {
    return NextResponse.json({ error: 'unknown register' }, { status: 404 });
  }
  if (!isAccumulationRegister(config)) {
    return NextResponse.json({ error: 'register has no movements' }, { status: 400 });
  }

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = RegisterMovementsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  // Build a Prisma `where` from any dimension filters that match this
  // register's declared dimensions.
  const dimNames = new Set(Object.keys(config.dimensions ?? {}));
  const filter: Record<string, unknown> = {};
  if (q.data.product && dimNames.has('product')) filter.product = q.data.product;
  if (q.data.warehouse && dimNames.has('warehouse')) filter.warehouse = q.data.warehouse;
  if (q.data.customer && dimNames.has('customer')) filter.customer = q.data.customer;
  if (q.data.supplier && dimNames.has('supplier')) filter.supplier = q.data.supplier;

  const result = await withTenant(app.tenant.id, async (tx) => {
    const page = await listMovementsPaged(tx, config, {
      page: 1,
      pageSize: q.data.limit,
      filter,
    });

    const rows = page.rows as AnyRow[];

    // Batch-resolve product + warehouse names + document numbers so the iOS
    // row can render `Çorum Depo · Samsung — 5` without per-row N+1.
    const productIds = new Set<string>();
    const warehouseIds = new Set<string>();
    const docRefsByType = new Map<string, Set<string>>();
    for (const r of rows) {
      const pid = asString(r.product);
      if (pid) productIds.add(pid);
      const wid = asString(r.warehouse);
      if (wid) warehouseIds.add(wid);
      const docType = asString(r.docType);
      const docRef = asString(r.docRef);
      if (docType && docRef) {
        const bucket = docRefsByType.get(docType) ?? new Set<string>();
        bucket.add(docRef);
        docRefsByType.set(docType, bucket);
      }
    }

    const bag = tx as Record<string, unknown>;
    type FindMany = (args: {
      where: { id: { in: string[] } };
      select: Record<string, true>;
    }) => Promise<Array<AnyRow>>;

    const productDelegate =
      (bag.catalog_inventory_product ?? bag.catalogInventoryProduct) as
        | { findMany: FindMany }
        | undefined;
    const warehouseDelegate =
      (bag.catalog_inventory_warehouse ?? bag.catalogInventoryWarehouse) as
        | { findMany: FindMany }
        | undefined;

    const productNameById = new Map<string, string>();
    if (productDelegate && productIds.size > 0) {
      const list = await productDelegate.findMany({
        where: { id: { in: Array.from(productIds) } },
        select: { id: true, name: true },
      });
      for (const r of list) {
        const id = asString(r.id);
        const name = asString(r.name);
        if (id && name) productNameById.set(id, name);
      }
    }

    const warehouseNameById = new Map<string, string>();
    if (warehouseDelegate && warehouseIds.size > 0) {
      const list = await warehouseDelegate.findMany({
        where: { id: { in: Array.from(warehouseIds) } },
        select: { id: true, name: true },
      });
      for (const r of list) {
        const id = asString(r.id);
        const name = asString(r.name);
        if (id && name) warehouseNameById.set(id, name);
      }
    }

    // Look up document numbers per (docType, ids) batch using snake-case
    // model names (`document_<module>_<name>`). Best-effort — missing
    // delegate or row leaves docNumber null.
    const docNumberByRef = new Map<string, string>();
    for (const [docType, refs] of docRefsByType.entries()) {
      const [module, name] = docType.split('.');
      if (!module || !name) continue;
      const snake = `document_${module}_${name}`;
      const camel = `document${module.charAt(0).toUpperCase()}${module.slice(1)}${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      const delegate = (bag[snake] ?? bag[camel]) as { findMany: FindMany } | undefined;
      if (!delegate) continue;
      const list = await delegate.findMany({
        where: { id: { in: Array.from(refs) } },
        select: { id: true, number: true },
      });
      for (const r of list) {
        const id = asString(r.id);
        const num = asString(r.number);
        if (id && num) docNumberByRef.set(id, num);
      }
    }

    return rows.map((r) => {
      const productId = asString(r.product);
      const warehouseId = asString(r.warehouse);
      const docRef = asString(r.docRef) ?? '';
      const docType = asString(r.docType) ?? '';
      const kind = asString(r.kind) ?? 'income';
      const qtyRaw = toNumber(r.quantity);
      const sign = kind === 'expense' ? -1 : 1;
      const qty = qtyRaw * sign;
      return {
        id: String(r.id ?? ''),
        timestamp: (r.timestamp instanceof Date
          ? r.timestamp.toISOString()
          : String(r.timestamp ?? new Date().toISOString())),
        kind,
        docRef,
        docType,
        docNumber: docNumberByRef.get(docRef) ?? null,
        warehouseId,
        warehouseName: warehouseId ? warehouseNameById.get(warehouseId) ?? null : null,
        productId,
        productName: productId ? productNameById.get(productId) ?? null : null,
        quantity: qty.toString(),
      };
    });
  });

  const body: RegisterMovementsResponse = {
    register: config.id,
    items: result,
  };
  return NextResponse.json(body);
}
