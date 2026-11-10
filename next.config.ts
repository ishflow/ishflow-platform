import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./platform/i18n/request.ts');

/**
 * Baseline security headers (QA B9). Low-risk set applied to every route.
 * HSTS is already emitted by the Vercel edge.
 *
 * CSP ships as **Report-Only** first (QA B9): it never blocks a resource, so it
 * can't break Clerk/Next inline assets on prod, while making the policy live so
 * violations can be observed before flipping to an enforcing `Content-Security-
 * Policy`. The breakable directives (script/style/connect/frame) stay permissive
 * (`https:` + `unsafe-inline`); the safe ones add real protection now:
 * `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self' https:",
].join('; ');

export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // HSTS in version control (not only the Vercel edge default), so it survives
  // host/CDN changes. 2y + includeSubDomains; `preload` deferred until every
  // subdomain is HTTPS-only. Finding E6.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
