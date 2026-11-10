// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { GenericDocumentListTable, type GenericRow } from './generic-document-list';

const labels = {
  colNo: 'No',
  colDate: 'Date',
  colStatus: 'Status',
  colPartner: 'Partner',
  colAmount: 'Amount',
  statusAll: 'All',
  statusPosted: 'Posted',
  statusSaved: 'Draft',
  statusFailed: 'Failed',
  searchPh: 'Search…',
  filterLabel: 'Filter',
  exportLabel: 'Export',
  newLabel: '+ New',
  emptyState: 'No documents yet.',
};

const rows: GenericRow[] = [
  {
    id: 'r1',
    number: 'SO-001',
    date: '2026-05-01T00:00:00Z',
    dateFormatted: '1 May 2026',
    status: 'POSTED',
    partnerName: 'Acme Corp',
    amount: '$100.00',
  },
  {
    id: 'r2',
    number: 'SO-002',
    date: '2026-05-02T00:00:00Z',
    dateFormatted: '2 May 2026',
    status: 'SAVED',
    partnerName: 'Beta LLC',
    amount: '$200.00',
  },
  {
    id: 'r3',
    number: 'SO-003',
    date: '2026-05-03T00:00:00Z',
    dateFormatted: '3 May 2026',
    status: 'FAILED',
    partnerName: 'Acme Holdings',
    amount: '—',
  },
];

const counts = { all: 3, posted: 1, saved: 1, failed: 1 };

describe('GenericDocumentListTable', () => {
  it('renders all rows by default and shows correct chip counts', () => {
    render(
      <GenericDocumentListTable
        slug="sales-order"
        newHref="/documents/sales-order/new"
        rows={rows}
        counts={counts}
        labels={labels}
      />,
    );
    expect(screen.getByText('SO-001')).toBeInTheDocument();
    expect(screen.getByText('SO-002')).toBeInTheDocument();
    expect(screen.getByText('SO-003')).toBeInTheDocument();
    // chip counts render alongside their labels — chip buttons live in the toolbar.
    const allChip = screen.getByRole('button', { name: /^All\s*3$/ });
    expect(allChip).toBeInTheDocument();
  });

  it('filters by status chip', () => {
    render(
      <GenericDocumentListTable
        slug="sales-order"
        newHref="/documents/sales-order/new"
        rows={rows}
        counts={counts}
        labels={labels}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Posted\s*1$/ }));
    expect(screen.getByText('SO-001')).toBeInTheDocument();
    expect(screen.queryByText('SO-002')).not.toBeInTheDocument();
    expect(screen.queryByText('SO-003')).not.toBeInTheDocument();
  });

  it('filters by free-text search across number and partner', () => {
    render(
      <GenericDocumentListTable
        slug="sales-order"
        newHref="/documents/sales-order/new"
        rows={rows}
        counts={counts}
        labels={labels}
      />,
    );
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'acme' } });
    expect(screen.getByText('SO-001')).toBeInTheDocument();
    expect(screen.queryByText('SO-002')).not.toBeInTheDocument();
    expect(screen.getByText('SO-003')).toBeInTheDocument();
  });

  it('shows empty-state when no rows match', () => {
    render(
      <GenericDocumentListTable
        slug="sales-order"
        newHref="/documents/sales-order/new"
        rows={[]}
        counts={{ all: 0, posted: 0, saved: 0, failed: 0 }}
        labels={labels}
      />,
    );
    expect(screen.getByText('No documents yet.')).toBeInTheDocument();
  });
});
