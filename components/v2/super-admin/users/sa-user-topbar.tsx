import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { Copy } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * User detail page topbar — analogous to SaTenantTopbar but scoped to the
 * fields a User row carries (no plan/currency/locale). Shows email as title,
 * full name + clerkId + status as subtitle chips, and a Copy ID button (no
 * server action wired yet — clipboard-only client behavior will land with
 * Faz C.2 mutations).
 */
export async function SaUserTopbar({
  userId,
  email,
  fullName,
  clerkId,
  status,
  createdAt,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  clerkId: string;
  status: 'active' | 'deleted';
  createdAt: Date;
}) {
  const t = await getTranslations('v2_super_admin.users.detail');
  const statusLabel = status === 'deleted' ? t('status.deleted') : t('status.active');
  return (
    <SaTopbar
      breadcrumb={t('breadcrumb', { email })}
      title={fullName ?? email}
      subtitle={`${userId} · ${clerkId} · ${t('joinedShort', { date: formatDate(createdAt) })} · ${statusLabel}`}
      actions={
        <button type="button" className="btn btn-secondary btn-sm">
          <Copy size={14} strokeWidth={1.75} />
          {t('actions.copyId')}
        </button>
      }
    />
  );
}
