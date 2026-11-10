import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/registers/accounts-receivable';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { listRecordsPaged, registerBalanceGrouped } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import {
  type BalanceDirection,
  CounterpartyListQuerySchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BIND = {
  customer: {
    catalogId: 'sales.customer',
    registerId: 'sales.accounts_receivable',
    dimension: 'customer',
  },
  supplier: {
    catalogId: 'purchases.supplier',
    registerId: 'purchases.accounts_payable',
    dimension: 'supplier',
  },
} as const;

/**
 * Translate a raw register balance to a UX-facing direction label.
 *
 * `sales.accounts_receivable.amount` is what the customer owes us — positive
 * ⇒ "Owes us". `purchases.accounts_payable.amount` is what we owe the
 * supplier — positive ⇒ "We owe". We invert the sign for suppliers so the
 * same `BalanceDirection` enum reads correctly on both sides without baking
 * register semantics into the client.
 */
function direction(balance: number, type: 'customer' | 'supplier'): BalanceDirection {
  if (balance === 0) return 'zero';
  const owesUs = type === 'customer' ? balance > 0 : balance < 0;
  return owesUs ? 'owesUs' : 'weOwe';
}

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = CounterpartyListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  const { type, page, pageSize, q } = parsed.data;
  const bind = BIND[type];
  const registry = getRegistry();
  const catalogConfig = registry.catalog[bind.catalogId];
  const registerConfig = registry.register[bind.registerId];
  if (!catalogConfig || !registerConfig) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const list = await listRecordsPaged(app, catalogConfig, {
    search: q,
    page,
    pageSize,
  });

  const ids = list.rows.map((r) => String(r.id));
  const balanceMap = new Map<string, number>();
  if (ids.length > 0) {
    const grouped = await withTenant(app.tenant.id, (tx) =>
      registerBalanceGrouped(tx, registerConfig, { [bind.dimension]: { in: ids } }, [
        bind.dimension,
      ]),
    );
    // Primary resource = first key in `register.resources`. For both
    // sales.accounts_receivable and purchases.accounts_payable this is `amount`.
    const resourceKey = Object.keys(registerConfig.resources)[0];
    if (!resourceKey) {
      return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
    }
    for (const row of grouped) {
      const key = String(row[bind.dimension]);
      const value = Number(row[resourceKey] ?? 0);
      balanceMap.set(key, value);
    }
  }

  const items = list.rows.map((row) => {
    const idStr = String(row.id);
    const balance = balanceMap.get(idStr) ?? 0;
    return {
      id: idStr,
      code: (row.code as string | null | undefined) ?? null,
      name: String(row.name ?? ''),
      balance: balance.toString(),
      balanceDirection: direction(balance, type),
      currency: app.tenant.currency,
    };
  });

  // Don't Zod-parse our own response: Prisma rows carry `Date` instances which
  // `z.string().datetime()` rejects. JSON.stringify already emits ISO strings.
  // (see project convention: no server-side Zod parse of responses)
  return NextResponse.json({
    items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
  });
}
