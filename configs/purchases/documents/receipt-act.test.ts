import { describe, expect, it } from 'vitest';
import './receipt-act';
import { getRegistry } from '@/platform/metadata';

describe('purchases.receipt_act document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.receipt_act']).toBeDefined();
  });

  it('writes NO register movements (audit-trail record)', () => {
    const cfg = getRegistry().document['purchases.receipt_act'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('hides workflowStatus and assignedBuyerId from forms', () => {
    const h = getRegistry().document['purchases.receipt_act']?.header;
    const ws = h?.workflowStatus;
    expect(ws?.type).toBe('string');
    if (ws?.type === 'string') {
      expect(ws.formHidden).toBe(true);
      expect(ws.maxLength).toBe(32);
    }
    const ab = h?.assignedBuyerId;
    expect(ab?.type).toBe('string');
    if (ab?.type === 'string') {
      expect(ab.formHidden).toBe(true);
    }
  });

  it('items section: product + expectedQty + acceptedQty REQUIRED (qty min 0)', () => {
    const items = getRegistry().document['purchases.receipt_act']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBe(true);
    const eq = items?.fields?.expectedQty;
    expect(eq?.required).toBe(true);
    if (eq?.type === 'number') {
      expect(eq.min).toBe(0);
    }
    const aq = items?.fields?.acceptedQty;
    expect(aq?.required).toBe(true);
    if (aq?.type === 'number') {
      expect(aq.min).toBe(0);
    }
    const dn = items?.fields?.discrepancyNote;
    expect(dn?.type).toBe('string');
    if (dn?.type === 'string') {
      expect(dn.maxLength).toBe(256);
    }
  });
});
