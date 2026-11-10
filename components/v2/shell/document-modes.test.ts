import { describe, expect, it } from 'vitest';
import { MODE_CONFIG, detectDocMode } from './document-modes';

describe('detectDocMode', () => {
  const cases: Array<[string, ReturnType<typeof detectDocMode>]> = [
    // /new routes (single-list)
    ['/tr/v2/documents/sales-invoice/new', 'salesInvoice'],
    ['/tr/v2/purchases/purchase-invoice/new', 'purchaseInvoice'],
    ['/tr/v2/documents/payment-received/new', 'paymentReceived'],
    ['/tr/v2/purchases/payment-sent/new', 'paymentSent'],
    ['/tr/v2/catalogs/warehouses/new', 'warehouses'],
    // /new routes (dual-list)
    ['/tr/v2/documents/return-invoice/new', 'returnInvoice'],
    ['/tr/v2/documents/stock-transfer/new', 'stockTransfer'],
    ['/tr/v2/documents/inventory-count/new', 'inventoryCount'],
    ['/tr/v2/documents/stock-adjustment/new', 'stockAdjustment'],
    // /[uuid] detail routes
    ['/tr/v2/documents/sales-invoice/11111111-2222-3333-4444-555555555555', 'salesInvoice'],
    ['/tr/v2/purchases/purchase-invoice/11111111-2222-3333-4444-555555555555', 'purchaseInvoice'],
    ['/tr/v2/catalogs/warehouses/11111111-2222-3333-4444-555555555555', 'warehouses'],
    // Negative — list routes should not match
    ['/tr/v2/documents/sales-invoice', null],
    ['/tr/v2/purchases/payment-sent', null],
    ['/tr/v2/documents/return-invoice', null],
    // Negative — unrelated routes
    ['/tr/v2/catalogs/products', null],
    ['/tr/v2/catalogs/products/new', null],
    ['/tr/v2/dashboard', null],
    ['/', null],
  ];

  it.each(cases)('detects %s → %s', (pathname, expected) => {
    expect(detectDocMode(pathname)).toBe(expected);
  });
});

describe('MODE_CONFIG', () => {
  it('every mode entry has a matcher consistent with its routePrefix', () => {
    for (const [_mode, cfg] of Object.entries(MODE_CONFIG)) {
      const newPath = `${cfg.routePrefix}/new`;
      const idPath = `${cfg.routePrefix}/11111111-2222-3333-4444-555555555555`;
      expect(cfg.matcher.test(newPath)).toBe(true);
      expect(cfg.matcher.test(idPath)).toBe(true);
      // The list-only route should NOT match the per-mode matcher.
      expect(cfg.matcher.test(cfg.routePrefix)).toBe(false);
    }
  });

  it('all 10 docmodes are present', () => {
    expect(Object.keys(MODE_CONFIG).sort()).toEqual(
      [
        'inventoryCount',
        'paymentReceived',
        'paymentSent',
        'purchaseInvoice',
        'returnInvoice',
        'returnPurchase',
        'salesInvoice',
        'stockAdjustment',
        'stockTransfer',
        'warehouses',
      ].sort(),
    );
  });
});
