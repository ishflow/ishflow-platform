import Link from 'next/link';

export type V2MarketingFooterLink = {
  href: string;
  label: string;
};

export function V2MarketingFooter({
  copyright,
  links,
}: {
  copyright: string;
  links: V2MarketingFooterLink[];
}) {
  return (
    <footer className="public-footer">
      <div>{copyright}</div>
      <div className="links">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
