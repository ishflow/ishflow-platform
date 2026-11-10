// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { EntityCoverActions } from './entity-cover-actions';

const messages = {
  cover: {
    saveAndClose: 'Kaydet ve Kapat',
    postAndClose: 'Geçir ve Kapat',
    save: 'Kaydet',
    close: 'Kapat',
  },
};

function wrap(ui: React.ReactElement) {
  return (
    <NextIntlClientProvider locale="tr" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('EntityCoverActions', () => {
  it('renders catalog variant with three buttons (Save and Close, Save, Close)', () => {
    const onSaveAndClose = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      wrap(
        <EntityCoverActions
          kind="catalog"
          pending={false}
          onSaveAndClose={onSaveAndClose}
          onSave={onSave}
          onClose={onClose}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: 'Kaydet ve Kapat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();
  });

  it('renders document variant with three buttons', () => {
    render(
      wrap(
        <EntityCoverActions
          kind="document"
          pending={false}
          onPostAndClose={vi.fn()}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: 'Geçir ve Kapat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();
  });

  it('invokes onSaveAndClose when primary clicked', () => {
    const onSaveAndClose = vi.fn();
    render(
      wrap(
        <EntityCoverActions
          kind="catalog"
          pending={false}
          onSaveAndClose={onSaveAndClose}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet ve Kapat' }));
    expect(onSaveAndClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onSave when middle button clicked', () => {
    const onSave = vi.fn();
    render(
      wrap(
        <EntityCoverActions
          kind="catalog"
          pending={false}
          onSaveAndClose={vi.fn()}
          onSave={onSave}
          onClose={vi.fn()}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons while pending', () => {
    render(
      wrap(
        <EntityCoverActions
          kind="document"
          pending={true}
          onPostAndClose={vi.fn()}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    );
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toBeDisabled();
    }
  });

  it('renders POSTED document variant with three buttons, all enabled', () => {
    render(
      wrap(
        <EntityCoverActions
          kind="document"
          mode="posted"
          pending={false}
          onPostAndClose={vi.fn()}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    );
    const postAndClose = screen.getByRole('button', { name: 'Geçir ve Kapat' });
    const save = screen.getByRole('button', { name: 'Kaydet' });
    const close = screen.getByRole('button', { name: 'Kapat' });
    expect(postAndClose).toBeEnabled();
    expect(save).toBeEnabled();
    expect(close).toBeEnabled();
  });

  it('POSTED variant wires each button to its own handler', () => {
    const onPostAndClose = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      wrap(
        <EntityCoverActions
          kind="document"
          mode="posted"
          pending={false}
          onPostAndClose={onPostAndClose}
          onSave={onSave}
          onClose={onClose}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Geçir ve Kapat' }));
    expect(onPostAndClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('POSTED variant disables all buttons while pending', () => {
    render(
      wrap(
        <EntityCoverActions
          kind="document"
          mode="posted"
          pending={true}
          onPostAndClose={vi.fn()}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
    );
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toBeDisabled();
    }
  });
});
