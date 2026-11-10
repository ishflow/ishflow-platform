import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defineSuperAdminCatalog,
  defineSuperAdminCatalogDetail,
  defineSuperAdminCatalogTab,
} from './define';
import { _resetRegistry, getRegistry } from './registry';
import type { LocalizedLabel, SuperAdminCatalogTabRender } from './types';

const NOOP_RENDER: SuperAdminCatalogTabRender = async () => null;

describe('defineSuperAdminCatalog', () => {
  beforeEach(() => {
    _resetRegistry();
  });

  it('registers a cross-tenant catalog with crossTenant=true', () => {
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'tenant',
      label: { en: 'Tenant' } as LocalizedLabel,
      pluralLabel: { en: 'Tenants' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.tenant:read',
      fields: {
        name: { type: 'string', label: { en: 'Name' } as LocalizedLabel },
      },
      loader: async () => ({ rows: [], total: 0 }),
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.tenant'];
    expect(cfg).toBeDefined();
    expect(cfg?.crossTenant).toBe(true);
    expect(cfg?.requiredPermission).toBe('super_admin.tenant:read');
  });

  it('rejects when requiredPermission is missing', () => {
    expect(() =>
      defineSuperAdminCatalog({
        module: 'super_admin',
        name: 'leak',
        label: { en: 'Leak' } as LocalizedLabel,
        pluralLabel: { en: 'Leaks' } as LocalizedLabel,
        displayField: 'name',
        // @ts-expect-error — intentionally missing
        requiredPermission: undefined,
        fields: {},
        loader: async () => ({ rows: [], total: 0 }),
      }),
    ).toThrow(/requiredPermission/);
  });

  it('accepts a loader function and exposes it on the registered config', async () => {
    const loaderSpy = vi.fn(async () => ({ rows: [], total: 0 }));
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'loaderdemo',
      label: { en: 'Demo' } as LocalizedLabel,
      pluralLabel: { en: 'Demos' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.loaderdemo:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      loader: loaderSpy,
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.loaderdemo'];
    expect(cfg?.loader).toBe(loaderSpy);
  });

  it('rejects when neither loader nor source is provided', () => {
    expect(() =>
      defineSuperAdminCatalog({
        module: 'super_admin',
        name: 'noloader',
        label: { en: 'NoLoader' } as LocalizedLabel,
        pluralLabel: { en: 'NoLoaders' } as LocalizedLabel,
        displayField: 'name',
        requiredPermission: 'super_admin.noloader:read',
        fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      }),
    ).toThrow(/loader or source/);
  });

  it('accepts a detail block and exposes it on the registered config', () => {
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'withdetail',
      label: { en: 'WithDetail' } as LocalizedLabel,
      pluralLabel: { en: 'WithDetails' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.withdetail:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      loader: async () => ({ rows: [], total: 0 }),
      detail: defineSuperAdminCatalogDetail({
        tabs: [
          defineSuperAdminCatalogTab({
            key: 'overview',
            segment: '',
            icon: 'LayoutDashboard',
            render: NOOP_RENDER,
          }),
          defineSuperAdminCatalogTab({
            key: 'activity',
            segment: 'activity',
            icon: 'Activity',
            render: NOOP_RENDER,
          }),
        ],
      }),
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.withdetail'];
    expect(cfg?.detail?.tabs).toHaveLength(2);
    expect(cfg?.detail?.tabs[0]?.key).toBe('overview');
    expect(cfg?.detail?.tabs[0]?.segment).toBe('');
    expect(cfg?.detail?.tabs[1]?.icon).toBe('Activity');
  });

  it('accepts source-only (no loader) and derives an auto-loader', async () => {
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'autoloader_demo',
      label: { en: 'AutoDemo' } as LocalizedLabel,
      pluralLabel: { en: 'AutoDemos' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.autoloader_demo:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      source: {
        source: 'fakeModel',
        searchFields: ['name'],
        chipFilters: { active: { deletedAt: null } },
        map: (r) => ({ id: r.id as string, name: r.name }),
      },
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.autoloader_demo'];
    expect(cfg?.loader).toBeDefined();
    const mockTx = {
      fakeModel: {
        findMany: vi.fn(async () => [
          { id: 'a', name: 'Alpha' },
          { id: 'b', name: 'Beta' },
        ]),
        count: vi.fn(async () => 2),
      },
    };
    const result = await cfg?.loader({ tx: mockTx, page: 1, pageSize: 25 });
    expect(result?.total).toBe(2);
    expect(result?.rows).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]);
  });

  it('auto-loader applies search OR-clauses across searchFields + searchExactFields', async () => {
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'searchdemo',
      label: { en: 'SearchDemo' } as LocalizedLabel,
      pluralLabel: { en: 'SearchDemos' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.searchdemo:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      source: {
        source: 'thing',
        searchFields: ['name', 'description'],
        searchExactFields: ['code'],
        map: (r) => ({ id: r.id as string }),
      },
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.searchdemo'];
    const findMany = vi.fn(async (_args: unknown) => [] as Array<Record<string, unknown>>);
    const count = vi.fn(async (_args: unknown) => 0);
    const mockTx = { thing: { findMany, count } };
    await cfg?.loader({ tx: mockTx, search: 'hello', page: 1, pageSize: 25 });
    const passedArgs = findMany.mock.calls[0]?.[0] as unknown as {
      where: Record<string, unknown>;
    };
    expect(passedArgs.where.OR).toEqual([
      { name: { contains: 'hello', mode: 'insensitive' } },
      { description: { contains: 'hello', mode: 'insensitive' } },
      { code: 'hello' },
    ]);
  });

  it('auto-loader merges chipFilters into where for matching chips', async () => {
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'chipdemo',
      label: { en: 'ChipDemo' } as LocalizedLabel,
      pluralLabel: { en: 'ChipDemos' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.chipdemo:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      source: {
        source: 'thing',
        chipFilters: {
          active: { deletedAt: null },
          archived: { deletedAt: { not: null } },
        },
        map: (r) => ({ id: r.id as string }),
      },
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.chipdemo'];
    const findMany = vi.fn(async (_args: unknown) => [] as Array<Record<string, unknown>>);
    const count = vi.fn(async (_args: unknown) => 0);
    const mockTx = { thing: { findMany, count } };
    await cfg?.loader({ tx: mockTx, chip: 'archived', page: 1, pageSize: 25 });
    const passedArgs = findMany.mock.calls[0]?.[0] as unknown as {
      where: Record<string, unknown>;
    };
    expect(passedArgs.where.deletedAt).toEqual({ not: null });
  });

  it('auto-loader passes raw rows + tx to postFetch when provided', async () => {
    const postFetch = vi.fn(async () => [{ id: 'aug-1', extra: 'augmented' }]);
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'postfetch_demo',
      label: { en: 'PostFetchDemo' } as LocalizedLabel,
      pluralLabel: { en: 'PostFetchDemos' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.postfetch_demo:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      source: {
        source: 'rawmodel',
        postFetch,
      },
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.postfetch_demo'];
    const findMany = vi.fn(async () => [{ id: 'raw-1', name: 'Raw' }]);
    const count = vi.fn(async () => 1);
    const mockTx = { rawmodel: { findMany, count } };
    const result = await cfg?.loader({ tx: mockTx, page: 1, pageSize: 25 });
    expect(postFetch).toHaveBeenCalledOnce();
    expect(result?.rows).toEqual([{ id: 'aug-1', extra: 'augmented' }]);
  });

  it('works without a detail block (backward compatible)', () => {
    defineSuperAdminCatalog({
      module: 'super_admin',
      name: 'nodetail',
      label: { en: 'NoDetail' } as LocalizedLabel,
      pluralLabel: { en: 'NoDetails' } as LocalizedLabel,
      displayField: 'name',
      requiredPermission: 'super_admin.nodetail:read',
      fields: { name: { type: 'string', label: { en: 'Name' } as LocalizedLabel } },
      loader: async () => ({ rows: [], total: 0 }),
    });
    const cfg = getRegistry().superAdminCatalog['super_admin.nodetail'];
    expect(cfg?.detail).toBeUndefined();
  });
});

describe('defineSuperAdminCatalogTab', () => {
  it('returns the same input on a valid tab', () => {
    const tab = defineSuperAdminCatalogTab({
      key: 'overview',
      segment: '',
      icon: 'LayoutDashboard',
      render: NOOP_RENDER,
    });
    expect(tab.key).toBe('overview');
    expect(tab.segment).toBe('');
  });

  it('rejects invalid key (non snake_case)', () => {
    expect(() =>
      defineSuperAdminCatalogTab({
        key: 'Bad-Key',
        segment: 'bad',
        icon: 'X',
        render: NOOP_RENDER,
      }),
    ).toThrow(/snake_case/);
  });

  it('rejects invalid segment with a slash', () => {
    expect(() =>
      defineSuperAdminCatalogTab({
        key: 'badseg',
        segment: 'has/slash',
        icon: 'X',
        render: NOOP_RENDER,
      }),
    ).toThrow(/segment/);
  });

  it('accepts empty-string segment for the root tab', () => {
    const tab = defineSuperAdminCatalogTab({
      key: 'root',
      segment: '',
      icon: 'X',
      render: NOOP_RENDER,
    });
    expect(tab.segment).toBe('');
  });

  it('rejects empty icon string', () => {
    expect(() =>
      defineSuperAdminCatalogTab({
        key: 'noicon',
        segment: 'noicon',
        icon: '',
        render: NOOP_RENDER,
      }),
    ).toThrow(/icon/);
  });

  it('rejects when render is not a function', () => {
    expect(() =>
      defineSuperAdminCatalogTab({
        key: 'norender',
        segment: 'norender',
        icon: 'X',
        // @ts-expect-error — intentionally wrong type
        render: 'not a function',
      }),
    ).toThrow(/render/);
  });
});

describe('defineSuperAdminCatalogDetail', () => {
  it('rejects empty tabs array', () => {
    expect(() => defineSuperAdminCatalogDetail({ tabs: [] })).toThrow(/non-empty/);
  });

  it('rejects duplicate tab keys', () => {
    expect(() =>
      defineSuperAdminCatalogDetail({
        tabs: [
          defineSuperAdminCatalogTab({
            key: 'dup',
            segment: 'a',
            icon: 'X',
            render: NOOP_RENDER,
          }),
          defineSuperAdminCatalogTab({
            key: 'dup',
            segment: 'b',
            icon: 'X',
            render: NOOP_RENDER,
          }),
        ],
      }),
    ).toThrow(/duplicate tab key/);
  });

  it('rejects duplicate tab segments', () => {
    expect(() =>
      defineSuperAdminCatalogDetail({
        tabs: [
          defineSuperAdminCatalogTab({
            key: 'a',
            segment: 'same',
            icon: 'X',
            render: NOOP_RENDER,
          }),
          defineSuperAdminCatalogTab({
            key: 'b',
            segment: 'same',
            icon: 'X',
            render: NOOP_RENDER,
          }),
        ],
      }),
    ).toThrow(/duplicate tab segment/);
  });
});
