import { describe, expect, it } from 'vitest';
import './payment-request';
import { getRegistry } from '@/platform/metadata';

describe('purchases.payment_request document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.payment_request']).toBeDefined();
  });

  it('writes NO register movements (pre-approval, status-only)', () => {
    const cfg = getRegistry().document['purchases.payment_request'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });
});
