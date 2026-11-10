// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { CatalogConfig } from '@/platform/metadata';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { EntityForm } from './entity-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const config: CatalogConfig = {
  id: 'test.doc',
  module: 'test',
  name: 'doc',
  label: { en: 'Doc', ru: 'Doc', tr: 'Doc' },
  permissions: { read: 'any' },
  fields: {
    date: { type: 'datetime', label: { en: 'Date', ru: 'Date', tr: 'Date' }, required: true },
    note: { type: 'string', label: { en: 'Note', ru: 'Note', tr: 'Note' } },
  },
} as CatalogConfig;

const messages = { document: { lines: {} } } as const;

describe('EntityForm readOnlyExcept', () => {
  it('locks fields outside the allow-list', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <EntityForm
          config={config}
          locale="en"
          cancelLabel="Cancel"
          submitLabel="Save"
          savingLabel="Saving"
          savedMessage="Saved"
          onSubmit={async () => ({ ok: true, data: {} })}
          readOnlyExcept={['date']}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText(/Note/)).toBeDisabled();
    // The date trigger button's accessible name comes from the <label> (not its
    // inner "—" placeholder text) because PopoverTrigger renders with id="field-date"
    // which the label's `for` attribute points to.
    const dateTrigger = screen.getByRole('button', { name: /Date/ });
    expect(dateTrigger).not.toBeDisabled();
  });
});
