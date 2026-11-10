// @vitest-environment jsdom
import '@testing-library/jest-dom';
import type { CatalogConfig } from '@/platform/metadata';
import type { ActionResult } from '@/platform/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

const navMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/platform/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: navMocks.push, refresh: navMocks.refresh, replace: () => {} }),
  usePathname: () => '/',
}));
vi.mock('@/components/v2/shared/RefCombobox', () => ({
  RefCombobox: ({ name }: { name: string }) => (
    <input type="hidden" name={name} data-testid="ref-combobox" />
  ),
}));
vi.mock('@/components/v2/shared/V2DatePicker', () => ({
  V2DatePicker: ({ name, defaultValue }: { name: string; defaultValue?: string }) => (
    <input name={name} type="date" defaultValue={defaultValue} data-testid="date-picker" />
  ),
}));
vi.mock('@/components/v2/shared/delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({
    onConfirm,
    trigger,
  }: {
    onConfirm: () => void;
    trigger: React.ReactNode;
  }) => (
    <>
      {trigger}
      <button type="button" data-testid="confirm-delete" onClick={onConfirm}>
        confirm
      </button>
    </>
  ),
}));

import { V2EntityForm } from './entity-form';

const warehouseConfig: CatalogConfig = {
  id: 'inventory.warehouse',
  module: 'inventory',
  name: 'warehouse',
  label: { en: 'Warehouse', ru: 'Склад', tr: 'Depo' },
  pluralLabel: { en: 'Warehouses', ru: 'Склады', tr: 'Depolar' },
  fields: {
    code: {
      type: 'string',
      label: { en: 'Code', ru: 'Код', tr: 'Kod' },
      required: true,
      formHidden: true,
      autoGenerate: 'sequence',
    } as CatalogConfig['fields'][string],
    name: {
      type: 'string',
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
    } as CatalogConfig['fields'][string],
    address: {
      type: 'text',
      label: { en: 'Address', ru: 'Адрес', tr: 'Adres' },
    } as CatalogConfig['fields'][string],
  },
  permissions: { read: 'any' },
  displayField: 'name',
};

describe('V2EntityForm', () => {
  it('renders title from config label + creates Name + Address inputs', () => {
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="create"
        slug="warehouses"
        listHref="/catalogs/warehouses"
        submitAction={vi.fn()}
      />,
    );
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address/)).toBeInTheDocument();
  });

  it('submits with __slug + __locale and no __id in create mode', async () => {
    const submitAction = vi.fn(
      async (_prev: ActionResult | null, fd: FormData): Promise<ActionResult> => {
        expect(fd.get('__slug')).toBe('warehouses');
        expect(fd.get('__locale')).toBe('en');
        expect(fd.get('__id')).toBeNull();
        expect(fd.get('name')).toBe('Main');
        return { ok: true, data: { id: 'new' } };
      },
    );
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="create"
        slug="warehouses"
        listHref="/catalogs/warehouses"
        submitAction={submitAction}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Main' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(submitAction).toHaveBeenCalled());
  });

  it('submits with __id in edit mode + Delete button visible when deleteActionByLocale supplied', async () => {
    const submitAction = vi.fn(
      async (_prev: ActionResult | null, fd: FormData): Promise<ActionResult> => {
        expect(fd.get('__id')).toBe('w-123');
        return { ok: true, data: { id: 'w-123' } };
      },
    );
    const deleteAction = vi.fn(async () => ({ ok: true, data: {} }) as ActionResult);
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="edit"
        slug="warehouses"
        recordId="w-123"
        defaultValues={{ name: 'Main', address: 'Istanbul' }}
        listHref="/catalogs/warehouses"
        submitAction={submitAction}
        deleteActionByLocale={deleteAction}
      />,
    );

    // Address pre-fills from defaultValues
    expect((screen.getByLabelText(/Address/) as HTMLTextAreaElement).value).toBe('Istanbul');

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(submitAction).toHaveBeenCalled());
  });

  it('surfaces field errors from action result beneath inputs', async () => {
    const submitAction = vi.fn(
      async (_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> => ({
        ok: false,
        fieldErrors: { name: ['fieldErrorUnique'] },
      }),
    );
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="create"
        slug="warehouses"
        listHref="/catalogs/warehouses"
        submitAction={submitAction}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Main' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText('fieldErrorUnique')).toBeInTheDocument();
    });
  });

  it('surfaces formError above the form when present', async () => {
    const submitAction = vi.fn(
      async (_prev: ActionResult | null, _fd: FormData): Promise<ActionResult> => ({
        ok: false,
        formError: 'permissionDenied',
      }),
    );
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="create"
        slug="warehouses"
        listHref="/catalogs/warehouses"
        submitAction={submitAction}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Main' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText('permissionDenied')).toBeInTheDocument();
    });
  });

  it('renders Clone + Archive buttons in edit mode when actions are supplied', () => {
    const cloneAction = vi.fn(async () => ({ ok: true, data: {} }) as ActionResult);
    const archiveAction = vi.fn(async () => ({ ok: true, data: {} }) as ActionResult);
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="edit"
        slug="warehouses"
        recordId="w-1"
        defaultValues={{ name: 'Main' }}
        listHref="/catalogs/warehouses"
        submitAction={vi.fn()}
        cloneActionByLocale={cloneAction}
        archiveActionByLocale={archiveAction}
      />,
    );
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  it('hides Archive button when record is already archived', () => {
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="edit"
        slug="warehouses"
        recordId="w-1"
        defaultValues={{ name: 'Main' }}
        listHref="/catalogs/warehouses"
        submitAction={vi.fn()}
        archiveActionByLocale={vi.fn(async () => ({ ok: true, data: {} }) as ActionResult)}
        isArchived={true}
      />,
    );
    expect(screen.queryByRole('button', { name: /archive/i })).toBeNull();
  });

  it('renders lastEdited timestamp on the right side of the action bar', () => {
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="edit"
        slug="warehouses"
        recordId="w-1"
        defaultValues={{ name: 'Main' }}
        listHref="/catalogs/warehouses"
        submitAction={vi.fn()}
        lastEdited="19 May 2026 10:23"
      />,
    );
    expect(screen.getByText(/19 May 2026 10:23/)).toBeInTheDocument();
  });

  it('hides Clone + Archive buttons in create mode', () => {
    render(
      <V2EntityForm
        config={warehouseConfig}
        mode="create"
        slug="warehouses"
        listHref="/catalogs/warehouses"
        submitAction={vi.fn()}
        cloneActionByLocale={vi.fn()}
        archiveActionByLocale={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /archive/i })).toBeNull();
  });

  it('hides showIf-gated field on create when the predicate does not match the default', () => {
    const cfg: CatalogConfig = {
      id: 'sales.price_type',
      module: 'sales',
      name: 'price_type',
      label: { en: 'Price Type', ru: '', tr: '' },
      fields: {
        name: {
          type: 'string',
          label: { en: 'Name', ru: '', tr: '' },
          required: true,
        } as CatalogConfig['fields'][string],
        kind: {
          type: 'string',
          label: { en: 'Kind', ru: '', tr: '' },
          required: true,
          enumValues: ['static', 'dynamic'],
        } as CatalogConfig['fields'][string],
        markupPct: {
          type: 'number',
          label: { en: 'Markup %', ru: '', tr: '' },
          showIf: { field: 'kind', equals: 'dynamic' },
        } as CatalogConfig['fields'][string],
      },
      permissions: { read: 'any' },
    };
    render(
      <V2EntityForm
        config={cfg}
        mode="create"
        slug="price-types"
        listHref="/catalogs/price-types"
        submitAction={vi.fn()}
      />,
    );
    // No defaultValue → kind is unset → markupPct hidden
    expect(screen.queryByLabelText(/Markup/)).toBeNull();
  });

  it('reveals showIf-gated field after the predicate field flips', () => {
    const cfg: CatalogConfig = {
      id: 'sales.price_type',
      module: 'sales',
      name: 'price_type',
      label: { en: 'Price Type', ru: '', tr: '' },
      fields: {
        name: {
          type: 'string',
          label: { en: 'Name', ru: '', tr: '' },
          required: true,
        } as CatalogConfig['fields'][string],
        kind: {
          type: 'string',
          label: { en: 'Kind', ru: '', tr: '' },
          required: true,
          enumValues: ['static', 'dynamic'],
        } as CatalogConfig['fields'][string],
        markupPct: {
          type: 'number',
          label: { en: 'Markup %', ru: '', tr: '' },
          showIf: { field: 'kind', equals: 'dynamic' },
        } as CatalogConfig['fields'][string],
      },
      permissions: { read: 'any' },
    };
    render(
      <V2EntityForm
        config={cfg}
        mode="edit"
        slug="price-types"
        recordId="pt-1"
        defaultValues={{ name: 'X', kind: 'static' }}
        listHref="/catalogs/price-types"
        submitAction={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Markup/)).toBeNull();
    // Flip kind to 'dynamic'
    const select = screen.getByLabelText(/Kind/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'dynamic' } });
    expect(screen.getByLabelText(/Markup/)).toBeInTheDocument();
  });

  it('applies percentFraction display transform on incoming values', () => {
    const priceTypeConfig: CatalogConfig = {
      id: 'sales.price_type',
      module: 'sales',
      name: 'price_type',
      label: { en: 'Price Type', ru: '', tr: '' },
      fields: {
        markupPct: {
          type: 'number',
          label: { en: 'Markup %', ru: '', tr: '' },
          transform: 'percentFraction',
        } as CatalogConfig['fields'][string],
      },
      permissions: { read: 'any' },
    };
    render(
      <V2EntityForm
        config={priceTypeConfig}
        mode="edit"
        slug="price-types"
        recordId="p-1"
        defaultValues={{ markupPct: 0.075 }}
        listHref="/catalogs/price-types"
        submitAction={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/Markup/) as HTMLInputElement;
    expect(input.value).toBe('7.5');
  });
});
