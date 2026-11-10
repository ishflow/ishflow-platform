// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RefCombobox } from './RefCombobox';

vi.mock('./ref-combobox-actions', () => ({
  searchRefOptions: vi.fn(async () => []),
}));

describe('RefCombobox', () => {
  it('renders trigger with placeholder when nothing selected', () => {
    render(<RefCombobox name="customerId" entity="customer" placeholder="Müşteri seç" />);
    expect(screen.getByText('Müşteri seç')).toBeTruthy();
  });

  it('renders the defaultSelected label when provided', () => {
    render(
      <RefCombobox
        name="productId"
        entity="product"
        defaultSelected={{ id: 'p1', label: 'Test Product', sublabel: 'P-001' }}
        placeholder="Ürün"
      />,
    );
    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  it('hidden input carries the selected id (or empty when none)', () => {
    const { container } = render(<RefCombobox name="customerId" entity="customer" />);
    const hidden = container.querySelector(
      'input[type="hidden"][name="customerId"]',
    ) as HTMLInputElement | null;
    expect(hidden).toBeTruthy();
    expect(hidden?.value).toBe('');
  });

  it('closes popover on mousedown outside the combobox', async () => {
    render(
      <div>
        <button type="button" data-testid="outside">
          Outside
        </button>
        <RefCombobox name="customerId" entity="customer" placeholder="Müşteri seç" />
      </div>,
    );

    fireEvent.click(screen.getByText('Müşteri seç'));
    await waitFor(() => expect(screen.queryByPlaceholderText('customer ara…')).toBeTruthy());

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => expect(screen.queryByPlaceholderText('customer ara…')).toBeNull());
  });

  it('closes popover on Escape keypress', async () => {
    render(<RefCombobox name="customerId" entity="customer" placeholder="Müşteri seç" />);

    fireEvent.click(screen.getByText('Müşteri seç'));
    await waitFor(() => expect(screen.queryByPlaceholderText('customer ara…')).toBeTruthy());

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByPlaceholderText('customer ara…')).toBeNull());
  });

  const inlineLabels = {
    cta: 'Yeni kategori oluştur',
    namePlaceholder: 'Ad…',
    save: 'Kaydet',
    cancel: 'İptal',
    errorGeneric: 'Oluşturulamadı.',
    errorDuplicate: 'Bu isimde zaten var.',
  };

  it('renders the "+ Yeni X" CTA option when onCreate is provided', async () => {
    render(
      <RefCombobox
        name="categoryId"
        entity="product-category"
        placeholder="Kategori seç"
        onCreate={async () => ({ ok: true, option: { id: 'x', label: 'X' } })}
        createLabels={inlineLabels}
      />,
    );

    fireEvent.click(screen.getByText('Kategori seç'));
    await waitFor(() => expect(screen.queryByText('Yeni kategori oluştur')).toBeTruthy());
  });

  it('clicking "+ Yeni X" swaps to the inline name input', async () => {
    render(
      <RefCombobox
        name="categoryId"
        entity="product-category"
        placeholder="Kategori seç"
        onCreate={async () => ({ ok: true, option: { id: 'x', label: 'X' } })}
        createLabels={inlineLabels}
      />,
    );

    fireEvent.click(screen.getByText('Kategori seç'));
    await waitFor(() => expect(screen.queryByText('Yeni kategori oluştur')).toBeTruthy());

    fireEvent.click(screen.getByText('Yeni kategori oluştur'));
    await waitFor(() => expect(screen.queryByPlaceholderText('Ad…')).toBeTruthy());
    expect(screen.queryByText('Kaydet')).toBeTruthy();
    expect(screen.queryByText('İptal')).toBeTruthy();
  });

  it('inline create on success populates trigger label and closes popover', async () => {
    const onCreate = vi.fn(async (n: string) => ({
      ok: true as const,
      option: { id: 'new-cat-uuid', label: n },
    }));
    render(
      <RefCombobox
        name="categoryId"
        entity="product-category"
        placeholder="Kategori seç"
        onCreate={onCreate}
        createLabels={inlineLabels}
      />,
    );

    fireEvent.click(screen.getByText('Kategori seç'));
    await waitFor(() => expect(screen.queryByText('Yeni kategori oluştur')).toBeTruthy());
    fireEvent.click(screen.getByText('Yeni kategori oluştur'));
    const input = await screen.findByPlaceholderText('Ad…');
    fireEvent.change(input, { target: { value: 'Yeni Kategori 1' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Yeni Kategori 1'));
    await waitFor(() => expect(screen.queryByText('Yeni Kategori 1')).toBeTruthy());
    await waitFor(() => expect(screen.queryByPlaceholderText('Ad…')).toBeNull());
  });

  it('inline create surfaces duplicate-name error with its specific label', async () => {
    const onCreate = vi.fn(async () => ({
      ok: false as const,
      errorKey: 'duplicate' as const,
    }));
    render(
      <RefCombobox
        name="categoryId"
        entity="product-category"
        placeholder="Kategori seç"
        onCreate={onCreate}
        createLabels={inlineLabels}
      />,
    );

    fireEvent.click(screen.getByText('Kategori seç'));
    fireEvent.click(await screen.findByText('Yeni kategori oluştur'));
    const input = await screen.findByPlaceholderText('Ad…');
    fireEvent.change(input, { target: { value: 'Telefon' } });
    fireEvent.click(screen.getByText('Kaydet'));

    await waitFor(() => expect(screen.queryByText('Bu isimde zaten var.')).toBeTruthy());
    // Popover must NOT close on error.
    expect(screen.queryByPlaceholderText('Ad…')).toBeTruthy();
  });
});
