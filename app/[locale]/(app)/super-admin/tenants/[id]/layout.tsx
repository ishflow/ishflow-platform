import { SaCatalogDetailTabs } from '@/components/v2/super-admin/sa-catalog-detail-tabs';
import { SaTenantTopbar } from '@/components/v2/super-admin/tenants/sa-tenant-topbar';
import { loadSaTenant } from '@/lib/v2-super-admin/load-tenant';
import { requireTenantContext } from '@/platform/auth/current-context';
import { isPlatformAdmin } from '@/platform/auth/platform-admin';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Tenant detail layout — renders the shared topbar (with breadcrumb +
 * impersonate / copy-id actions) and the 12-tab sub-nav above every detail
 * sub-page. Faz B1: data now real from `loadSaTenant`. Permission gate via
 * `isPlatformAdmin` (env allow-list or owner-role fallback).
 */
export default async function SaTenantLayout({
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

  const tenant = await loadSaTenant(id);
  if (!tenant) notFound();

  return (
    <>
      <SaTenantTopbar
        tenantId={tenant.id}
        tenantName={tenant.name}
        plan={tenant.plan}
        currency={tenant.currency}
        locale={tenant.defaultLocale}
      />
      <div className="content">
        <SaCatalogDetailTabs
          catalogKey="super_admin.tenant"
          basePath={`/super-admin/tenants/${id}`}
          i18nNamespace="v2_super_admin.tenants.detail.tabs"
        />
        {children}
      </div>
    </>
  );
}
