import { SaTenantOverview } from '@/components/v2/super-admin/tenants/sa-tenant-overview';
import { loadSaTenant } from '@/lib/v2-super-admin/load-tenant';
import { loadSaTenantMembers } from '@/lib/v2-super-admin/load-tenant-members';
import type { Locale } from '@/platform/metadata';
import { notFound } from 'next/navigation';

export async function renderTenantOverviewTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [tenant, memberData] = await Promise.all([loadSaTenant(id), loadSaTenantMembers(id)]);
  if (!tenant) notFound();
  return (
    <SaTenantOverview
      tenant={tenant}
      status={tenant.status as Parameters<typeof SaTenantOverview>[0]['status']}
      members={memberData.members.map((m) => ({
        userId: m.userId,
        email: m.email,
        fullName: m.fullName,
      }))}
    />
  );
}
