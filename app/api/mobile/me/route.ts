import {
  listMembershipsForUser,
  resolveContext,
  toMeResponse,
} from '@/platform/auth/current-context';
import { pickPrimaryRoleName } from '@/platform/auth/pick-primary-role';
import { isSubscriptionFeatureVisible } from '@/platform/billing/feature-flags';
import { getSetupProgress } from '@/platform/onboarding';
import {
  evaluateForceUpdate,
  type MobilePlatform,
} from '@/platform/super-admin/mobile/force-update';
import { getMinAppVersions } from '@/platform/super-admin/mobile/min-versions';
import { selectFabActions, selectTabs } from '@/lib/mobile/tab-registry';
import { DEFAULT_MOBILE_FEATURES, MeResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Mobile force-update header contract.
 *
 * Native clients SHOULD send their build version + platform on every request
 * so the API can decide whether a force-update is required:
 *
 *   x-app-version:  the running client version, dot-segmented, e.g. "1.6.0"
 *                   (a leading "v" is tolerated). Missing/garbage -> fail open.
 *   x-app-platform: "ios" | "android". Any other value -> fail open.
 *
 * No client sends these yet — that's expected. The API supports the contract
 * now and FAILS OPEN (no force-update) until the native apps adopt the headers
 * in a release, so existing clients are never bricked.
 *
 * The decision is surfaced advisory-only on the `/me` response under
 * `forceUpdate`. (`requireUpToDateClient` below can hard-gate other routes with
 * a 426 in the future; we do NOT retrofit every route now.)
 */
function readClientVersion(req: Request): {
  platform: MobilePlatform | null;
  clientVersion: string | null;
} {
  const rawPlatform = req.headers.get('x-app-platform')?.trim().toLowerCase() ?? null;
  const platform: MobilePlatform | null =
    rawPlatform === 'ios' || rawPlatform === 'android' ? rawPlatform : null;
  const rawVersion = req.headers.get('x-app-version')?.trim() ?? null;
  const clientVersion = rawVersion && rawVersion.length > 0 ? rawVersion : null;
  return { platform, clientVersion };
}

/**
 * Evaluate the force-update decision for an incoming request. Fail-open: any
 * error reading minimums (handled inside `getMinAppVersions`) or absent headers
 * resolves to `{ required: false }`.
 */
async function resolveForceUpdate(req: Request): Promise<ReturnType<typeof evaluateForceUpdate>> {
  const { platform, clientVersion } = readClientVersion(req);
  const min = await getMinAppVersions();
  return evaluateForceUpdate({ platform, clientVersion, min });
}

/**
 * Future hard-gate helper: returns a 426 `NextResponse` when the client is
 * below the configured minimum, or `null` when it may proceed. Not wired into
 * any route yet — the `/me` advisory `forceUpdate` field is the deliverable.
 */
export async function requireUpToDateClient(req: Request): Promise<NextResponse | null> {
  const forceUpdate = await resolveForceUpdate(req);
  if (!forceUpdate.required) return null;
  return NextResponse.json(
    { error: 'upgrade_required', forceUpdate },
    { status: 426 },
  );
}

export async function GET(request: Request): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const base = toMeResponse(ctx);
  const role = pickPrimaryRoleName(
    (ctx.membership as unknown as { roles: Array<{ name: string }> } | null)?.roles ?? [],
  );

  // List ALL of the user's active memberships so the iOS app can render
  // an organization switcher (web parity with Clerk OrganizationSwitcher).
  const memberships = await listMembershipsForUser(
    ctx.user.clerkId,
    ctx.user.id,
    ctx.tenant?.id ?? null,
  );

  // Compute the onboarding setup-progress strip for the iOS app. Returns
  // `null` once every flag is satisfied — we then omit the key so the Zod
  // `.optional()` consumer sees an absent field rather than a literal null.
  const setupProgress = ctx.tenant ? await getSetupProgress(ctx.tenant.id) : null;

  const subscriptionFeatureVisible = await isSubscriptionFeatureVisible();

  // Android compat: project `memberships` into the tenant-summary shape the
  // Android client expects. `currency` + `mobileFeatures` aren't per-membership
  // data in this query, so fall back to the active tenant's currency (or USD)
  // and the default feature flags. The iOS client keeps reading `memberships`.
  const activeCurrency = base.tenant?.currency ?? 'USD';
  const tenants = memberships.map((m) => ({
    id: m.tenantId,
    slug: m.tenantSlug,
    name: m.tenantName,
    currency: activeCurrency,
    mobileFeatures: { ...DEFAULT_MOBILE_FEATURES },
    role: m.primaryRole ?? null,
  }));

  const body = MeResponseSchema.parse({
    ...base,
    primaryRole: role,
    tabs: selectTabs(ctx),
    fabActions: selectFabActions(ctx),
    memberships,
    tenants,
    subscriptionFeatureVisible,
    ...(setupProgress ? { setupProgress } : {}),
  });

  // Force-update gate. Additive `forceUpdate` block so the native app can show
  // an update screen on boot. Attached outside `MeResponseSchema.parse` (which
  // strips unknown keys) — the contract package owns the validated shape, this
  // route owns this advisory extension. Fails open for header-less clients.
  const forceUpdate = await resolveForceUpdate(request);

  return NextResponse.json({ ...body, forceUpdate });
}
