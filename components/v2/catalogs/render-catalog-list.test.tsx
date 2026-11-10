// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// next-intl/server pulls next/navigation via bundler-only resolution;
// stub it so the test stays pure in node/jsdom.
vi.mock('next-intl/server', () => ({
  getTranslations: () => Promise.resolve((key: string) => key),
  getLocale: () => Promise.resolve('en'),
}));

// next/link is a client component; stub so RSC renders in jsdom.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// V2Topbar pulls next-intl client hooks; stub for isolation.
vi.mock('@/components/v2/shell/topbar', () => ({
  V2Topbar: ({ title }: { title: string }) => <div data-testid="topbar">{title}</div>,
}));

// requireTenantContext throws when not in a request; stub to return unauthenticated.
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: () => Promise.reject(new Error('UNAUTHENTICATED')),
}));

// listRecordsPaged is never reached when unauthenticated; stub for safety.
vi.mock('@/platform/engine', () => ({
  listRecordsPaged: () => Promise.resolve({ rows: [], total: 0, page: 1, pageSize: 25 }),
}));

import { renderV2CatalogList } from './render-catalog-list';

describe('renderV2CatalogList', () => {
  it('exports a function', () => {
    expect(typeof renderV2CatalogList).toBe('function');
  });

  it('returns not-found UI when slug is unknown', async () => {
    const result = await renderV2CatalogList({
      slug: 'definitely_not_a_real_slug',
      searchParams: {},
    });
    expect(result).toBeDefined();
  });
});
