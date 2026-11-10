import { resolveContext } from '@/platform/auth/current-context';
import { withBypass } from '@/platform/db/tenant-context';
import { seedDemo } from '@/prisma/seed/runner';
import {
  SeedDemoRequestSchema,
  SeedDemoResponseSchema,
} from '@ishflow/mobile-api-contract';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  const ctx = await resolveContext();
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!ctx.tenant || !ctx.membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = SeedDemoRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { tenantId } = parsed.data;

  if (tenantId !== ctx.tenant.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const roles = (ctx.membership as unknown as { roles: Array<{ name: string }> }).roles ?? [];
  const isOwner = roles.some((r) => r.name === 'owner');
  if (!isOwner) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const result = await seedDemo(ctx);

  // Mark this tenant as having imported the demo dataset so GET /api/mobile/me
  // can surface `setupProgress.demoImported = true`. Re-runs are allowed and
  // simply refresh the timestamp; the SetupProgress flag is null-vs-not-null.
  // `updateMany` (vs `update`) is used so a missing row does not throw — the
  // demo flag is best-effort and must not fail the seed response.
  await withBypass((tx) =>
    tx.tenant.updateMany({
      where: { id: ctx.tenant!.id },
      data: { demoImportedAt: new Date() },
    }),
  );

  const documents =
    result.invoices.posted +
    result.invoices.drafts +
    result.payments.posted +
    result.payments.drafts +
    result.purchaseInvoices.posted +
    result.purchaseInvoices.drafts +
    result.paymentsSent.posted +
    result.paymentsSent.drafts;

  const body = SeedDemoResponseSchema.parse({
    ok: true,
    summary: {
      customers: result.customers,
      products: result.products,
      documents,
    },
  });

  return NextResponse.json(body);
}
