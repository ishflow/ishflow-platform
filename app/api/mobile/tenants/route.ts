import { resolveContext } from '@/platform/auth/current-context';
import { prisma } from '@/platform/db';
import {
  DEFAULT_MOBILE_FEATURES,
  TenantListResponseSchema,
} from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/tenants — list every tenant the authenticated user belongs to.
 *
 * Powers the iOS Settings → Tenant Switch picker. Returns a `TenantSummary`
 * per membership, with `mobileFeatures` shaped by `DEFAULT_MOBILE_FEATURES`
 * overlaid with whatever the tenant has stored in its JSON column. The
 * `currency` column is non-nullable in Prisma (defaults to `'USD'`), but we
 * defend against legacy / null rows with the `?? 'USD'` fallback so the
 * Zod parse never trips on the wire.
 */
export async function GET(): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: ctx.user.id },
    include: { tenant: true },
  });

  const items = memberships.map((m) => {
    const tenant = m.tenant as unknown as {
      id: string;
      slug: string;
      name: string;
      currency: string | null;
      mobileFeatures?: Record<string, boolean> | null;
    };
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      currency: tenant.currency ?? 'USD',
      mobileFeatures: { ...DEFAULT_MOBILE_FEATURES, ...(tenant.mobileFeatures ?? {}) },
    };
  });

  return NextResponse.json(TenantListResponseSchema.parse({ items }));
}
