'use client';

import { Check, Filter, Plus, Search } from 'lucide-react';
import {
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Globe,
  QrCode,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

type Tab = 'installed' | 'marketplace' | 'recommended';
type Addon = {
  id: string;
  logo: ReactNode;
  /** Key under `v2_addons.<id>.name` for the localized addon name. */
  nameKey: string;
  /** Vendor/author byline. Brand names stay literal. */
  by?: string;
  /** Key under `v2_addons.list.*` for a localized byline (e.g. "Community"). */
  byKey?: string;
  /** Key under `v2_addons.list.items.*` for the localized description. */
  descKey: string;
  version: string;
  installed: boolean;
  recommended?: boolean;
  href: string;
};

const ADDONS: Addon[] = [
  {
    id: '1c',
    logo: <Building2 size={20} strokeWidth={1.75} />,
    nameKey: 'oneC.name',
    by: 'ishflow',
    descKey: 'oneC',
    version: '2.4.1',
    installed: true,
    href: '/addons/1c',
  },
  {
    id: 'bank-import',
    logo: <Banknote size={20} strokeWidth={1.75} />,
    nameKey: 'bankImport.name',
    by: 'ishflow',
    descKey: 'bankImport',
    version: '3.0.2',
    installed: true,
    href: '/addons/bank-import',
  },
  {
    id: 'stripe',
    logo: <CreditCard size={20} strokeWidth={1.75} />,
    nameKey: 'stripe.name',
    by: 'Stripe + ishflow',
    descKey: 'stripe',
    version: '2.1.0',
    installed: true,
    href: '/addons/stripe',
  },
  {
    id: 'ai-ocr',
    logo: <Sparkles size={20} strokeWidth={1.75} />,
    nameKey: 'aiOcr.name',
    by: 'ishflow Labs',
    descKey: 'aiOcr',
    version: '0.9.3',
    installed: true,
    href: '/addons/ai-ocr',
  },
  {
    id: 'egov',
    logo: <Globe size={20} strokeWidth={1.75} />,
    nameKey: 'egov.name',
    by: 'GİB · ishflow',
    descKey: 'egov',
    version: '1.2.0',
    installed: false,
    recommended: true,
    href: '/addons/egov',
  },
  {
    id: 'qr',
    logo: <QrCode size={20} strokeWidth={1.75} />,
    nameKey: 'qr.name',
    by: 'ishflow',
    descKey: 'qr',
    version: '1.5.0',
    installed: false,
    recommended: true,
    href: '/addons/qr',
  },
  {
    id: 'generic',
    logo: <FileText size={20} strokeWidth={1.75} />,
    nameKey: 'generic.name',
    by: 'ishflow',
    descKey: 'generic',
    version: '1.0.4',
    installed: false,
    href: '/addons/generic',
  },
  {
    id: 'custom',
    logo: <Wrench size={20} strokeWidth={1.75} />,
    nameKey: 'custom.name',
    byKey: 'byCommunity',
    descKey: 'custom',
    version: '0.4.2',
    installed: false,
    href: '#',
  },
];

export function V2AddonsList() {
  const t = useTranslations('v2_addons.list');
  const tn = useTranslations('v2_addons');
  const [tab, setTab] = useState<Tab>('installed');
  const [q, setQ] = useState('');

  const items = ADDONS.map((a) => ({ ...a, name: tn(a.nameKey) }));
  const filtered = items.filter((a) => {
    if (tab === 'installed' && !a.installed) return false;
    if (tab === 'marketplace' && a.installed) return false;
    if (tab === 'recommended' && !a.recommended) return false;
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = {
    installed: ADDONS.filter((a) => a.installed).length,
    marketplace: ADDONS.filter((a) => !a.installed).length,
    recommended: ADDONS.filter((a) => a.recommended).length,
  };

  return (
    <>
      <div className="action-bar">
        <div className="left">
          <button
            className={`chip${tab === 'installed' ? ' is-active' : ''}`}
            type="button"
            onClick={() => setTab('installed')}
          >
            {t('tabInstalled')} <span className="count">{counts.installed}</span>
          </button>
          <button
            className={`chip${tab === 'marketplace' ? ' is-active' : ''}`}
            type="button"
            onClick={() => setTab('marketplace')}
          >
            {t('tabMarketplace')} <span className="count">{counts.marketplace}</span>
          </button>
          <button
            className={`chip${tab === 'recommended' ? ' is-active' : ''}`}
            type="button"
            onClick={() => setTab('recommended')}
          >
            {t('tabRecommended')} <span className="count">{counts.recommended}</span>
          </button>
        </div>
        <div className="right">
          <div className="search-input">
            <Search size={14} strokeWidth={1.75} />
            <input
              placeholder={t('searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
            />
          </div>
          <button className="btn btn-secondary btn-sm" type="button">
            <Filter size={14} strokeWidth={1.75} />
            {t('filter')}
          </button>
          <button className="btn btn-primary btn-sm" type="button">
            <Plus size={14} strokeWidth={1.75} />
            {t('install')}
          </button>
        </div>
      </div>

      <div className="addon-grid">
        {filtered.map((a) => (
          <Link key={a.id} href={a.href} className="addon-card">
            <div className="head">
              <div className="logo">{a.logo}</div>
              <div>
                <div className="name">{a.name}</div>
                <div className="by">{a.byKey ? t(a.byKey) : a.by}</div>
              </div>
            </div>
            <div className="desc">{t(`items.${a.descKey}`)}</div>
            <div className="badge-row">
              {a.installed ? (
                <span className="badge-soft installed">
                  <Check size={10} strokeWidth={2.5} /> {t('badgeInstalled')}
                </span>
              ) : a.recommended ? (
                <span
                  className="badge-soft"
                  style={{ background: 'var(--accent-soft)', color: 'var(--text)' }}
                >
                  {t('badgeRecommended')}
                </span>
              ) : (
                <span className="badge-soft">{t('badgeMarketplace')}</span>
              )}
              <span className="dim" style={{ fontSize: 11.5 }}>
                v{a.version}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
