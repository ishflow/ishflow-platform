import { describe, expect, it } from 'vitest';
import {
  V2_DOCUMENT_SLUGS,
  documentKeyFromSlug,
  documentSlugFromKey,
  listHrefForDocumentSlug,
  sectionLabelKeyForSlug,
} from './document-slug-map';

describe('documentKeyFromSlug', () => {
  it('maps each known slug to its engine document key', () => {
    expect(documentKeyFromSlug('sales-invoice')).toBe('sales.invoice');
    expect(documentKeyFromSlug('payment-received')).toBe('sales.payment_received');
    expect(documentKeyFromSlug('purchase-invoice')).toBe('purchases.invoice');
    expect(documentKeyFromSlug('payment-sent')).toBe('purchases.payment_sent');
    expect(documentKeyFromSlug('price-setting')).toBe('inventory.price_setting');
    expect(documentKeyFromSlug('return-invoice')).toBe('sales.return_invoice');
    expect(documentKeyFromSlug('return-purchase')).toBe('purchases.return_purchase');
    expect(documentKeyFromSlug('stock-adjustment')).toBe('inventory.stock_adjustment');
    expect(documentKeyFromSlug('stock-transfer')).toBe('inventory.stock_transfer');
    expect(documentKeyFromSlug('inventory-count')).toBe('inventory.inventory_count');
  });

  it('returns null for unknown slugs', () => {
    expect(documentKeyFromSlug('')).toBeNull();
    expect(documentKeyFromSlug('made-up-slug')).toBeNull();
  });
});

describe('documentSlugFromKey', () => {
  it('round-trips every known slug', () => {
    for (const slug of V2_DOCUMENT_SLUGS) {
      const key = documentKeyFromSlug(slug);
      expect(key).not.toBeNull();
      expect(documentSlugFromKey(key as string)).toBe(slug);
    }
  });

  it('returns null for unknown keys', () => {
    expect(documentSlugFromKey('not.real')).toBeNull();
  });
});

describe('listHrefForDocumentSlug', () => {
  it('routes purchase-side docs under /v2/purchases', () => {
    expect(listHrefForDocumentSlug('purchase-invoice')).toBe('/purchases/purchase-invoice');
    expect(listHrefForDocumentSlug('payment-sent')).toBe('/purchases/payment-sent');
    expect(listHrefForDocumentSlug('return-purchase')).toBe('/purchases/return-purchase');
  });

  it('routes everything else under /v2/documents', () => {
    expect(listHrefForDocumentSlug('sales-invoice')).toBe('/documents/sales-invoice');
    expect(listHrefForDocumentSlug('payment-received')).toBe('/documents/payment-received');
    expect(listHrefForDocumentSlug('price-setting')).toBe('/documents/price-setting');
    expect(listHrefForDocumentSlug('return-invoice')).toBe('/documents/return-invoice');
    expect(listHrefForDocumentSlug('stock-adjustment')).toBe('/documents/stock-adjustment');
    expect(listHrefForDocumentSlug('stock-transfer')).toBe('/documents/stock-transfer');
    expect(listHrefForDocumentSlug('inventory-count')).toBe('/documents/inventory-count');
  });
});

describe('sectionLabelKeyForSlug', () => {
  it('returns "purchases" for purchase-side docs', () => {
    expect(sectionLabelKeyForSlug('purchase-invoice')).toBe('purchases');
    expect(sectionLabelKeyForSlug('payment-sent')).toBe('purchases');
    expect(sectionLabelKeyForSlug('return-purchase')).toBe('purchases');
  });

  it('returns "sales" for sales-side and inventory docs', () => {
    expect(sectionLabelKeyForSlug('sales-invoice')).toBe('sales');
    expect(sectionLabelKeyForSlug('payment-received')).toBe('sales');
    expect(sectionLabelKeyForSlug('price-setting')).toBe('sales');
    expect(sectionLabelKeyForSlug('return-invoice')).toBe('sales');
    expect(sectionLabelKeyForSlug('stock-adjustment')).toBe('sales');
    expect(sectionLabelKeyForSlug('stock-transfer')).toBe('sales');
    expect(sectionLabelKeyForSlug('inventory-count')).toBe('sales');
  });
});
