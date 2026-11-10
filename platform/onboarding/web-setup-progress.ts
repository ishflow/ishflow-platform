/**
 * Web-shaped onboarding progress.
 *
 * Five sales-led activation steps for the small-business owner: company
 * profile → first customer → first product → first invoice → first
 * payment. A step is `completed` if EITHER the underlying count check
 * passes OR the step id appears in `Tenant.onboardingState.completedSteps`
 * (manual override; UI does not yet expose the toggle).
 *
 * Issued counts run in parallel inside one `withBypass` round trip — same
 * pattern as `setup-progress.ts` for the iOS path. Hot path: dashboard
 * server component renders before paint.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { getOnboardingState } from './onboarding-state';

export const WEB_SETUP_STEP_IDS = [
  'company_profile',
  'first_customer',
  'first_product',
  'first_invoice',
  'first_payment',
] as const;

export type WebSetupStepId = (typeof WEB_SETUP_STEP_IDS)[number];

export type WebSetupStep = {
  id: WebSetupStepId;
  i18nKey: `onboarding.setupChecklist.steps.${string}`;
  href: string;
  completed: boolean;
};

export type WebSetupProgress = {
  steps: WebSetupStep[];
  completedCount: number;
  totalCount: 5;
};

const STEP_DEFINITIONS: Array<{
  id: WebSetupStepId;
  i18nKey: WebSetupStep['i18nKey'];
  href: string;
}> = [
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
];

export async function getWebSetupProgress(tenantId: string): Promise<WebSetupProgress> {
  const [counts, state] = await Promise.all([
    withBypass(async (tx) => {
      const [tenant, customerCount, productCount, invoiceCount, paymentCount] = await Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: { legalName: true },
        }),
        tx.catalog_sales_customer.count({ where: { tenantId } }),
        tx.catalog_inventory_product.count({ where: { tenantId } }),
        tx.document_sales_invoice.count({ where: { tenantId } }),
        tx.document_sales_payment_received.count({ where: { tenantId } }),
      ]);
      return { tenant, customerCount, productCount, invoiceCount, paymentCount };
    }),
    getOnboardingState(tenantId),
  ]);

  const manual = new Set(state.completedSteps);

  const flags: Record<WebSetupStepId, boolean> = {
    company_profile:
      (counts.tenant?.legalName != null && counts.tenant.legalName.trim().length > 0) ||
      manual.has('company_profile'),
    first_customer: counts.customerCount > 0 || manual.has('first_customer'),
    first_product: counts.productCount > 0 || manual.has('first_product'),
    first_invoice: counts.invoiceCount > 0 || manual.has('first_invoice'),
    first_payment: counts.paymentCount > 0 || manual.has('first_payment'),
  };

  const steps: WebSetupStep[] = STEP_DEFINITIONS.map((def) => ({
    ...def,
    completed: flags[def.id],
  }));

  return {
    steps,
    completedCount: steps.filter((s) => s.completed).length,
    totalCount: 5,
  };
}
