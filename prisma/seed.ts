import '../configs/inventory/catalogs/product';
import '../configs/inventory/catalogs/warehouse';
import '../configs/inventory/registers/stock-balance';
import '../configs/purchases/catalogs/supplier';
import '../configs/purchases/documents/payment-sent';
import '../configs/purchases/documents/purchase-invoice';
import '../configs/purchases/registers/accounts-payable';
import '../configs/sales/catalogs/customer';
import '../configs/sales/catalogs/price-agreement';
import '../configs/sales/documents/payment-received';
import '../configs/sales/documents/sales-invoice';
import '../configs/sales/registers/accounts-receivable';
import '../configs/sales/registers/sale';
import '../configs/treasury/catalogs/cash-register';
import '../configs/treasury/registers/cash-funds';

import type { AppContext } from '../platform/auth/current-context';
import { seedSystemRoles } from '../platform/auth/seed-system-roles';
import { prisma, prismaReady } from '../platform/db';
import { withBypass } from '../platform/db/tenant-context';
import { backfillStockCost } from '../platform/engine/backfill-stock-cost';
import { seedRandom } from './seed/factories';
import { seedDemo } from './seed/runner';

type TxClient = Parameters<Parameters<typeof withBypass>[0]>[0];

async function pickTargetTenant(tx: TxClient) {
  const envOrgId = process.env.SEED_TENANT_CLERK_ORG_ID;
  if (envOrgId) {
    const t = await tx.tenant.findUnique({ where: { clerkOrgId: envOrgId } });
    if (!t) {
      throw new Error(`SEED_TENANT_CLERK_ORG_ID=${envOrgId} but no matching tenant in DB.`);
    }
    return t;
  }
  const real = await tx.tenant.findMany({
    where: { NOT: { clerkOrgId: { startsWith: 'org_seed_' } } },
  });
  if (real.length === 1) {
    const t = real[0];
    if (!t) throw new Error('unreachable: findMany length 1 but [0] undefined');
    return t;
  }
  if (real.length > 1) {
    const clerkIds = real.map((r) => `${r.slug} (${r.clerkOrgId})`).join(', ');
    throw new Error(
      `Ambiguous seed target: ${real.length} real tenants [${clerkIds}]. Set SEED_TENANT_CLERK_ORG_ID in .env.local.`,
    );
  }
  return tx.tenant.upsert({
    where: { clerkOrgId: 'org_seed_demo' },
    create: {
      clerkOrgId: 'org_seed_demo',
      name: 'Demo Tenant',
      slug: 'demo',
      plan: 'free',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });
}

async function ensureSystemUser(tx: TxClient, tenantId: string) {
  const user = await tx.user.upsert({
    where: { clerkId: 'user_seed_system' },
    create: {
      clerkId: 'user_seed_system',
      email: 'seed@ishflow.local',
      firstName: 'Seed',
      lastName: 'System',
    },
    update: {},
  });
  await seedSystemRoles(tenantId, tx);
  const systemRoles = await tx.role.findMany({
    where: { tenantId, name: { in: ['admin', 'manager', 'owner'] } },
    select: { id: true },
  });
  const membership = await tx.membership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    create: {
      tenantId,
      userId: user.id,
      roles: { connect: systemRoles.map((r) => ({ id: r.id })) },
    },
    update: {
      roles: { set: systemRoles.map((r) => ({ id: r.id })) },
    },
  });
  return { user, membership };
}

async function main() {
  await prismaReady; // Fail fast if the runtime role can bypass RLS.
  seedRandom();

  const ctx: AppContext = await withBypass(async (tx) => {
    const tenant = await pickTargetTenant(tx);
    const { user, membership } = await ensureSystemUser(tx, tenant.id);
    return {
      user,
      tenant,
      membership,
      permissions: new Set<string>(['*:*']),
      scopesByEntity: new Map(),
      addons: new Set(),
    };
  });

  process.stdout.write(
    `seeding into tenant ${ctx.tenant?.slug ?? '(unknown)'} (${ctx.tenant?.id ?? '?'}) as ${ctx.user.email}\n`,
  );

  const result = await seedDemo(ctx);
  process.stdout.write(
    `seed complete: customers=${result.customers}, products=${result.products}, ` +
      `invoices=${result.invoices.posted}+${result.invoices.drafts}, ` +
      `payments=${result.payments.posted}+${result.payments.drafts}, ` +
      `suppliers=${result.suppliers}, ` +
      `purchaseInvoices=${result.purchaseInvoices.posted}+${result.purchaseInvoices.drafts}, ` +
      `paymentsSent=${result.paymentsSent.posted}+${result.paymentsSent.drafts}\n`,
  );

  if (ctx.tenant) {
    const backfill = await backfillStockCost(
      ctx as AppContext & { tenant: NonNullable<AppContext['tenant']> },
    );
    process.stdout.write(
      `backfill complete: ${backfill.docsReplayed} docs, ${backfill.movementCount} movements\n`,
    );
  }
}

main()
  .catch((error) => {
    process.stderr.write(`seed failed: ${(error as Error).message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
