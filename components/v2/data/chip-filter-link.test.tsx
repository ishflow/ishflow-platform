// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V2ChipFilterLink } from './chip-filter-link';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('chip=overdue&period=2026-05'),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    className,
    children,
  }: {
    href: string;
    className: string;
    children: React.ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('V2ChipFilterLink', () => {
  it('renders one anchor per option', () => {
    render(
      <V2ChipFilterLink
        options={[
          { key: 'all', label: 'All', count: 10 },
          { key: 'overdue', label: 'Overdue', count: 2 },
          { key: 'week', label: 'This Week' },
        ]}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('marks the chip matching ?chip= as active', () => {
    render(
      <V2ChipFilterLink
        options={[
          { key: 'all', label: 'All' },
          { key: 'overdue', label: 'Overdue' },
        ]}
      />,
    );
    const overdue = screen.getByText('Overdue').closest('a');
    expect(overdue?.className).toContain('is-active');
  });

  it('preserves other query params when rewriting chip', () => {
    render(<V2ChipFilterLink options={[{ key: 'week', label: 'Week' }]} />);
    const link = screen.getByText('Week').closest('a');
    expect(link?.getAttribute('href')).toBe('?chip=week&period=2026-05');
  });
});
