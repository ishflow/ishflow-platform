import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { sendLowStockAlertEmail } from '@/platform/email/send-low-stock-alert';
import { WEB_BASE_URL, normalizeEmailLocale } from './locale';
import { getNotificationSettings } from './settings';

interface StockGroupRow {
  product: string;
  _sum: { quantity: unknown };
}

interface LowStockTx {
  movement_inventory_stock_balance: {
    groupBy: (args: {
      by: string[];
      where: { active: true; kind: 'income' | 'expense' };
      _sum: { quantity: true };
    }) => Promise<StockGroupRow[]>;
  };
  catalog_inventory_product: {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: { id: true; name: true };
    }) => Promise<Array<{ id: string; name: string }>>;
  };
  membership: {
    findMany: (args: {
      where: {
        roles: { some: { name: { in: string[] }; isSystem: true } };
      };
      select: { user: { select: { email: true } } };
    }) => Promise<Array<{ user: { email: string | null } | null }>>;
  };
}

interface TenantTx {
  tenant: {
    findUnique: (args: {
      where: { id: string };
      select: { id: true; name: true; defaultLocale: true };
    }) => Promise<{ id: string; name: string; defaultLocale: string } | null>;
  };
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

export async function dispatchLowStockAlert(tenantId: string): Promise<{ emails: number }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifications] RESEND_API_KEY not set — low-stock alert skipped', { tenantId });
    return { emails: 0 };
  }

  const settings = await getNotificationSettings(tenantId);
  if (!settings.lowStockAlert) return { emails: 0 };

  // RLS-scoped reads — every query inside withTenant is automatically
  // restricted to this tenant's rows by the database policies.
  const data = await withTenant(tenantId, async (txRaw) => {
    const tx = txRaw as unknown as LowStockTx;
    const [incomeRows, expenseRows] = await Promise.all([
      tx.movement_inventory_stock_balance.groupBy({
        by: ['product'],
        where: { active: true, kind: 'income' },
        _sum: { quantity: true },
      }),
      tx.movement_inventory_stock_balance.groupBy({
        by: ['product'],
        where: { active: true, kind: 'expense' },
        _sum: { quantity: true },
      }),
    ]);

    const onHandByProduct = new Map<string, number>();
    for (const row of incomeRows) {
      onHandByProduct.set(
        row.product,
        (onHandByProduct.get(row.product) ?? 0) + toNumber(row._sum.quantity),
      );
    }
    for (const row of expenseRows) {
      onHandByProduct.set(
        row.product,
        (onHandByProduct.get(row.product) ?? 0) - toNumber(row._sum.quantity),
      );
    }

    const lowProducts: Array<{ id: string; onHand: number }> = [];
    for (const [productId, onHand] of onHandByProduct) {
      if (onHand < settings.lowStockThreshold) {
        lowProducts.push({ id: productId, onHand });
      }
    }
    if (lowProducts.length === 0) {
      return {
        items: [] as Array<{ name: string; onHand: number; threshold: number }>,
        recipients: [] as string[],
      };
    }

    const [products, members] = await Promise.all([
      tx.catalog_inventory_product.findMany({
        where: { id: { in: lowProducts.map((p) => p.id) } },
        select: { id: true, name: true },
      }),
      tx.membership.findMany({
        where: {
          roles: { some: { name: { in: ['owner', 'admin'] }, isSystem: true } },
        },
        select: { user: { select: { email: true } } },
      }),
    ]);

    const nameById = new Map(products.map((p) => [p.id, p.name]));
    const items = lowProducts
      .map((p) => ({
        name: nameById.get(p.id) ?? p.id,
        onHand: p.onHand,
        threshold: settings.lowStockThreshold,
      }))
      .sort((a, b) => a.onHand - b.onHand);

    const recipients = Array.from(
      new Set(
        members
          .map((m) => m.user?.email ?? null)
          .filter((e): e is string => typeof e === 'string' && e.length > 0),
      ),
    );

    return { items, recipients };
  });

  if (data.items.length === 0 || data.recipients.length === 0) {
    return { emails: 0 };
  }

  const tenant = await withBypass(async (txRaw) => {
    const tx = txRaw as unknown as TenantTx;
    return tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, defaultLocale: true },
    });
  });
  if (!tenant) return { emails: 0 };

  const locale = normalizeEmailLocale(tenant.defaultLocale);
  const dashboardUrl = `${WEB_BASE_URL}/${locale}/dashboard`;

  let emails = 0;
  for (const to of data.recipients) {
    try {
      await sendLowStockAlertEmail({
        to,
        workspaceName: tenant.name,
        items: data.items,
        dashboardUrl,
        locale,
      });
      emails += 1;
      await sleep(110); // gentle throttle for Resend free-tier 10 req/s
    } catch (err) {
      console.warn('[notifications] low-stock email failed', { tenantId, to, err });
    }
  }
  return { emails };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
