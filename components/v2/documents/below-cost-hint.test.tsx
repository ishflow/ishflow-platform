// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.amount) return `${key}:${params.amount}`;
    return key;
  },
  useLocale: () => 'en',
}));

const resolveLineCostMock = vi.fn();
vi.mock('@/app/[locale]/(app)/documents/[entity]/_actions/resolve-line-cost', () => ({
  resolveLineCost: (input: unknown) => resolveLineCostMock(input),
}));

import { BelowCostHint } from './below-cost-hint';

describe('BelowCostHint', () => {
  it('renders nothing when productId is missing', () => {
    const { container } = render(<BelowCostHint productId={null} warehouseId={null} price="5" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when cost is zero (no data yet)', async () => {
    resolveLineCostMock.mockResolvedValueOnce({ cost: 0, quantity: 0 });
    const { container } = render(<BelowCostHint productId="p1" warehouseId="w1" price="5" />);
    await waitFor(() => expect(resolveLineCostMock).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="below-cost-badge"]')).toBeNull();
  });

  it('shows badge when price < cost', async () => {
    resolveLineCostMock.mockResolvedValueOnce({ cost: 100, quantity: 5 });
    render(<BelowCostHint productId="p1" warehouseId="w1" price="50" />);
    await waitFor(() => expect(screen.getByTestId('below-cost-badge')).toBeInTheDocument());
  });

  it('hides badge when price >= cost', async () => {
    resolveLineCostMock.mockResolvedValueOnce({ cost: 50, quantity: 5 });
    const { container } = render(<BelowCostHint productId="p1" warehouseId="w1" price="50" />);
    await waitFor(() => expect(resolveLineCostMock).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="below-cost-badge"]')).toBeNull();
  });

  it('handles resolveLineCost returning null without throwing', async () => {
    resolveLineCostMock.mockResolvedValueOnce(null);
    const { container } = render(<BelowCostHint productId="p1" warehouseId="w1" price="50" />);
    await waitFor(() => expect(resolveLineCostMock).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="below-cost-badge"]')).toBeNull();
  });
});
