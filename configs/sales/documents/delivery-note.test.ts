import { describe, expect, it } from 'vitest';
import './delivery-note';
import { getRegistry } from '@/platform/metadata';

describe('sales.delivery_note document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.delivery_note']).toBeDefined();
  });

  it('writes NO register movements (operational record)', () => {
    const cfg = getRegistry().document['sales.delivery_note'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('hides workflowStatus and assignedRepId from forms', () => {
    const h = getRegistry().document['sales.delivery_note']?.header;
    const ws = h?.workflowStatus;
    expect(ws?.type).toBe('string');
    if (ws?.type === 'string') {
      expect(ws.formHidden).toBe(true);
      expect(ws.maxLength).toBe(32);
    }
    const rep = h?.assignedRepId;
    expect(rep?.type).toBe('string');
    if (rep?.type === 'string') {
      expect(rep.formHidden).toBe(true);
    }
  });

  it('exposes optional linkedInvoice string (UUID stored as plain string)', () => {
    const li = getRegistry().document['sales.delivery_note']?.header?.linkedInvoice;
    expect(li?.type).toBe('string');
    expect(li?.required).toBeFalsy();
    if (li?.type === 'string') {
      expect(li.maxLength).toBe(64);
    }
  });

  it('items section: product + quantity REQUIRED, no money fields', () => {
    const items = getRegistry().document['sales.delivery_note']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBe(true);
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price).toBeUndefined();
  });
});
