import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Security regression test for the audit-log access gate (finding H1).
 *
 * The `/admin/*` subtree layout admits any of four admin permissions
 * (members / audit / period / organization). `chief_accountant` holds
 * `admin.period:manage` but NOT `admin.audit:read` — yet the audit list and
 * detail pages only called `requireTenantContext()`, so a chief_accountant
 * could read the full audit trail (before/after JSON with money + PII),
 * defeating the sealed `admin.audit` namespace.
 *
 * These tests assert the per-page gate fires BEFORE the DB query
 * (`withTenant` is never reached when the permission is absent), so no
 * database is required.
 */

const notFoundError = new Error('NEXT_NOT_FOUND');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw notFoundError;
  },
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock('@/components/v2/admin/audit/list', () => ({ V2AuditList: () => null }));
vi.mock('@/components/v2/admin/audit/detail', () => ({ V2AuditDetail: () => null }));
vi.mock('@/components/v2/shell/topbar', () => ({ V2Topbar: () => null }));

const requireTenantContext = vi.fn();
vi.mock('@/platform/auth/current-context', () => ({
  requireTenantContext: () => requireTenantContext(),
}));

const withTenant = vi.fn();
vi.mock('@/platform/db/tenant-context', () => ({
  withTenant: (_tenantId: string, fn: (tx: unknown) => unknown) => withTenant(fn),
}));

import DetailPage from './[id]/page';
import ListPage from './page';

function ctx(permissions: string[]) {
  return {
    tenant: { id: '00000000-0000-0000-0000-000000000001' },
    permissions: new Set(permissions),
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('audit list page gate', () => {
  it('404s and never queries when admin.audit:read is absent (chief_accountant)', async () => {
    requireTenantContext.mockResolvedValue(ctx(['admin.period:manage']));
    await expect(ListPage({ searchParams: Promise.resolve({}) })).rejects.toBe(notFoundError);
    expect(withTenant).not.toHaveBeenCalled();
  });

  it('proceeds to the query when admin.audit:read is present', async () => {
    requireTenantContext.mockResolvedValue(ctx(['admin.audit:read']));
    withTenant.mockResolvedValue({
      rows: [],
      total: 0,
      allCount: 0,
      docCount: 0,
      userCount: 0,
      systemCount: 0,
      settingCount: 0,
    });
    await ListPage({ searchParams: Promise.resolve({}) });
    expect(withTenant).toHaveBeenCalledTimes(1);
  });
});

describe('audit detail page gate', () => {
  it('404s and never queries when admin.audit:read is absent (chief_accountant)', async () => {
    requireTenantContext.mockResolvedValue(ctx(['admin.period:manage']));
    await expect(DetailPage({ params: Promise.resolve({ id: 'abc' }) })).rejects.toBe(
      notFoundError,
    );
    expect(withTenant).not.toHaveBeenCalled();
  });

  it('proceeds to the query when admin.audit:read is present', async () => {
    requireTenantContext.mockResolvedValue(ctx(['admin.audit:read']));
    withTenant.mockResolvedValue({
      id: 'abc',
      createdAt: new Date('2026-06-09T00:00:00Z'),
      action: 'update',
      entity: 'document_sales_invoice',
      entityId: 'doc-1',
      tenantId: '00000000-0000-0000-0000-000000000001',
      user: { firstName: 'A', lastName: 'B', email: 'a@b.co' },
      before: { x: 1 },
      after: { x: 2 },
    });
    await DetailPage({ params: Promise.resolve({ id: 'abc' }) });
    expect(withTenant).toHaveBeenCalledTimes(1);
  });
});
