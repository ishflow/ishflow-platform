#!/usr/bin/env tsx
import type { AppContext } from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import { backfillStockCost } from '@/platform/engine/backfill-stock-cost';

async function main() {
  if (process.env.BACKFILL_STOCK_COST !== '1') {
    console.error(
      'Refusing to run: set BACKFILL_STOCK_COST=1 to confirm. This wipes two register tables.',
    );
    process.exit(1);
  }

  const tenantArg = process.argv.find((a) => a.startsWith('--tenant='));
  const tenantFilter = tenantArg?.slice('--tenant='.length);

  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, currency: true },
  });
  const tenants = allTenants.filter(
    (t) => !tenantFilter || tenantFilter === 'all' || t.id === tenantFilter,
  );

  if (tenants.length === 0) {
    console.error('No matching tenants found.');
    process.exit(1);
  }

  for (const t of tenants) {
    const ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> } = {
      tenant: { id: t.id, name: t.name, currency: t.currency } as NonNullable<AppContext['tenant']>,
      user: { id: 'backfill-script', email: 'backfill@system' } as AppContext['user'],
      membership: null,
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map<string, unknown>(),
    } as AppContext & { tenant: NonNullable<AppContext['tenant']> };

    const started = Date.now();
    try {
      const r = await backfillStockCost(ctx);
      console.info(
        `[ok] ${t.id} (${t.name}) — ${r.docsReplayed} docs, ${r.movementCount} movements, ${Date.now() - started}ms`,
      );
    } catch (err) {
      console.error(`[fail] ${t.id} (${t.name}):`, err);
    }
  }

  await prisma.$disconnect();
  process.exit(0);
}

main();
