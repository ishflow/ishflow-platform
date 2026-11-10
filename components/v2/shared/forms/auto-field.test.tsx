// @vitest-environment jsdom
import '@testing-library/jest-dom';
import type { FieldConfig } from '@/platform/metadata';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// next-intl + platform navigation pull `next/navigation` via bundler-only
// resolution; stub the whole chain for node/jsdom.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/platform/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => '/',
}));
// RefCombobox runs server actions on mount; stub it so the test stays pure.
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

import { V2AutoField } from './auto-field';

function field<T extends FieldConfig['type']>(
  type: T,
  overrides: Partial<FieldConfig> = {},
): FieldConfig {
  return {
    type,
    label: { en: 'Test', ru: 'Тест', tr: 'Test' },
    ...overrides,
  } as FieldConfig;
}

function renderInForm(node: React.ReactNode) {
  return render(<form>{node}</form>);
}

describe('V2AutoField', () => {
  it('renders nothing for hidden fields', () => {
    const { container } = renderInForm(
      <V2AutoField
        name="x"
        field={field('string', { hidden: true })}
        locale="en"
        defaultValue="hi"
      />,
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('label')).toBeNull();
  });

  it('formHidden renders a single hidden input but no label', () => {
    const { container } = renderInForm(
      <V2AutoField
        name="code"
        field={field('string', { formHidden: true })}
        locale="en"
        defaultValue="WH-0001"
      />,
    );
    const hidden = container.querySelector('input[type="hidden"]');
    expect(hidden).toHaveAttribute('name', 'code');
    expect(hidden).toHaveAttribute('value', 'WH-0001');
    expect(container.querySelector('label')).toBeNull();
  });

  it('string → text input with required and maxLength', () => {
    renderInForm(
      <V2AutoField
        name="name"
        field={field('string', { required: true, maxLength: 64 } as Partial<FieldConfig>)}
        locale="en"
      />,
    );
    const input = screen.getByLabelText(/Test/) as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.required).toBe(true);
    expect(input.maxLength).toBe(64);
  });

  it('string with enumValues → <select> with options', () => {
    const { container } = renderInForm(
      <V2AutoField
        name="kind"
        field={field('string', {
          required: true,
          enumValues: ['static', 'dynamic'],
          enumLabels: {
            static: { en: 'Static', ru: '', tr: '' },
            dynamic: { en: 'Dynamic', ru: '', tr: '' },
          },
        } as Partial<FieldConfig>)}
        locale="en"
      />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.name).toBe('kind');
    expect(select.required).toBe(true);
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['static', 'dynamic']);
    expect(Array.from(select.options).map((o) => o.text)).toEqual(['Static', 'Dynamic']);
  });

  it('string with enumValues (optional) → adds empty option when no value', () => {
    const { container } = renderInForm(
      <V2AutoField
        name="kind"
        field={field('string', {
          enumValues: ['low', 'high'],
        } as Partial<FieldConfig>)}
        locale="en"
      />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', 'low', 'high']);
  });

  it('text → textarea', () => {
    renderInForm(
      <V2AutoField name="notes" field={field('text')} locale="en" defaultValue="some notes" />,
    );
    const input = screen.getByLabelText(/Test/) as HTMLTextAreaElement;
    expect(input.tagName).toBe('TEXTAREA');
    expect(input.value).toBe('some notes');
  });

  it('number → numeric input', () => {
    renderInForm(<V2AutoField name="qty" field={field('number')} locale="en" defaultValue={42} />);
    const input = screen.getByLabelText(/Test/) as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.value).toBe('42');
  });

  it('money → numeric input with step=0.01', () => {
    renderInForm(
      <V2AutoField name="price" field={field('money')} locale="en" defaultValue="19.99" />,
    );
    const input = screen.getByLabelText(/Test/) as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.step).toBe('0.01');
  });

  it('boolean → checkbox with paired __bool: marker', () => {
    const { container } = renderInForm(
      <V2AutoField name="active" field={field('boolean')} locale="en" defaultValue={true} />,
    );
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.defaultChecked).toBe(true);
    const marker = container.querySelector(
      'input[type="hidden"][name="__bool:active"]',
    ) as HTMLInputElement;
    expect(marker).not.toBeNull();
    expect(marker.defaultValue).toBe('true');
  });

  it('date → V2DatePicker shim', () => {
    renderInForm(
      <V2AutoField name="d" field={field('date')} locale="en" defaultValue="2026-05-20" />,
    );
    expect(screen.getByTestId('date-picker')).toHaveAttribute('value', '2026-05-20');
  });

  it('reference → RefCombobox shim with the correct name', () => {
    renderInForm(
      <V2AutoField
        name="customerId"
        field={
          {
            type: 'reference',
            label: { en: 'Customer', ru: '', tr: '' },
            to: { kind: 'ref', module: 'sales', name: 'customer' },
          } as FieldConfig
        }
        locale="en"
      />,
    );
    expect(screen.getByTestId('ref-combobox')).toHaveAttribute('name', 'customerId');
  });

  it('field error renders below input', () => {
    renderInForm(
      <V2AutoField
        name="name"
        field={field('string', { required: true })}
        locale="en"
        fieldError="errorFieldRequired"
      />,
    );
    expect(screen.getByText('errorFieldRequired')).toBeInTheDocument();
  });

  it('picks label by locale', () => {
    renderInForm(
      <V2AutoField
        name="name"
        field={{ type: 'string', label: { en: 'Name', ru: 'Имя', tr: 'Ad' } } as FieldConfig}
        locale="tr"
      />,
    );
    expect(screen.getByText('Ad')).toBeInTheDocument();
  });
});
