import { Link } from '@/platform/i18n/navigation';
import { AlertOctagon } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Operator-impersonating-tenant banner (red).
 *
 * Stuck to the top of the main area when an operator has used "Sign in as
 * tenant" from `/super-admin/tenants/[id]`. Every action under the banner
 * is recorded with `as: super_admin` in the audit log. Integration phase
 * wires the actual impersonation state and exit link target.
 */
export function ImpersonatingBanner({
  tenantName,
  userEmail,
  exitHref,
}: {
  tenantName: string;
  userEmail: string;
  exitHref: string;
}) {
  const t = useTranslations('v2_super_admin.banners.impersonating');
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: 'var(--danger-soft)',
        color: 'var(--danger-text)',
        borderBottom: '1px solid var(--danger)',
        fontSize: 13,
      }}
    >
      <AlertOctagon size={16} strokeWidth={1.75} />
      <div style={{ flex: 1 }}>
        {t.rich('message', {
          tenant: tenantName,
          user: userEmail,
          b: (chunks) => <b>{chunks}</b>,
          mono: (chunks) => <span style={{ fontFamily: 'var(--font-mono)' }}>{chunks}</span>,
        })}
      </div>
      <Link
        href={exitHref}
        style={{ color: 'var(--danger-text)', fontWeight: 600, textDecoration: 'underline' }}
      >
        {t('exit')} →
      </Link>
    </div>
  );
}
