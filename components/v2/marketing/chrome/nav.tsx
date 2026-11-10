import { V2ThemeToggle } from '@/components/v2/shell/theme-toggle';
import Link from 'next/link';
import { V2MarketingBrand } from './brand-mark';
import { V2LangChip } from './lang-chip';

export type V2MarketingNavLink = {
  href: string;
  label: string;
  active?: boolean;
};

export function V2MarketingNav({
  links,
  signInLabel,
  ctaLabel,
  langLabel,
}: {
  links: V2MarketingNavLink[];
  signInLabel: string;
  ctaLabel: string;
  langLabel: string;
}) {
  return (
    <nav className="public-nav">
      <V2MarketingBrand />
      <div className="public-nav-links">
        {links.map((l) => (
          <Link
            key={l.href}
            className={`public-nav-link${l.active ? ' is-active' : ''}`}
            href={l.href}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="public-nav-actions">
        <V2ThemeToggle />
        <V2LangChip label={langLabel} />
        <Link className="btn btn-ghost btn-sm" href="/sign-in">
          {signInLabel}
        </Link>
        <Link className="btn btn-primary btn-sm" href="/sign-up">
          {ctaLabel}
        </Link>
      </div>
    </nav>
  );
}
