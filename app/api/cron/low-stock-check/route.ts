import { withBypass } from '@/platform/db/tenant-context';
import { dispatchLowStockAlert } from '@/platform/notifications/dispatch-low-stock-alert';
import { recordCronRun } from '@/platform/super-admin/system/record-cron-run';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handler(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await recordCronRun('low-stock-check', async () => {
    const tenants = await withBypass((tx) =>
      tx.tenant.findMany({
        where: { status: { in: ['active', 'trialing'] }, deletedAt: null },
        select: { id: true },
      }),
    );

    let totalEmails = 0;
    for (const t of tenants) {
      try {
        const { emails } = await dispatchLowStockAlert(t.id);
        totalEmails += emails;
      } catch (err) {
        console.warn('[cron/low-stock-check] tenant failed', { tenantId: t.id, err });
      }
    }

    return { tenants: tenants.length, emails: totalEmails };
  });

  return NextResponse.json(payload);
}

// Vercel Cron sends GET; the local/CI POST path is preserved so test fixtures
// can drive the handler directly.
export const GET = handler;
export const POST = handler;
