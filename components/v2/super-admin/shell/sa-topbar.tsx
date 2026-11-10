import { V2AvatarPill } from '@/components/v2/shell/avatar-pill';
import { V2ThemeToggle } from '@/components/v2/shell/theme-toggle';
import { Bell } from 'lucide-react';
import { Suspense } from 'react';

/**
 * Super-admin topbar — page-level breadcrumb + title row.
 *
 * Same surface as V2Topbar but lives in the super-admin component dir so
 * pages don't import across stream boundaries when integration phase adds
 * sa-specific actions (impersonate, switch view-as-role, etc.).
 */
export function SaTopbar({
  breadcrumb,
  title,
  subtitle,
  actions,
}: {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        <div className="breadcrumb">{breadcrumb}</div>
        <h1>
          {title}
          {subtitle ? <span className="sub">{subtitle}</span> : null}
        </h1>
      </div>
      <div className="topbar-actions">
        {actions}
        <V2ThemeToggle />
        <button className="icon-btn" aria-label="Notifications" type="button">
          <Bell size={18} strokeWidth={1.75} />
          <span className="dot" />
        </button>
        <Suspense fallback={<div className="avatar-pill">··</div>}>
          <V2AvatarPill />
        </Suspense>
      </div>
    </div>
  );
}
