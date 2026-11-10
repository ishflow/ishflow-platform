import { describe, expect, it } from 'vitest';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import './stock-balance';
import { getRegistry } from '@/platform/metadata';

describe('inventory.stock_balance register', () => {
  it('declares quantity and totalCost resources', () => {
    const reg = getRegistry().register['inventory.stock_balance'];
    expect(reg).toBeDefined();
    expect(Object.keys(reg?.resources ?? {})).toEqual(['quantity', 'totalCost']);
    expect(reg?.resources.totalCost?.type).toBe('money');
  });
});
