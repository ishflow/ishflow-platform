'use server';

import { generateApiKey } from '@/platform/api-keys/generate';
import { resolveContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { type ApiKeyScope, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export interface ApiTokenRow {
  id: string;
  name: string;
  keyPrefix: string;
  scope: ApiKeyScope;
  createdAt: string;
  lastUsedAt: string | null;
}

/** List the current tenant's active (non-revoked) API tokens. RLS-scoped. */
export async function listApiTokensAction(): Promise<ApiTokenRow[]> {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return [];
  const tenantId = ctx.tenant.id;
  const rows = await withTenant(tenantId, (tx) =>
    tx.apiKey.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    scope: r.scope,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
  }));
}

type CreateResult =
  | { ok: true; fullKey: string; keyPrefix: string }
  | { ok: false; code: 'invalid' | 'taken' | 'error' };

/**
 * Create a new API token for the current tenant. The full bearer key is
 * returned exactly once — only the prefix + bcrypt hash are persisted. The
 * key inherits the creator's permissions at auth time, so the `scope`
 * (read/write) only narrows, never escalates.
 */
export async function createApiTokenAction(input: {
  name: string;
  scope: 'read' | 'write';
}): Promise<CreateResult> {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return { ok: false, code: 'error' };
  const name = input.name?.trim();
  if (!name) return { ok: false, code: 'invalid' };
  const scope: ApiKeyScope = input.scope === 'write' ? 'write' : 'read';
  const tenantId = ctx.tenant.id;
  const userId = ctx.user.id;
  const { fullKey, prefix, hash } = await generateApiKey();
  try {
    await withTenant(tenantId, (tx) =>
      tx.apiKey.create({
        data: { tenantId, name, keyPrefix: prefix, keyHash: hash, scope, createdById: userId },
      }),
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, code: 'taken' };
    }
    return { ok: false, code: 'error' };
  }
  revalidatePath('/settings/api/tokens');
  return { ok: true, fullKey, keyPrefix: prefix };
}

/** Revoke (immediately disable) an API token. RLS + explicit tenant filter. */
export async function revokeApiTokenAction(id: string): Promise<{ ok: boolean }> {
  const ctx = await resolveContext();
  if (!ctx?.tenant) return { ok: false };
  const tenantId = ctx.tenant.id;
  const res = await withTenant(tenantId, (tx) =>
    tx.apiKey.updateMany({
      where: { id, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  );
  revalidatePath('/settings/api/tokens');
  return { ok: res.count > 0 };
}
