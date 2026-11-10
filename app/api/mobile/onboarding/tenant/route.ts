import { resolveContext } from '@/platform/auth/current-context';
import { signMobileJWT } from '@/platform/auth/mobile-jwt';
import { OnboardingError, createTenantForUser } from '@/platform/onboarding/create-tenant';
import {
  CreateTenantRequestSchema,
  CreateTenantResponseSchema,
} from '@ishflow/mobile-api-contract';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = CreateTenantRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { name, currency, locale } = parsed.data;

  try {
    const result = await createTenantForUser({
      userId: ctx.user.id,
      name,
      currency,
      locale,
    });

    // JWT `sub` MUST be the Clerk user id — `resolveBearerContext` resolves the
    // user via `findUnique({ where: { clerkId: claims.userId } })`. Signing the
    // platform UUID (`ctx.user.id`) makes every subsequent bearer-mode mobile
    // call 401 silently (the lookup misses). Mirrors app/api/mobile/auth/bridge.
    const jwt = await signMobileJWT({
      userId: ctx.user.clerkId,
      tenantId: result.tenant.id,
      scopes: [],
    });

    const trialEndsAt = result.tenant.trialEndsAt ?? new Date();
    const body = CreateTenantResponseSchema.parse({
      tenantId: result.tenant.id,
      jwt,
      trialEndsAt: trialEndsAt.toISOString(),
    });

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof OnboardingError && error.code === 'already_onboarded') {
      return NextResponse.json({ error: 'already_onboarded' }, { status: 409 });
    }
    throw error;
  }
}
