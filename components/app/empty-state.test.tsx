// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Database } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title, description, and icon', () => {
    render(
      <EmptyState
        icon={Database}
        title="No records yet."
        description="Get started by creating your first record."
      />,
    );
    expect(screen.getByText('No records yet.')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first record.')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <EmptyState
        icon={Database}
        title="No records yet."
        action={<button type="button">Create</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
