import { describe, expect, it } from 'vitest';
import './invoice-for-payment';
import { getRegistry } from '@/platform/metadata';

describe('sales.invoice_for_payment document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.invoice_for_payment']).toBeDefined();
  });

  it('writes NO register movements (proforma, status-only)', () => {
    const cfg = getRegistry().document['sales.invoice_for_payment'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('hides workflowStatus and constrains it to maxLength 32', () => {
    const ws = getRegistry().document['sales.invoice_for_payment']?.header?.workflowStatus;
    expect(ws?.type).toBe('string');
    if (ws?.type === 'string') {
      expect(ws.formHidden).toBe(true);
      expect(ws.maxLength).toBe(32);
    }
  });

  it('exposes optional linkedSalesOrder back-reference to sales.order', () => {
    const lso = getRegistry().document['sales.invoice_for_payment']?.header?.linkedSalesOrder;
    expect(lso?.type).toBe('reference');
    expect(lso?.required).toBeFalsy();
    if (lso?.type === 'reference') {
      expect(lso.to).toEqual({ kind: 'ref', module: 'sales', name: 'order' });
    }
  });

  it('items section: product OPTIONAL, description + quantity + price present', () => {
    const items = getRegistry().document['sales.invoice_for_payment']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBeFalsy();
    expect(items?.fields?.description?.type).toBe('string');
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price?.required).toBe(true);
  });
});
