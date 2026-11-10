// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

import { WarehouseStockPanel } from './warehouse-stock-panel';

function Harness({ warehouse }: { warehouse: string }) {
  const form = useForm({ defaultValues: { warehouse } });
  return (
    <FormProvider {...form}>
      <WarehouseStockPanel watchFieldName="warehouse" />
    </FormProvider>
  );
}

describe('WarehouseStockPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows empty copy when no warehouse is selected', () => {
    render(<Harness warehouse="" />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('shows loading then rows after fetch resolves', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { productId: 'p1', productLabel: 'Ürün A', quantity: 5 },
            { productId: 'p2', productLabel: 'Ürün B', quantity: 2 },
          ],
          total: 7,
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness warehouse="11111111-1111-1111-1111-111111111111" />);
    expect(screen.getByText('loading')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Ürün A')).toBeInTheDocument());
    expect(screen.getByText('Ürün B')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/warehouse-stock?warehouse=11111111-1111-1111-1111-111111111111',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('shows noStock copy when server returns an empty items array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness warehouse="22222222-2222-2222-2222-222222222222" />);
    await waitFor(() => expect(screen.getByText('noStock')).toBeInTheDocument());
  });

  it('shows errorFallback copy when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness warehouse="33333333-3333-3333-3333-333333333333" />);
    await waitFor(() => expect(screen.getByText('errorFallback')).toBeInTheDocument());
  });

  it('shows errorFallback when server responds non-ok (e.g. 400)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    render(<Harness warehouse="44444444-4444-4444-4444-444444444444" />);
    await waitFor(() => expect(screen.getByText('errorFallback')).toBeInTheDocument());
  });
});
