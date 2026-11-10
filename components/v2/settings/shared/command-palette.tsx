'use client';

import { Link } from '@/platform/i18n/navigation';
import {
  CornerDownLeft,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';

type Item = {
  id: string;
  labelKey: string;
  groupKey: 'groupGo' | 'groupCreate' | 'groupManage';
  href: string;
  icon: React.ReactNode;
  kbd?: string;
};

const ITEMS: Item[] = [
  {
    id: 'dash',
    labelKey: 'itemDashboard',
    groupKey: 'groupGo',
    href: '/dashboard',
    icon: <LayoutDashboard size={14} strokeWidth={1.75} />,
    kbd: 'G D',
  },
  {
    id: 'inv',
    labelKey: 'itemSalesInvoices',
    groupKey: 'groupGo',
    href: '/documents/sales-invoice',
    icon: <FileText size={14} strokeWidth={1.75} />,
    kbd: 'G S',
  },
  {
    id: 'prod',
    labelKey: 'itemProducts',
    groupKey: 'groupGo',
    href: '/catalogs/products',
    icon: <Package size={14} strokeWidth={1.75} />,
    kbd: 'G P',
  },
  {
    id: 'partners',
    labelKey: 'itemPartners',
    groupKey: 'groupGo',
    href: '/catalogs/partners',
    icon: <Users size={14} strokeWidth={1.75} />,
    kbd: 'G C',
  },
  {
    id: 'new-inv',
    labelKey: 'itemNewSalesInvoice',
    groupKey: 'groupCreate',
    href: '/documents/sales-invoice/new',
    icon: <Plus size={14} strokeWidth={1.75} />,
    kbd: 'N I',
  },
  {
    id: 'new-prod',
    labelKey: 'itemNewProduct',
    groupKey: 'groupCreate',
    href: '/catalogs/products',
    icon: <Plus size={14} strokeWidth={1.75} />,
    kbd: 'N P',
  },
  {
    id: 'set',
    labelKey: 'itemSettings',
    groupKey: 'groupManage',
    href: '/settings',
    icon: <Settings size={14} strokeWidth={1.75} />,
    kbd: 'G ,',
  },
];

export function V2CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('v2_common.commandPalette');
  const [q, setQ] = useState('');
  const filtered = ITEMS.filter((i) => t(i.labelKey).toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;

  return (
    <div
      className="v2-scrim"
      onClick={onClose}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') onClose();
      }}
      aria-modal
    >
      <div
        className="v2-modal-card"
        style={{ padding: 0, width: 560 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="palette-input">
          <span style={{ color: 'var(--text-muted)' }}>⌘</span>
          <input placeholder={t('placeholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="kbd">ESC</span>
        </div>
        <div className="palette-list">
          {filtered.length === 0 ? (
            <div className="palette-empty">{t('empty')}</div>
          ) : (
            Array.from(new Set(filtered.map((i) => i.groupKey))).map((g) => (
              <div key={g}>
                <div className="palette-section">{t(g)}</div>
                {filtered
                  .filter((i) => i.groupKey === g)
                  .map((i, idx) => (
                    <Link
                      key={i.id}
                      href={i.href}
                      className={`palette-item${idx === 0 && g === filtered[0]?.groupKey ? ' is-active' : ''}`}
                      onClick={onClose}
                    >
                      {i.icon}
                      <span>{t(i.labelKey)}</span>
                      {i.kbd ? <span className="kbd">{i.kbd}</span> : null}
                    </Link>
                  ))}
              </div>
            ))
          )}
        </div>
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--divider)',
            display: 'flex',
            gap: 12,
            fontSize: 11,
            color: 'var(--text-muted)',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <CornerDownLeft size={11} strokeWidth={1.75} /> {t('open')}
          </span>
          <span>↑↓ {t('navigate')}</span>
          <span style={{ marginLeft: 'auto' }}>{t('results', { count: filtered.length })}</span>
        </div>
      </div>
    </div>
  );
}
