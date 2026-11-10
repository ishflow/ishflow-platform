import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getViewPreference, upsertViewPreference } from '@/platform/engine/saved-views';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const upsertSchema = z.object({
  viewId: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/view-prefs — idempotent upsert of a per-(tenant, user, view)
 * preference blob. Single row per (tenant, user, viewId) — helper handles
 * the find-or-create. Distinct from /api/saved-views (which is plan-gated
 * and stores user-named view snapshots).
 *
 * Body: { viewId: string, payload: object }
 */
export async function POST(req: Request) {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const pref = await withTenant(ctx.tenant.id, (tx) =>
    upsertViewPreference(tx, ctx.tenant.id, ctx.user.id, parsed.data.viewId, parsed.data.payload),
  );

  return NextResponse.json({ pref });
}

/**
 * GET /api/view-prefs?viewId=<id> — fetch the current user's preference
 * for the named view (or null if never saved).
 */
export async function GET(req: Request) {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const viewId = new URL(req.url).searchParams.get('viewId');
  if (!viewId) {
    return NextResponse.json({ error: 'VIEW_ID_REQUIRED' }, { status: 400 });
  }

  const pref = await withTenant(ctx.tenant.id, (tx) =>
    getViewPreference(tx, ctx.tenant.id, ctx.user.id, viewId),
  );

  return NextResponse.json({ pref: pref ?? null });
}
