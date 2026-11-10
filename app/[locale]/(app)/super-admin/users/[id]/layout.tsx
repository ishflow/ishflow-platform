import { SaCatalogDetailTabs } from '@/components/v2/super-admin/sa-catalog-detail-tabs';
import { SaUserMutationBar } from '@/components/v2/super-admin/users/sa-user-mutation-bar';
import { SaUserTopbar } from '@/components/v2/super-admin/users/sa-user-topbar';
import { loadSaUser } from '@/lib/v2-super-admin/load-sa-user';
import { requireTenantContext } from '@/platform/auth/current-context';
import { isPlatformAdmin } from '@/platform/auth/platform-admin';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * User detail layout — gate via isPlatformAdmin (env allow-list or owner-role
 * fallback), then loadSaUser for the topbar. Tabs nav is the generic
 * SaCatalogDetailTabs driven by the super_admin.user config's `detail` block.
 */
export default async function SaUserLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    notFound();
  }
  if (!isPlatformAdmin(ctx)) notFound();

  const user = await loadSaUser(id);
  if (!user) notFound();

  return (
    <>
      <SaUserTopbar
        userId={user.id}
        email={user.email}
        fullName={user.fullName}
        clerkId={user.clerkId}
        status={user.status}
        createdAt={user.createdAt}
      />
      <div className="content">
        <SaCatalogDetailTabs
          catalogKey="super_admin.user"
          basePath={`/super-admin/users/${id}`}
          i18nNamespace="v2_super_admin.users.detail.tabs"
        />
        {children}
        <SaUserMutationBar userId={user.id} email={user.email} status={user.status} />
      </div>
    </>
  );
}
