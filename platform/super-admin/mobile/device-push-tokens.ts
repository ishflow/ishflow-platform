/**
 * Cross-tenant device push token audit for the Super Admin → Mobile page.
 *
 * Joins each token with its tenant + owning user. Paginated cursor-style on
 * `(lastUsedAt DESC, id DESC)`. Filter by tenantId. `appVersion` is not
 * currently captured on the `DevicePushToken` row; the distribution helper
 * groups by `platform` instead.
 */
import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';

export interface DevicePushTokenRow {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  /** Truncated token for display. The full secret value is never returned. */
  tokenPreview: string;
  platform: string;
  deviceName: string | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface ListPushTokensInput {
  tenantId?: string;
  limit?: number;
  cursor?: string;
}

export interface ListPushTokensResult {
  rows: DevicePushTokenRow[];
  nextCursor: string | null;
}

function previewToken(token: string): string {
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

export async function listDevicePushTokens(
  input: ListPushTokensInput = {},
): Promise<ListPushTokensResult> {
  const limit = Math.min(input.limit ?? 50, 200);
  const where: Prisma.DevicePushTokenWhereInput = input.tenantId
    ? { tenantId: input.tenantId }
    : {};
  return withBypass(async (tx) => {
    const rows = await tx.devicePushToken.findMany({
      where,
      orderBy: [{ lastUsedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    const hasMore = rows.length > limit;
    const sliced = rows.slice(0, limit);
    const mapped: DevicePushTokenRow[] = sliced.map((r) => {
      const fullName =
        [r.user.firstName, r.user.lastName].filter(Boolean).join(' ').trim() || null;
      return {
        id: r.id,
        tenantId: r.tenantId,
        tenantName: r.tenant.name,
        tenantSlug: r.tenant.slug,
        userId: r.userId,
        userEmail: r.user.email,
        userName: fullName,
        tokenPreview: previewToken(r.token),
        platform: r.platform,
        deviceName: r.deviceName,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt,
      };
    });
    const last = mapped[mapped.length - 1];
    return { rows: mapped, nextCursor: hasMore && last ? last.id : null };
  });
}

export async function getRawTokenById(tokenId: string): Promise<string | null> {
  const row = await withBypass((tx) =>
    tx.devicePushToken.findUnique({ where: { id: tokenId }, select: { token: true } }),
  );
  return row?.token ?? null;
}

export interface PlatformDistribution {
  platform: string;
  count: number;
}

export async function getPlatformDistribution(): Promise<PlatformDistribution[]> {
  const grouped = await withBypass((tx) =>
    tx.devicePushToken.groupBy({
      by: ['platform'],
      _count: { _all: true },
      orderBy: { _count: { platform: 'desc' } },
    }),
  );
  return grouped.map((g) => ({
    platform: g.platform,
    count: g._count._all,
  }));
}
