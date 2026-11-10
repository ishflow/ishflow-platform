/**
 * Cross-tenant API key audit for the Super Admin → System → API keys page.
 *
 * Returns every `ApiKey` row joined with tenant + creator. `keyHash` is
 * intentionally excluded — operators only need the prefix + scope + activity.
 */
import { withBypass } from '@/platform/db/tenant-context';
import type { ApiKeyScope, Prisma } from '@prisma/client';

export interface ApiKeyAuditRow {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  name: string;
  keyPrefix: string;
  scope: ApiKeyScope;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdBy: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface ListApiKeysInput {
  includeRevoked?: boolean;
  tenantId?: string;
  limit?: number;
}

export async function listApiKeysAcrossTenants(
  input: ListApiKeysInput = {},
): Promise<ApiKeyAuditRow[]> {
  const limit = Math.min(input.limit ?? 200, 500);
  const where: Prisma.ApiKeyWhereInput = {
    ...(input.includeRevoked ? {} : { revokedAt: null }),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
  };
  return withBypass(async (tx) => {
    const rows = await tx.apiKey.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => {
      const fullName =
        [r.createdBy.firstName, r.createdBy.lastName].filter(Boolean).join(' ').trim() || null;
      return {
        id: r.id,
        tenantId: r.tenantId,
        tenantName: r.tenant.name,
        tenantSlug: r.tenant.slug,
        name: r.name,
        keyPrefix: r.keyPrefix,
        scope: r.scope,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt,
        revokedAt: r.revokedAt,
        createdBy: {
          id: r.createdBy.id,
          email: r.createdBy.email,
          name: fullName,
        },
      };
    });
  });
}

export async function revokeApiKey(apiKeyId: string): Promise<void> {
  await withBypass((tx) =>
    tx.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
    }),
  );
}
