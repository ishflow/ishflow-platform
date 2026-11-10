import { describe, expect, it } from 'vitest';
import './commercial-offer';
import { getRegistry } from '@/platform/metadata';

describe('sales.commercial_offer document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.commercial_offer']).toBeDefined();
  });

  it('writes NO register movements (proposal, status-only)', () => {
    const cfg = getRegistry().document['sales.commercial_offer'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });

  it('items section: product OPTIONAL, description + quantity + price present', () => {
    const items = getRegistry().document['sales.commercial_offer']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBeFalsy();
    expect(items?.fields?.description?.type).toBe('string');
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price?.required).toBe(true);
  });
});
