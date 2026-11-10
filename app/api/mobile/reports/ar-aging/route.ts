import { buildArAging } from '@/lib/reports/ar-aging';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { ArAgingResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const asOf = new Date();
  const result = await withTenant(app.tenant.id, (tx) => buildArAging(tx, asOf));
  const body = ArAgingResponseSchema.parse(result);
  return NextResponse.json(body);
}
