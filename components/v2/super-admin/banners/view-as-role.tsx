import { Link } from '@/platform/i18n/navigation';
import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * View-as-role preview banner (yellow).
 *
 * Stuck to the top of the main area when an owner is previewing what a
 * specific role would see (UI-only — no mutations are written). Integration
 * phase scopes the rail / panel / page registries to the previewed role.
 */
export function ViewAsRoleBanner({
  previewRole,
  actualRole,
  exitHref,
}: {
  previewRole: string;
  actualRole: string;
  exitHref: string;
}) {
  const t = useTranslations('v2_super_admin.banners.viewAsRole');
  return (
    <output
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: 'var(--warning-soft)',
        color: 'var(--warning-text)',
        borderBottom: '1px solid var(--warning)',
        fontSize: 13,
      }}
    >
      <Eye size={16} strokeWidth={1.75} />
      <div style={{ flex: 1 }}>
        {t.rich('message', {
          preview: previewRole,
          actual: actualRole,
          b: (chunks) => <b>{chunks}</b>,
        })}
      </div>
      <Link
        href={exitHref}
        style={{ color: 'var(--warning-text)', fontWeight: 600, textDecoration: 'underline' }}
      >
        {t('exit')} →
      </Link>
    </output>
  );
}
