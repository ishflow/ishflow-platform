'use client';

import { PanelSearch } from '@/components/v2/shell/panel-search';
import { Link, usePathname } from '@/platform/i18n/navigation';
import { useTranslations } from 'next-intl';
import { SA_PANELS, activeSaRailFromPath } from './sa-nav';

/**
 * Super-admin middle panel — section sub-nav.
 *
 * Same shape as V2Panel but reads from SA_PANELS keyed by SaRailKey. Footer
 * is fixed to the operator console identity (no tenant) — operators don't
 * belong to a specific tenant.
 */
export function SaPanel({ pendingUpgrades = 0 }: { pendingUpgrades?: number }) {
  const pathname = usePathname();
  const activeRail = activeSaRailFromPath(pathname);
  const t = useTranslations('v2_super_admin');
  const sections = SA_PANELS[activeRail] ?? [];

  return (
    <aside className="panel">
      <PanelSearch />
      {sections.map((section) => (
        <div key={section.i18nKey}>
          <div className="panel-title">{t(section.i18nKey)}</div>
          <div className="panel-list">
            {section.items.map((item) => {
              const isActive = pathname.endsWith(item.href);
              const ItemIcon = item.icon;
              const showCount = item.href === '/super-admin/upgrades' && pendingUpgrades > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`panel-item${isActive ? ' is-active' : ''}`}
                >
                  {ItemIcon ? <ItemIcon size={16} strokeWidth={1.75} /> : null}
                  {t(item.i18nKey)}
                  {showCount ? (
                    <span className="pill pill-info" style={{ marginLeft: 'auto' }}>
                      {pendingUpgrades}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div className="panel-footer">
        <div className="avatar">OP</div>
        <div className="who">
          <div className="name">{t('shell.operatorName')}</div>
          <div className="role">{t('shell.operatorRole')}</div>
        </div>
      </div>
    </aside>
  );
}
