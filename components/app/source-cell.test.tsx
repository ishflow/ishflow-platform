// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceCell } from './source-cell';

const toastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

describe('SourceCell', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
  });

  it('renders the presentation label', () => {
    render(
      <SourceCell
        typeId="sales.invoice"
        recordId="11111111-2222-3333-4444-555555555555"
        presentation="Sales Invoice SI-000123 — 2026-05-31"
        copyLabel="Copy"
        copiedLabel="Copied to clipboard"
      />,
    );
    expect(screen.getByText('Sales Invoice SI-000123 — 2026-05-31')).toBeInTheDocument();
  });

  it('falls back to first 8 chars of recordId when presentation is empty', () => {
    render(
      <SourceCell
        typeId="sales.invoice"
        recordId="abcdef12-2222-3333-4444-555555555555"
        presentation=""
        copyLabel="Copy"
        copiedLabel="Copied"
      />,
    );
    expect(screen.getByText('abcdef12')).toBeInTheDocument();
  });

  it('exposes a copy button with accessible name from copyLabel', () => {
    render(
      <SourceCell
        typeId="sales.invoice"
        recordId="11111111-2222-3333-4444-555555555555"
        presentation="Sales Invoice SI-000123"
        copyLabel="Copy"
        copiedLabel="Copied"
      />,
    );
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('writes recordId to clipboard and fires success toast on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(
      <SourceCell
        typeId="sales.invoice"
        recordId="11111111-2222-3333-4444-555555555555"
        presentation="Sales Invoice SI-000123"
        copyLabel="Copy"
        copiedLabel="Copied to clipboard"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    // Let the awaited clipboard promise resolve before asserting the toast.
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555');
    expect(toastSuccess).toHaveBeenCalledWith('Copied to clipboard');
  });

  it('renders the label as a link when href is provided', () => {
    render(
      <SourceCell
        typeId="sales.invoice"
        recordId="11111111-2222-3333-4444-555555555555"
        presentation="Sales Invoice SI-000123"
        href="/en/documents/sales.invoice/11111111-2222-3333-4444-555555555555"
        copyLabel="Copy"
        copiedLabel="Copied"
      />,
    );
    const link = screen.getByRole('link', { name: 'Sales Invoice SI-000123' });
    expect(link).toHaveAttribute(
      'href',
      '/en/documents/sales.invoice/11111111-2222-3333-4444-555555555555',
    );
  });
});
