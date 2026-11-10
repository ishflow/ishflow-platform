import { defineSuperAdminCatalog } from '@/platform/metadata';
import { _resetRegistry } from '@/platform/metadata/registry';
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderV2SuperAdminCatalog } from './render-sa-catalog';

vi.mock('@/configs', () => ({}));
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: vi.fn(),
}));
vi.mock('@/platform/auth/platform-admin', () => ({
  isPlatformAdmin: vi.fn(),
}));
vi.mock('@/platform/db/tenant-context', () => ({
  withBypass: vi.fn(async <T,>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({})),
}));
vi.mock('@/components/v2/shell/topbar', () => ({
  V2Topbar: (_p: unknown) => null,
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(async () => 'en'),
  getTranslations: vi.fn(async () => (k: string, vars?: Record<string, unknown>) => {
    if (vars && 'count' in vars) return `${k}:${vars.count}`;
    return k;
  }),
}));

import { requireTenantContext } from '@/platform/auth/current-context';
import { isPlatformAdmin } from '@/platform/auth/platform-admin';

type DemoLoader = NonNullable<NonNullable<Parameters<typeof defineSuperAdminCatalog>[0]>['loader']>;

function registerDemoCatalog(loader?: DemoLoader) {
  defineSuperAdminCatalog({
    module: 'super_admin',
    name: 'demo',
    label: { en: 'Demo' },
    pluralLabel: { en: 'Demos' },
    displayField: 'name',
    requiredPermission: 'super_admin.demo:read',
    fields: { name: { type: 'string', label: { en: 'Name' } } },
    list: {
      layout: 'table',
      searchable: true,
      listOnly: true,
      columns: [{ key: 'name', label: { en: 'Name' } }],
      chips: [{ key: 'all', label: { en: 'All' } }],
    },
    loader: loader ?? (async () => ({ rows: [], total: 0 })),
  });
}

describe('renderV2SuperAdminCatalog', () => {
  beforeEach(() => {
    _resetRegistry();
    vi.clearAllMocks();
  });

  it('renders Not Found when slug is unknown', async () => {
    const ui = await renderV2SuperAdminCatalog({
      slug: 'super_admin.unknown',
      searchParams: {},
    });
    const { container } = render(ui as React.ReactElement);
    expect(container.textContent).toContain('notFound.title');
  });

  it('calls notFound() when user is not authenticated', async () => {
    registerDemoCatalog();
    (requireTenantContext as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no ctx'));
    await expect(
      renderV2SuperAdminCatalog({ slug: 'super_admin.demo', searchParams: {} }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('calls notFound() when user is not a platform admin', async () => {
    registerDemoCatalog();
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { clerkId: 'u_1' },
      membership: { roles: [] },
      permissions: new Set<string>(),
    });
    (isPlatformAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    await expect(
      renderV2SuperAdminCatalog({ slug: 'super_admin.demo', searchParams: {} }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('invokes loader with parsed URL params and renders rows', async () => {
    const loader = vi.fn(async (_args: Parameters<DemoLoader>[0]) => ({
      rows: [{ id: 'r1', name: 'Acme' }],
      total: 1,
    }));
    registerDemoCatalog(loader);
    (requireTenantContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { clerkId: 'u_1' },
      membership: { roles: [{ name: 'owner' }] },
      permissions: new Set<string>(),
    });
    (isPlatformAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const ui = await renderV2SuperAdminCatalog({
      slug: 'super_admin.demo',
      searchParams: { q: 'acme', chip: 'all', page: '2' },
    });
    render(ui as React.ReactElement);

    expect(loader).toHaveBeenCalledTimes(1);
    const firstCallArgs = loader.mock.calls[0]?.[0];
    expect(firstCallArgs).toMatchObject({
      search: 'acme',
      chip: 'all',
      page: 2,
      pageSize: 25,
    });
    expect(screen.getByText('Acme')).toBeTruthy();
  });
});
