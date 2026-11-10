import { describe, expect, it } from 'vitest';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/stock-balance';
import { stockBalanceView } from './stock-balance';

describe('stock-balance register-view config (matrix mode)', () => {
  it('declares matrix-mode register binding + UI shape', () => {
    expect(stockBalanceView.id).toBe('stock-balance');
    expect(stockBalanceView.register).toBe('inventory.stock_balance');
    expect(stockBalanceView.topbar.periodPicker).toBe('month');
    expect(stockBalanceView.topbar.exportButton).toBe(true);
    expect(stockBalanceView.search).not.toBe(false);
    // Matrix mode emits matrix payload, but config.columns is populated
    // for the "Son Hareketler" entries list rendered below the matrix.
    expect(Array.isArray(stockBalanceView.columns)).toBe(true);
    const colKeys = stockBalanceView.columns.map((c) => c.key);
    expect(colKeys).toContain('date');
    expect(colKeys).toContain('warehouse');
    expect(colKeys).toContain('product');
    expect(colKeys).toContain('direction');
    expect(colKeys).toContain('qty');
    expect(colKeys).toContain('totalCost');
    expect(colKeys).toContain('source');
  });

  it('declares EN/RU/TR titles + countLabel + breadcrumb + hub card', () => {
    expect(stockBalanceView.title).toMatchObject({
      en: 'Stock Balance',
      ru: 'Остатки товаров',
      tr: 'Stok Bakiyesi',
    });
    expect(stockBalanceView.subtitleSecondary).toMatchObject({
      en: 'Stock Balance',
      ru: 'Остатки товаров',
      tr: 'Stok Bakiyesi',
    });
    expect(stockBalanceView.breadcrumb.tr).toBe('Kayıtlar / Stok Bakiyesi');
    expect(stockBalanceView.hubCard.icon).toBe('boxes');

    const countLabel3 = stockBalanceView.countLabel(3);
    expect(countLabel3.tr).toBe('3 depo');
    expect(countLabel3.ru).toBe('3 складов');
    expect(countLabel3.en).toBe('3 warehouses');
  });
});
