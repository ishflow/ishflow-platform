import { jsonLdSafe } from '@/lib/json-ld';

export function BreadcrumbJsonLd({ items }: { items: { name: string; href: string }[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ishflow.com';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${baseUrl}${it.href}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
      dangerouslySetInnerHTML={{ __html: jsonLdSafe(data) }}
    />
  );
}
