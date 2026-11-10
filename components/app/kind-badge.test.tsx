// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KindBadge } from './kind-badge';

describe('KindBadge', () => {
  it('shows down arrow for income', () => {
    const { container } = render(<KindBadge kind="income" label="Giriş" />);
    expect(screen.getByText('Giriş')).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows up arrow for expense', () => {
    const { container } = render(<KindBadge kind="expense" label="Çıkış" />);
    expect(screen.getByText('Çıkış')).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders label without arrow for unknown kind', () => {
    const { container } = render(<KindBadge kind="other" label="?" />);
    expect(screen.getByText('?')).toBeDefined();
    expect(container.querySelector('svg')).toBeNull();
  });
});
