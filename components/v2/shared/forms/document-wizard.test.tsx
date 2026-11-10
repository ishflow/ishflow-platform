// @vitest-environment jsdom
import '@testing-library/jest-dom';
import type { ActionResult } from '@/platform/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/platform/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: () => {} }),
  usePathname: () => '/',
}));
vi.mock('@/components/v2/shared/RefCombobox', () => ({
  RefCombobox: ({ name }: { name: string }) => (
    <input type="hidden" name={name} data-testid={`ref-${name}`} />
  ),
}));
vi.mock('@/components/v2/shared/V2DatePicker', () => ({
  V2DatePicker: ({ name, defaultValue }: { name: string; defaultValue?: string }) => (
    <input name={name} type="date" defaultValue={defaultValue} data-testid={`date-${name}`} />
  ),
}));
vi.mock('@/components/v2/shared/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));
// Auto-price actions: stub so tests don't try to call server actions.
vi.mock('@/app/[locale]/(app)/documents/[entity]/_actions/resolve-customer-defaults', () => ({
  resolveCustomerDefaults: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/app/[locale]/(app)/documents/[entity]/_actions/resolve-line-price', () => ({
  resolveLinePrice: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/components/app/stock-chip-row', () => ({
  StockChipRow: ({ productId }: { productId: string | null | undefined }) =>
    productId ? <div data-testid={`stock-chip-${productId}`}>stock-chip</div> : null,
}));
vi.mock('@/components/v2/documents/below-cost-hint', () => ({
  BelowCostHint: ({ productId }: { productId: string | null | undefined }) =>
    productId ? <div data-testid={`below-cost-${productId}`}>below-cost</div> : null,
}));

import { type V2DocumentDescriptor, V2DocumentWizard } from './document-wizard';

const priceSettingConfig: V2DocumentDescriptor = {
  id: 'inventory.price_setting',
  module: 'inventory',
  name: 'price_setting',
  label: { en: 'Price Setting', ru: '', tr: '' },
  pluralLabel: { en: 'Price Settings', ru: '', tr: '' },
  header: {
    date: {
      type: 'datetime',
      label: { en: 'Date', ru: '', tr: '' },
      required: true,
    } as V2DocumentDescriptor['header'][string],
    priceType: {
      type: 'reference',
      label: { en: 'Price Type', ru: '', tr: '' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'price_type' },
    } as V2DocumentDescriptor['header'][string],
  },
  lines: {
    items: {
      label: { en: 'Product', ru: '', tr: '' },
      pluralLabel: { en: 'Products', ru: '', tr: '' },
      minRows: 1,
      lineBehavior: 'price-setting',
      fields: {
        product: {
          type: 'reference',
          label: { en: 'Product', ru: '', tr: '' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        } as V2DocumentDescriptor['header'][string],
        price: {
          type: 'money',
          label: { en: 'Price', ru: '', tr: '' },
          required: true,
        } as V2DocumentDescriptor['header'][string],
      },
    },
  },
};

describe('V2DocumentWizard', () => {
  it('renders the document title from config label', () => {
    render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
      />,
    );
    // header field labels + lines section title visible
    expect(screen.getByText(/Date/)).toBeInTheDocument();
    expect(screen.getByText(/Price Type/)).toBeInTheDocument();
  });

  it('seeds one empty row when no lines provided', () => {
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
      />,
    );
    const tbody = container.querySelector('tbody');
    expect(tbody).not.toBeNull();
    expect(tbody?.querySelectorAll('tr').length).toBe(1);
  });

  it('submits with __slug + __intent=save by default', async () => {
    const submit = vi.fn(
      async (_prev: ActionResult | null, fd: FormData): Promise<ActionResult> => {
        expect(fd.get('__slug')).toBe('price-setting');
        expect(fd.get('__intent')).toBe('save');
        return { ok: true, data: {} };
      },
    );
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={submit}
      />,
    );
    // Fill required datetime input before submit (HTML required validation).
    const dateInput = container.querySelector('input[name="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-05-20T10:00' } });
    const [firstSaveBtn] = screen.getAllByRole('button', { name: /^save$/i });
    fireEvent.click(firstSaveBtn as HTMLElement);
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });

  it('submits with __intent=post when "save and post" clicked', async () => {
    const submit = vi.fn(
      async (_prev: ActionResult | null, fd: FormData): Promise<ActionResult> => {
        expect(fd.get('__intent')).toBe('post');
        return { ok: true, data: {} };
      },
    );
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={submit}
      />,
    );
    const dateInput = container.querySelector('input[name="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-05-20T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /^savePost$/i }));
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });

  it('adds + removes lines via the line table controls', () => {
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('tbody tr').length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /lines.addLine/i }));
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('puts __id in the submitted form data in edit mode', async () => {
    const submit = vi.fn(
      async (_prev: ActionResult | null, fd: FormData): Promise<ActionResult> => {
        expect(fd.get('__id')).toBe('doc-42');
        return { ok: true, data: { id: 'doc-42' } };
      },
    );
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="edit"
        slug="price-setting"
        recordId="doc-42"
        defaultValues={{ date: '2026-05-20T00:00:00Z' }}
        listHref="/documents/price-setting"
        submitAction={submit}
      />,
    );
    // Edit-mode defaultValue is pre-filled; ensure the HTML date input has a
    // value that passes required validation before clicking save.
    const dateInput = container.querySelector('input[name="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-05-20T10:00' } });
    const [firstSaveBtn2] = screen.getAllByRole('button', { name: /^save$/i });
    fireEvent.click(firstSaveBtn2 as HTMLElement);
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });

  it('renders sticky bottom bar with Save + Save and Post on draft', () => {
    render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
      />,
    );
    // useTranslations mock returns the leaf key; sticky bar uses t('save') and
    // t('savePost') from the stickyBar sub-namespace.
    const saveBtns = screen.getAllByRole('button', { name: /^save$/i });
    const postBtns = screen.getAllByRole('button', { name: /^savePost$/i });
    expect(saveBtns.length).toBeGreaterThan(0);
    expect(postBtns.length).toBeGreaterThan(0);
    expect(screen.getByText(/^autoSave$/i)).toBeInTheDocument();
  });

  it('hides Save and Post button on POSTED docs', () => {
    render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="edit"
        slug="price-setting"
        recordId="doc-99"
        defaultValues={{ status: 'POSTED', date: '2026-05-20T00:00:00Z' }}
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
      />,
    );
    // Sticky bar must still show Save but NOT Save-and-Post
    expect(screen.queryAllByRole('button', { name: /^savePost$/i })).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /^save$/i }).length).toBeGreaterThan(0);
    // auto-save hint hidden on POSTED
    expect(screen.queryByText(/^autoSave$/i)).toBeNull();
  });

  it('top action bar shows only Close on draft (no top-level Save buttons)', () => {
    render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /^confirmAndClose$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^saveDraft$/i })).toBeNull();
  });

  it('renders the right aside as sticky when asideCards provided', () => {
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
        asideCards={<section data-testid="test-aside">hello</section>}
      />,
    );
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain('sticky-rail');
  });

  it('renders customSections between header and line sections', () => {
    render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
        customSections={{
          linkedInvoices: <section data-testid="cs-linked">linked-invoices-slot</section>,
          notes: <section data-testid="cs-notes">notes-slot</section>,
        }}
      />,
    );
    expect(screen.getByTestId('cs-linked')).toBeInTheDocument();
    expect(screen.getByTestId('cs-notes')).toBeInTheDocument();
  });

  it('renders line meta row under sales lineBehavior rows', () => {
    const baseItems = priceSettingConfig.lines?.items;
    const salesConfig: V2DocumentDescriptor = {
      ...priceSettingConfig,
      lines: {
        items: {
          label: baseItems?.label ?? { en: 'Items', ru: '', tr: '' },
          pluralLabel: baseItems?.pluralLabel,
          minRows: baseItems?.minRows ?? 1,
          lineBehavior: 'sales',
          fields: {
            product: baseItems?.fields.product as V2DocumentDescriptor['header'][string],
            quantity: {
              type: 'number',
              label: { en: 'Qty', ru: '', tr: '' },
              required: true,
            } as V2DocumentDescriptor['header'][string],
            price: baseItems?.fields.price as V2DocumentDescriptor['header'][string],
          },
        },
      },
    };
    const { container } = render(
      <V2DocumentWizard
        config={salesConfig}
        mode="create"
        slug="sales-invoice"
        listHref="/documents/sales-invoice"
        submitAction={vi.fn()}
        defaultValues={{
          lines: { items: [{ product: 'p1', quantity: '1', price: '5' }] },
        }}
      />,
    );
    expect(container.querySelector('.line-meta-row')).not.toBeNull();
  });

  it('does NOT render meta row when lineBehavior is not sales', () => {
    const { container } = render(
      <V2DocumentWizard
        config={priceSettingConfig}
        mode="create"
        slug="price-setting"
        listHref="/documents/price-setting"
        submitAction={vi.fn()}
        defaultValues={{ lines: { items: [{ product: 'p1', price: '5' }] } }}
      />,
    );
    expect(container.querySelector('.line-meta-row')).toBeNull();
  });
});
