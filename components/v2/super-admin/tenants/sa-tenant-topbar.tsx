import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { CopyIdButton } from '@/components/v2/super-admin/tenants/copy-id-button';
import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

/**
 * Tenant detail page topbar — shared across all 13 sub-tabs so the breadcrumb
 * + impersonate/copy actions render identically. `tenant.id` is shown in the
 * subtitle as a mono code; full id is displayed in the detail page header
 * row.
 *
 * Impersonate POSTs to the existing operator route (locale-free; middleware
 * passes `/super-admin/**` through). That route signs the short-lived
 * impersonation cookie, audit-logs, and redirects into the tenant app where
 * `current-context` swaps the tenant (read-only while impersonating).
 */
export async function SaTenantTopbar({
  tenantId,
  tenantName,
  plan,
  currency,
  locale,
}: {
  tenantId: string;
  tenantName: string;
  plan: string;
  currency: string;
  locale: string;
}) {
  const t = await getTranslations('v2_super_admin.tenants.detail');
  return (
    <SaTopbar
      breadcrumb={t('breadcrumb', { tenant: tenantName })}
      title={tenantName}
      subtitle={`${tenantId} · ${plan} · ${currency} · ${locale}`}
      actions={
        <>
          <form
            action={`/super-admin/tenants/${tenantId}/impersonate/start`}
            method="post"
            style={{ display: 'contents' }}
          >
            <button type="submit" className="btn btn-secondary btn-sm">
              <ExternalLink size={14} strokeWidth={1.75} />
              {t('actions.impersonate')}
            </button>
          </form>
          <CopyIdButton value={tenantId} label={t('actions.copyId')} />
        </>
      }
    />
  );
}
