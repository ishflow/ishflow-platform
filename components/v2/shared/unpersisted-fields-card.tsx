import { Info } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function UnpersistedFieldsCard({ fields }: { fields: string[] }) {
  const t = await getTranslations('v2_catalogs.shared');
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: 10,
        padding: 12,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface-2, transparent)',
        marginBottom: 12,
        alignItems: 'flex-start',
      }}
    >
      <Info
        size={14}
        strokeWidth={1.75}
        style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }}
      />
      <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--text)' }}>{t('unpersistedTitle')}</strong>
        <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
          {t('unpersistedBody', { fields: fields.join(', ') })}
        </div>
      </div>
    </div>
  );
}
