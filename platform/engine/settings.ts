import type { Prisma } from '@prisma/client';

export type SettingsRow = {
  key: string;
  payload: Record<string, unknown>;
  updatedAt: Date;
};

/**
 * Read a single tenant_settings row by key. Returns the JSON payload as a
 * plain object, or null if the row does not exist. Caller must already be
 * inside withTenant (RLS scopes the query).
 */
export async function getSettings(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: string,
): Promise<Record<string, unknown> | null> {
  const row = await (
    tx as unknown as {
      tenantSettings: {
        findUnique: (a: unknown) => Promise<{ payload: unknown } | null>;
      };
    }
  ).tenantSettings.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { payload: true },
  });
  if (!row) return null;
  return row.payload as Record<string, unknown>;
}

/**
 * Upsert a tenant_settings row. payload is stored as JSONB. Caller must
 * already be inside withTenant.
 */
export async function setSettings(
  tx: Prisma.TransactionClient,
  tenantId: string,
  key: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await (
    tx as unknown as {
      tenantSettings: {
        upsert: (a: unknown) => Promise<unknown>;
      };
    }
  ).tenantSettings.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, payload },
    update: { payload },
  });
}

/**
 * List all tenant_settings rows for a tenant. Caller must already be inside
 * withTenant. Used by admin observability UIs (settings explorer).
 */
export async function listSettings(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<SettingsRow[]> {
  const rows = await (
    tx as unknown as {
      tenantSettings: {
        findMany: (
          a: unknown,
        ) => Promise<Array<{ key: string; payload: unknown; updatedAt: Date }>>;
      };
    }
  ).tenantSettings.findMany({
    where: { tenantId },
    orderBy: { key: 'asc' },
    select: { key: true, payload: true, updatedAt: true },
  });
  return rows.map((r) => ({
    key: r.key,
    payload: r.payload as Record<string, unknown>,
    updatedAt: r.updatedAt,
  }));
}
