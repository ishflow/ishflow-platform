// @vitest-environment jsdom
import { TabsProvider } from '@/components/app/tabs/tabs-context';
import { installLocalStoragePolyfill } from '@/components/app/tabs/test-utils';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="tr" messages={{}}>
    <TabsProvider scope={{ userId: 'u1', tenantId: 't1' }}>{children}</TabsProvider>
  </NextIntlClientProvider>
);

beforeAll(() => installLocalStoragePolyfill());
beforeEach(() => localStorage.clear());

describe('DataTable column width hints', () => {
  it('applies minWidth and maxWidth utilities to both header and body cells', () => {
    const rows = [{ id: 'r1', counterparty: 'Hansen, Lueilwitz-Schmeler and Balistreri', qty: 5 }];
    const columns = [
      {
        accessorKey: 'counterparty',
        header: 'Counterparty',
        minWidth: 'min-w-[180px]',
        maxWidth: 'max-w-[260px]',
      },
      { accessorKey: 'qty', header: 'Qty', className: 'w-24 text-right' },
    ];
    const { container } = render(<DataTable columns={columns} rows={rows} emptyMessage="empty" />, {
      wrapper,
    });
    const headerCell = container.querySelector('[data-col="counterparty"]');
    const bodyCell = container.querySelector('tbody [data-col="counterparty"]');
    expect(headerCell?.className).toContain('min-w-[180px]');
    expect(headerCell?.className).toContain('max-w-[260px]');
    expect(bodyCell?.className).toContain('min-w-[180px]');
    expect(bodyCell?.className).toContain('max-w-[260px]');
  });

  it('uses table-auto layout and wrap-friendly cell classes', () => {
    const rows = [{ id: 'r1', name: 'Test' }];
    const columns = [{ accessorKey: 'name', header: 'Name' }];
    const { container } = render(<DataTable columns={columns} rows={rows} emptyMessage="empty" />, {
      wrapper,
    });
    const table = container.querySelector('table');
    expect(table?.className).toContain('table-auto');
    expect(table?.className).not.toContain('table-fixed');
    const cell = container.querySelector('tbody td');
    expect(cell?.className).toContain('whitespace-normal');
    expect(cell?.className).toContain('break-words');
    expect(cell?.className).toContain('align-top');
  });
});
