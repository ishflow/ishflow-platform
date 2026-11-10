import '@/configs';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

describe('inventory.stock_adjustment', () => {
  it('is registered in the metadata registry', () => {
    const reg = getRegistry();
    expect(reg.document['inventory.stock_adjustment']).toBeDefined();
  });

  it('writes to inventory.stock_balance only (single-register)', () => {
    const config = getRegistry().document['inventory.stock_adjustment'];
    expect(Object.keys(config?.posting ?? {})).toEqual(['inventory.stock_balance']);
  });

  it('has quantityDelta as a signed number field', () => {
    const config = getRegistry().document['inventory.stock_adjustment'];
    const qd = config?.lines?.items?.fields?.quantityDelta;
    expect(qd?.type).toBe('number');
    if (qd?.type === 'number') {
      expect(qd.min).toBeLessThan(0);
      expect(qd.max).toBeGreaterThan(0);
    }
  });
});
