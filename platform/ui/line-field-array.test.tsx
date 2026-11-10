// @vitest-environment jsdom
import '@testing-library/jest-dom';
import type { LineSectionConfig } from '@/platform/metadata';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { LineFieldArray } from './line-field-array';

const section: LineSectionConfig = {
  label: { en: 'Lines', ru: 'Lines', tr: 'Lines' },
  pluralLabel: { en: 'Lines', ru: 'Lines', tr: 'Lines' },
  minRows: 1,
  fields: {
    product: {
      type: 'reference',
      label: { en: 'Product', ru: 'Product', tr: 'Product' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    },
    quantity: {
      type: 'number',
      label: { en: 'Qty', ru: 'Qty', tr: 'Qty' },
      required: true,
      min: 1,
    },
    price: { type: 'money', label: { en: 'Price', ru: 'Price', tr: 'Price' }, required: true },
  },
} as LineSectionConfig;

const messages = {
  document: {
    lines: {
      addButton: 'Add',
      removeButton: 'Remove',
      moveUp: 'Up',
      moveDown: 'Down',
      sequence: '#',
      rowTotal: 'Row',
      total: 'Total',
    },
  },
} as const;

function Host({ readOnly }: { readOnly?: boolean }) {
  const form = useForm({
    defaultValues: { lines: { items: [{ product: 'p1', quantity: 2, price: 5 }] } },
  });
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <FormProvider {...form}>
        <LineFieldArray sectionKey="items" section={section} locale="en" readOnly={readOnly} />
      </FormProvider>
    </NextIntlClientProvider>
  );
}

describe('LineFieldArray readOnly', () => {
  it('shows the add button and row controls by default', () => {
    render(<Host />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('hides the add button and row controls when readOnly', () => {
    render(<Host readOnly />);
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });
});

// ── Сумма (rowTotal) column visibility ──────────────────────────────────────

const sectionNoQuantity: LineSectionConfig = {
  label: { en: 'Lines', ru: 'Lines', tr: 'Lines' },
  pluralLabel: { en: 'Lines', ru: 'Lines', tr: 'Lines' },
  minRows: 1,
  fields: {
    product: {
      type: 'reference',
      label: { en: 'Product', ru: 'Product', tr: 'Product' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    },
    price: { type: 'money', label: { en: 'Price', ru: 'Price', tr: 'Price' }, required: true },
  },
} as LineSectionConfig;

function HostNoQuantity() {
  const form = useForm({
    defaultValues: { lines: { items: [{ product: 'p1', price: 5 }] } },
  });
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <FormProvider {...form}>
        <LineFieldArray sectionKey="items" section={sectionNoQuantity} locale="en" />
      </FormProvider>
    </NextIntlClientProvider>
  );
}

describe('LineFieldArray Сумма column visibility', () => {
  it('renders the rowTotal column when section has both quantity and price', () => {
    render(<Host />);
    expect(screen.getByRole('columnheader', { name: 'Row' })).toBeInTheDocument();
  });

  it('hides the rowTotal column when section lacks quantity', () => {
    render(<HostNoQuantity />);
    expect(screen.queryByRole('columnheader', { name: 'Row' })).toBeNull();
  });
});
