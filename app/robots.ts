import { getSiteUrl } from '@/platform/marketing/site-url';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/super-admin/',
          '/dashboard',
          '/catalogs/',
          '/documents/',
          '/registers/',
          '/reports/',
          '/settings/',
          '/admin/',
          '/sign-in',
          '/sign-out',
          '/sign-up',
          '/iframe-spike',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
