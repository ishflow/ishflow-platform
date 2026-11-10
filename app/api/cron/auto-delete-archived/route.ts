import { prisma } from '@/platform/db';
import { withBypass } from '@/platform/db/tenant-context';
import { recordCronRun } from '@/platform/super-admin/system/record-cron-run';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HARD_DELETE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('Authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = await recordCronRun('auto-delete-archived', async () => {
    const cutoff = new Date(Date.now() - HARD_DELETE_WINDOW_MS);

    const archivedTenants = await withBypass((tx) =>
      tx.tenant.findMany({
        where: { deletedAt: { not: null, lt: cutoff } },
        select: { id: true, slug: true, name: true, clerkOrgId: true, deletedAt: true },
      }),
    );

    const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

    for (const tenant of archivedTenants) {
      try {
        await withBypass(async (tx) => {
          // Audit log before deletion
          await tx.auditLog.create({
            data: {
              tenantId: tenant.id,
              userId: null,
              entity: 'tenant',
              entityId: tenant.id,
              action: 'auto_delete',
              before: { deletedAt: tenant.deletedAt?.toISOString() },
            },
          });

          await tx.tenant.delete({ where: { id: tenant.id } });
        });

        await prisma.tenantDeletionLog.create({
          data: {
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            deletedBy: '00000000-0000-0000-0000-000000000000', // system
            metadata: { clerkOrgId: tenant.clerkOrgId, source: 'cron' },
          },
        });

        // Delete Clerk org
        try {
          const clerk = await clerkClient();
          await clerk.organizations.deleteOrganization(tenant.clerkOrgId);
        } catch {
          // Best effort
        }

        results.push({ slug: tenant.slug, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ slug: tenant.slug, ok: false, error: message });
      }
    }

    return { processed: results.length, results };
  });

  return NextResponse.json(payload);
}
