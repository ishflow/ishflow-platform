import { requireTenantContext } from '@/platform/auth/current-context';
import { assertPlanAllows } from '@/platform/billing/assert-plan-allows';
import { withTenant } from '@/platform/db/tenant-context';
import { PlanLimitError } from '@/platform/engine/errors';
import { createSavedView, listSavedViews } from '@/platform/engine/saved-views';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createSchema = z.object({
  kind: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
});

const listSchema = z.object({
  kind: z.string().min(1).max(100),
});

/**
 * POST /api/saved-views — create a saved view scoped to (tenant, user, kind).
 *
 * Request body: { kind: string, name: string, payload: object }
 * - kind:    namespace for the view (e.g. "register:accounts-receivable")
 * - name:    user-facing label
 * - payload: opaque JSON, typically the captured URL search params
 *
 * 200: { view: SavedView }
 * 400: { error: "VALIDATION_ERROR", issues: [...] }
 * 401: { error: "UNAUTHENTICATED" }
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    await assertPlanAllows(ctx.tenant, { kind: 'create_saved_view' });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json(
        {
          error: 'PLAN_LIMIT',
          kind: err.kind,
          current: err.current,
          allowed: err.allowed,
          upgradeTo: err.upgradeTo,
        },
        { status: 402 },
      );
    }
    throw err;
  }

  const view = await withTenant(ctx.tenant.id, (tx) =>
    createSavedView(tx, {
      tenantId: ctx.tenant.id,
      userId: ctx.user.id,
      kind: parsed.data.kind,
      name: parsed.data.name,
      payload: parsed.data.payload,
    }),
  );

  return NextResponse.json({ view });
}

/**
 * GET /api/saved-views?kind=<kind> — list saved views for the current
 * tenant + user + kind, newest updated first.
 */
export async function GET(req: Request) {
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = listSchema.safeParse({ kind: url.searchParams.get('kind') ?? '' });
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const views = await withTenant(ctx.tenant.id, (tx) =>
    listSavedViews(tx, ctx.tenant.id, ctx.user.id, parsed.data.kind),
  );

  return NextResponse.json({ views });
}
