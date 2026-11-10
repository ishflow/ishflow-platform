import { Link } from '@/platform/i18n/navigation';
import { Bell } from 'lucide-react';
import { type ReactNode, Suspense } from 'react';
import { V2AvatarPill } from './avatar-pill';
import { V2ThemeToggle } from './theme-toggle';
import { V2LanguageSwitcher } from './v2-language-switcher';

export function V2Topbar({
  breadcrumb,
  title,
  subtitle,
  actions,
}: {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  /** Page-specific actions (period picker, export button, etc.). Rendered
   *  before the always-present theme toggle / language / notifications /
   *  avatar cluster. */
  actions?: ReactNode;
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
        <V2LanguageSwitcher />
        <Link href="/settings/notifications" className="icon-btn" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.75} />
        </Link>
        <Suspense fallback={<div className="avatar-pill">··</div>}>
          <V2AvatarPill />
        </Suspense>
      </div>
    </div>
  );
}
