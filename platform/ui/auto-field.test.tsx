// @vitest-environment jsdom
import '@testing-library/jest-dom';
import type { FieldConfig } from '@/platform/metadata';
import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Stub global fetch so ReferenceField's label-resolve effect doesn't throw.
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve(null) })),
);

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
  redirect: () => {},
  getPathname: () => '/',
}));

import { AutoField } from './auto-field';

const schema = z.object({
  lines: z.object({
    items: z.array(
      z.object({
        quantity: z.coerce.number().min(1, 'required'),
      }),
    ),
  }),
});

type FormValues = z.infer<typeof schema>;

function Harness() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { lines: { items: [{ quantity: 0 }] } },
    mode: 'onSubmit',
  });
  const cfg: FieldConfig = {
    type: 'number',
    label: { en: 'Qty', ru: 'Qty', tr: 'Qty' },
    required: true,
  } as FieldConfig;
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <AutoField name="lines.items.0.quantity" field={cfg} locale="en" />
        <button type="submit">submit</button>
      </form>
    </FormProvider>
  );
}

describe('AutoField nested errors', () => {
  it('renders the message for a nested error path', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('submit'));
    expect(await screen.findByText('required')).toBeInTheDocument();
    const input = screen.getByLabelText(/Qty/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

// ---------------------------------------------------------------------------
// AutoField disabled prop
// ---------------------------------------------------------------------------

function TextHost({ disabled }: { disabled?: boolean }) {
  const form = useForm({ defaultValues: { name: '' } });
  const cfg = {
    type: 'string',
    label: { en: 'Name', ru: 'Name', tr: 'Name' },
  } as FieldConfig;
  return (
    <FormProvider {...form}>
      <AutoField name="name" field={cfg} locale="en" disabled={disabled} />
    </FormProvider>
  );
}

describe('AutoField disabled', () => {
  it('renders the text input enabled by default', () => {
    render(<TextHost />);
    expect(screen.getByLabelText('Name')).not.toBeDisabled();
  });

  it('renders the text input disabled when disabled=true', () => {
    render(<TextHost disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('renders a reference field disabled', () => {
    const cfg = {
      type: 'reference',
      label: { en: 'Supplier', ru: 'Supplier', tr: 'Supplier' },
      to: { kind: 'ref', module: 'purchases', name: 'supplier' },
    } as FieldConfig;
    function RefHost() {
      const form = useForm({ defaultValues: { supplier: '' } });
      return (
        <FormProvider {...form}>
          <AutoField name="supplier" field={cfg} locale="en" disabled />
        </FormProvider>
      );
    }
    render(<RefHost />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders a datetime field disabled', () => {
    const cfg = {
      type: 'datetime',
      label: { en: 'Date', ru: 'Date', tr: 'Date' },
    } as FieldConfig;
    function DateHost() {
      const form = useForm({ defaultValues: { date: '' } });
      return (
        <FormProvider {...form}>
          <AutoField name="date" field={cfg} locale="en" disabled />
        </FormProvider>
      );
    }
    render(<DateHost />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
