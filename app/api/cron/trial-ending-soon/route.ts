import { withBypass } from '@/platform/db/tenant-context';
import { recordCronRun } from '@/platform/super-admin/system/record-cron-run';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await recordCronRun('trial-ending-soon', async () => {
    const now = new Date();
    const minDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const tenants = await withBypass((tx) =>
      tx.tenant.findMany({
        where: {
          status: 'trialing',
          trialEndsAt: { gt: minDate, lte: maxDate },
        },
        select: { id: true, plan: true, trialEndsAt: true },
      }),
    );

    return { notified: tenants.length };
  });

  return NextResponse.json(payload);
}
