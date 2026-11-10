import { describe, expect, it } from 'vitest';
import { buildPaymentPrefill } from './payment-prefill';

const CUSTOMER = '11111111-2222-4333-8444-555555555555';
const INVOICE = '99999999-8888-4777-8666-555555555555';

describe('buildPaymentPrefill', () => {
  it('returns undefined when required params are missing', async () => {
    expect(await buildPaymentPrefill({ searchParams: {}, party: 'customer' })).toBeUndefined();
    expect(
      await buildPaymentPrefill({
        searchParams: { customer: CUSTOMER },
        party: 'customer',
      }),
    ).toBeUndefined();
  });

  it('returns undefined for malformed uuid', async () => {
    expect(
      await buildPaymentPrefill({
        searchParams: { customer: 'not-a-uuid', invoice: INVOICE, amount: '10' },
        party: 'customer',
      }),
    ).toBeUndefined();
  });

  it('returns undefined for non-positive amount', async () => {
    expect(
      await buildPaymentPrefill({
        searchParams: { customer: CUSTOMER, invoice: INVOICE, amount: '0' },
        party: 'customer',
      }),
    ).toBeUndefined();
  });

  it('builds customer-side prefill with linked invoice + name + label', async () => {
    const out = await buildPaymentPrefill({
      searchParams: {
        customer: CUSTOMER,
        customerName: 'Test Customer',
        invoice: INVOICE,
        invoiceNumber: 'INVOICE-000001',
        amount: '23.20',
      },
      party: 'customer',
    });
    expect(out).toBeDefined();
    expect(out?.defaultValues.customer).toBe(CUSTOMER);
    expect(out?.defaultValues.amount).toBe('23.20');
    const linked = JSON.parse(out?.defaultValues.linkedInvoices as string);
    expect(linked).toEqual([{ invoiceId: INVOICE, amount: 23.2, label: 'INVOICE-000001' }]);
    expect(out?.refDefaults.customer).toEqual({ id: CUSTOMER, label: 'Test Customer' });
  });

  it('falls back to id slice when no party name + omits label when no invoiceNumber', async () => {
    const out = await buildPaymentPrefill({
      searchParams: { supplier: CUSTOMER, invoice: INVOICE, amount: '50' },
      party: 'supplier',
    });
    expect(out?.refDefaults.supplier).toEqual({
      id: CUSTOMER,
      label: CUSTOMER.slice(0, 8),
    });
    const linked = JSON.parse(out?.defaultValues.linkedInvoices as string);
    expect(linked[0]).not.toHaveProperty('label');
  });
});
