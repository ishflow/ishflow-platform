import { withBypass } from '@/platform/db/tenant-context';
import { recordCronRun } from '@/platform/super-admin/system/record-cron-run';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await recordCronRun('trial-expiry', async () => {
    const now = new Date();
    const expired = await withBypass((tx) =>
      tx.tenant.findMany({
        where: {
          status: 'trialing',
          trialEndsAt: { lt: now },
        },
        select: { id: true, plan: true },
      }),
    );

    for (const t of expired) {
      await withBypass(async (tx) => {
        await tx.tenant.update({
          where: { id: t.id },
          data: { status: 'active' },
        });
        await tx.billingEvent.create({
          data: {
            tenantId: t.id,
            stripeEventId: `synthetic_trial_expired_${t.id}_${Date.now()}`,
            type: 'trial.expired',
            payload: { plan: t.plan },
            processedAt: new Date(),
          },
        });
      });
    }

    return { processed: expired.length };
  });

  return NextResponse.json(payload);
}
