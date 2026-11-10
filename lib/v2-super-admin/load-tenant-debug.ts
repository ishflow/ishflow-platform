import { withBypass, withTenant } from '@/platform/db/tenant-context';

export interface SaTenantDebugView {
  tenant: {
    id: string;
    name: string;
    plan: string;
    status: string;
    createdAt: Date;
    lastActivityAt: Date | null;
    clerkOrgId: string;
  };
  counts: {
    memberships: number;
    salesInvoices: number;
    purchaseInvoices: number;
    auditLog: number;
    addons: number;
    tags: number;
    notes: number;
    featureKills: number;
  };
  rls: {
    ok: boolean;
    role: string | null;
    error: string | null;
  };
  runtime: {
    region: string;
    nodeVersion: string;
    nextEnv: string;
    devBypassActive: boolean;
  };
}

async function rlsProbe(tenantId: string): Promise<SaTenantDebugView['rls']> {
  try {
    const role = await withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ current_user: string }>>('SELECT current_user');
      return rows[0]?.current_user ?? null;
    });
    return { ok: true, role, error: null };
  } catch (e) {
    return {
      ok: false,
      role: null,
      error: e instanceof Error ? e.message : 'unknown error',
    };
  }
}

export async function loadSaTenantDebug(tenantId: string): Promise<SaTenantDebugView | null> {
  const data = await withBypass(async (tx) => {
    const t = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        status: true,
        createdAt: true,
        lastActivityAt: true,
        clerkOrgId: true,
        deletedAt: true,
      },
    });
    if (!t || t.deletedAt) return null;

    const txTyped = tx as unknown as {
      membership: { count: (args: unknown) => Promise<number> };
      document_sales_invoice: { count: (args: unknown) => Promise<number> };
      document_purchases_invoice: { count: (args: unknown) => Promise<number> };
      auditLog: { count: (args: unknown) => Promise<number> };
      tenantAddon: { count: (args: unknown) => Promise<number> };
      tenantTag: { count: (args: unknown) => Promise<number> };
      tenantNote: { count: (args: unknown) => Promise<number> };
      tenantFeatureKill: { count: (args: unknown) => Promise<number> };
    };
    const [memberships, salesInvoices, purchaseInvoices, auditLog, addons, tags, notes, fkills] =
      await Promise.all([
        txTyped.membership.count({ where: { tenantId } }),
        txTyped.document_sales_invoice.count({ where: { tenantId } }),
        txTyped.document_purchases_invoice.count({ where: { tenantId } }),
        txTyped.auditLog.count({ where: { tenantId } }),
        txTyped.tenantAddon.count({ where: { tenantId } }),
        txTyped.tenantTag.count({ where: { tenantId } }),
        txTyped.tenantNote.count({ where: { tenantId } }),
        txTyped.tenantFeatureKill.count({ where: { tenantId } }),
      ]);

    return {
      tenant: t,
      counts: {
        memberships,
        salesInvoices,
        purchaseInvoices,
        auditLog,
        addons,
        tags,
        notes,
        featureKills: fkills,
      },
    };
  });
  if (!data) return null;

  const rls = await rlsProbe(tenantId);

  return {
    tenant: data.tenant,
    counts: data.counts,
    rls,
    runtime: {
      region: process.env.VERCEL_REGION ?? 'localhost',
      nodeVersion: process.version,
      nextEnv: process.env.NODE_ENV ?? 'unknown',
      devBypassActive: process.env.DEV_AUTH_BYPASS === '1',
    },
  };
}
