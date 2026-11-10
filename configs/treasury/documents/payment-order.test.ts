import { describe, expect, it } from 'vitest';
import './payment-order';
import { getRegistry } from '@/platform/metadata';

describe('treasury.payment_order document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.payment_order']).toBeDefined();
  });

  it('writes NO register movements (bank instruction, status-only)', () => {
    const cfg = getRegistry().document['treasury.payment_order'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual([]);
  });
});
