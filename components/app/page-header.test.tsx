// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders title and description', () => {
    render(<PageHeader title="Customers" description="List of customers" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByText('List of customers')).toBeInTheDocument();
  });

  it('renders breadcrumb items', () => {
    render(
      <PageHeader
        title="Customers"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Catalogs' },
          { label: 'Customers' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getAllByText('Customers')).toHaveLength(2);
  });

  it('renders actions slot', () => {
    render(<PageHeader title="Customers" actions={<button type="button">New</button>} />);
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });
});
