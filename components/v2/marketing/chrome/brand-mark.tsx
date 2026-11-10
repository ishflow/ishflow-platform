import Link from 'next/link';

export function V2MarketingBrand({ href = '/' }: { href?: string }) {
  return (
    <Link className="public-nav-brand" href={href}>
      <span className="brand-mark" aria-hidden="true">
        i
      </span>
      ishflow
    </Link>
  );
}
