import { TimelineList } from '@/components/app/super-admin/tenants/timeline-list';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import { getTenantTimeline } from '@/platform/super-admin/tenants/timeline';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TenantTimelinePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [overview, dict, entries] = await Promise.all([
    getTenantOverview(tenantId),
    getTenantProDict(),
    getTenantTimeline(tenantId),
  ]);
  if (!overview) notFound();
  return <TimelineList entries={entries} dict={dict.timeline} />;
}
