// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WelcomeDialog } from './welcome-dialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WelcomeDialog', () => {
  it('renders title + both action buttons when initialOpen=true', () => {
    render(
      <WelcomeDialog initialOpen canLoadDemo onLoadDemo={async () => ({ ok: true as const })} />,
    );
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'loadDemo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'startFromScratch' })).toBeInTheDocument();
  });

  it('renders nothing when initialOpen=false', () => {
    render(
      <WelcomeDialog
        initialOpen={false}
        canLoadDemo
        onLoadDemo={async () => ({ ok: true as const })}
      />,
    );
    expect(screen.queryByText('title')).not.toBeInTheDocument();
  });

  it('omits the load-demo button when canLoadDemo=false', () => {
    render(
      <WelcomeDialog
        initialOpen
        canLoadDemo={false}
        onLoadDemo={async () => ({ ok: true as const })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'loadDemo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'startFromScratch' })).toBeInTheDocument();
  });

  it('invokes onLoadDemo when primary button clicked', () => {
    const onLoadDemo = vi.fn().mockResolvedValue({ ok: true as const });
    render(<WelcomeDialog initialOpen canLoadDemo onLoadDemo={onLoadDemo} />);
    fireEvent.click(screen.getByRole('button', { name: 'loadDemo' }));
    expect(onLoadDemo).toHaveBeenCalledTimes(1);
  });
});
