// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WebSetupProgress } from '@/platform/onboarding';
import { SetupChecklistWidget } from './setup-checklist-widget';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => {
    if (values) {
      let out = key;
      for (const [k, v] of Object.entries(values)) {
        out = out.replace(`{${k}}`, String(v));
      }
      return out;
    }
    return key;
  },
}));

vi.mock('@/app/actions/onboarding', () => ({
  dismissOnboardingAction: vi.fn(),
  loadDemoDataAction: vi.fn(),
  loadDemoDataFormAction: vi.fn(),
}));

function buildProgress(completedCount: 0 | 1 | 2 | 3 | 4 | 5): WebSetupProgress {
  const defs = [
    {
      id: 'company_profile',
      i18nKey: 'onboarding.setupChecklist.steps.companyProfile',
      href: '/settings/general',
    },
    {
      id: 'first_customer',
      i18nKey: 'onboarding.setupChecklist.steps.firstCustomer',
      href: '/sales/customers/new',
    },
    {
      id: 'first_product',
      i18nKey: 'onboarding.setupChecklist.steps.firstProduct',
      href: '/inventory/products/new',
    },
    {
      id: 'first_invoice',
      i18nKey: 'onboarding.setupChecklist.steps.firstInvoice',
      href: '/sales/invoices/new',
    },
    {
      id: 'first_payment',
      i18nKey: 'onboarding.setupChecklist.steps.firstPayment',
      href: '/sales/payment-received/new',
    },
  ] as const;
  const steps = defs.map((def, i) => ({
    id: def.id,
    i18nKey: def.i18nKey,
    href: def.href,
    completed: i < completedCount,
  })) as WebSetupProgress['steps'];
  return { steps, completedCount, totalCount: 5 };
}

describe('SetupChecklistWidget', () => {
  it('renders the five step labels', async () => {
    const node = await SetupChecklistWidget({
      progress: buildProgress(0),
      canLoadDemo: true,
      demoLoaded: false,
    });
    render(node);
    expect(screen.getByText('steps.companyProfile')).toBeInTheDocument();
    expect(screen.getByText('steps.firstCustomer')).toBeInTheDocument();
    expect(screen.getByText('steps.firstPayment')).toBeInTheDocument();
  });

  it('renders progress bar at the right percentage for done/total', async () => {
    const node = await SetupChecklistWidget({
      progress: buildProgress(2),
      canLoadDemo: true,
      demoLoaded: false,
    });
    const { container } = render(node);
    const progress = container.querySelector('[data-slot="progress"]');
    expect(progress).toHaveAttribute('aria-valuenow', '40');
  });

  it('exposes the dismiss form action', async () => {
    const node = await SetupChecklistWidget({
      progress: buildProgress(0),
      canLoadDemo: true,
      demoLoaded: false,
    });
    render(node);
    expect(screen.getByRole('button', { name: 'dismiss' })).toBeInTheDocument();
  });

  it('hides the load-demo button after demoLoaded=true', async () => {
    const node = await SetupChecklistWidget({
      progress: buildProgress(1),
      canLoadDemo: true,
      demoLoaded: true,
    });
    render(node);
    expect(screen.queryByRole('button', { name: 'loadDemo' })).not.toBeInTheDocument();
  });

  it('hides the load-demo button when canLoadDemo=false (non-owner)', async () => {
    const node = await SetupChecklistWidget({
      progress: buildProgress(0),
      canLoadDemo: false,
      demoLoaded: false,
    });
    render(node);
    expect(screen.queryByRole('button', { name: 'loadDemo' })).not.toBeInTheDocument();
  });
});
