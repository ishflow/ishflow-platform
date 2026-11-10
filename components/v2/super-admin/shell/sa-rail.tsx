'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import { useTranslations } from 'next-intl';
import { SA_RAIL, activeSaRailFromPath } from './sa-nav';

/**
 * Super-admin left rail — operator-only icon column.
 *
 * Mirrors the V2 tenant rail (`components/v2/shell/rail.tsx`) but with the
 * sa-* mockup brand stack: brand "i" + red "Operatör" badge to signal
 * cross-tenant operator scope. Active state derived from `usePathname()` so it
 * survives Next.js SSR caching.
 */
export function SaRail({ pendingUpgrades = 0 }: { pendingUpgrades?: number }) {
  const pathname = usePathname();
  const activeRail = activeSaRailFromPath(pathname);
  const t = useTranslations('v2_super_admin');

  // Notification count badge on the rail chip that owns plan-change requests.
  // Inline-styled (rail CSS is stream-A territory; matches the op-badge red).
  const railBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '2px',
    right: '6px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    borderRadius: '999px',
    background: '#dc2626',
    color: 'white',
    fontSize: '10px',
    fontWeight: 700,
    lineHeight: '16px',
    textAlign: 'center',
  };

  // Inline styles for `.rail-brand-stack` + `.op-badge`: these classes ship
  // inline in the sa-dashboard mockup, NOT in v2-globals.css (stream-A
  // territory — untouchable). Inlining here keeps the visual without
  // splitting CSS ownership.
  const brandStackStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '14px',
  };
  const opBadgeStyle: React.CSSProperties = {
    fontSize: '8.5px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    color: 'white',
    background: '#dc2626',
    padding: '2px 5px',
    borderRadius: '3px',
    lineHeight: 1,
    textTransform: 'uppercase',
  };

  return (
    <aside className="rail">
      <div style={brandStackStyle}>
        <div className="rail-brand" style={{ marginBottom: 0 }}>
          i
        </div>
        <span style={opBadgeStyle}>{t('shell.operatorBadge')}</span>
      </div>
      {SA_RAIL.map((rail) => {
        const Icon = rail.icon;
        const isActive = rail.key === activeRail;
        const showBadge = rail.key === 'support' && pendingUpgrades > 0;
        return (
          <Link
            key={rail.key}
            href={rail.href}
            className={`rail-chip${isActive ? ' is-active' : ''}`}
            style={showBadge ? { position: 'relative' } : undefined}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="tip">{t(rail.i18nKey)}</span>
            {showBadge ? (
              <span
                style={railBadgeStyle}
                aria-label={t('upgrades.pendingCount', { count: pendingUpgrades })}
              >
                {pendingUpgrades}
              </span>
            ) : null}
          </Link>
        );
      })}
      <div className="rail-spacer" />
    </aside>
  );
}
