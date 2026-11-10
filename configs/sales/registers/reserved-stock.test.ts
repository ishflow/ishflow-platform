import { describe, expect, it } from 'vitest';
import './reserved-stock';
import { getRegistry, isAccumulationRegister } from '@/platform/metadata';

describe('sales.reserved_stock register', () => {
  it('is registered as an accumulation register', () => {
    const r = getRegistry().register['sales.reserved_stock'];
    expect(r).toBeDefined();
    if (!r) throw new Error('expected sales.reserved_stock to exist');
    expect(isAccumulationRegister(r)).toBe(true);
  });

  it('declares quantity as its sole numeric resource', () => {
    const r = getRegistry().register['sales.reserved_stock'];
    expect(r).toBeDefined();
    expect(Object.keys(r?.resources ?? {})).toEqual(['quantity']);
    expect(r?.resources.quantity?.type).toBe('number');
    expect(r?.resources.quantity?.required).toBe(true);
  });

  it('declares warehouse + product + customer as required reference dimensions', () => {
    const r = getRegistry().register['sales.reserved_stock'];
    expect(r).toBeDefined();
    expect(Object.keys(r?.dimensions ?? {}).sort()).toEqual(['customer', 'product', 'warehouse']);
    for (const key of ['warehouse', 'product', 'customer'] as const) {
      const dim = r?.dimensions[key];
      expect(dim?.required).toBe(true);
      expect(dim?.type).toBe('reference');
    }
  });
});
