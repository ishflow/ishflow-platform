// @vitest-environment jsdom
import { TabsProvider } from '@/components/app/tabs/tabs-context';
import { installLocalStoragePolyfill } from '@/components/app/tabs/test-utils';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './data-table';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/catalogs/inventory.product',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="tr" messages={{}}>
    <TabsProvider scope={{ userId: 'u1', tenantId: 't1' }}>{children}</TabsProvider>
  </NextIntlClientProvider>
);

beforeAll(() => installLocalStoragePolyfill());
beforeEach(() => localStorage.clear());

describe('DataTable row link', () => {
  it('opens the row href as a tab when tabs context is active', () => {
    const rows = [{ id: 'abc', name: 'Incredible Rubber Shoes' }];
    const columns = [{ accessorKey: 'name', header: 'Ad' }];
    render(
      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage="empty"
        linkBasePath="/en/catalogs/inventory.product"
      />,
      { wrapper },
    );
    const link = screen.getByRole('link', { name: 'Incredible Rubber Shoes' });
    fireEvent.click(link, { button: 0 });
    const stored = window.localStorage.getItem('tabs:u1:t1');
    expect(stored).toContain('Incredible Rubber Shoes');
    expect(stored).toContain('/en/catalogs/inventory.product/abc');
  });
});
