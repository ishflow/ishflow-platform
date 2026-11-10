/**
 * V2 document URL-slug ⇔ engine document-key mapping.
 *
 * Parallel to `entity-slug-map.ts` but for `/documents/<slug>/...` and
 * `/purchases/<slug>/...` routes. Every slug in `V2DocumentSlug` has
 * a matching `defineDocument(...)` config under `configs/`. Phase 4
 * brought the formerly-bespoke return-invoice / stock-adjustment /
 * stock-transfer / inventory-count routes onto the engine.
 */

export type V2DocumentSlug =
  | 'sales-invoice'
  | 'sales-order'
  | 'invoice-for-payment'
  | 'payment-received'
  | 'purchase-invoice'
  | 'purchase-order'
  | 'payment-sent'
  | 'price-setting'
  | 'return-invoice'
  | 'return-purchase'
  | 'stock-adjustment'
  | 'stock-transfer'
  | 'inventory-count'
  | 'debt-adjustment'
  | 'expense-report'
  | 'service-sale'
  | 'service-receipt'
  | 'retail-sale'
  | 'cash-transfer'
  | 'bank-deposit'
  | 'bank-withdrawal'
  | 'bank-payment'
  | 'bank-receipt'
  | 'bank-transfer'
  | 'refund-payment'
  | 'refund-received'
  | 'production-report'
  | 'assembly'
  | 'disassembly'
  | 'payment-request'
  | 'commercial-offer'
  | 'payment-order'
  | 'material-request'
  | 'delivery-note'
  | 'receipt-act'
  | 'write-off-act'
  | 'repricing'
  | 'asset-receipt'
  | 'asset-commissioning'
  | 'asset-disposal';

const DOC_SLUG_TO_KEY: Record<V2DocumentSlug, string> = {
  'sales-invoice': 'sales.invoice',
  'sales-order': 'sales.order',
  'invoice-for-payment': 'sales.invoice_for_payment',
  'payment-received': 'sales.payment_received',
  'purchase-invoice': 'purchases.invoice',
  'purchase-order': 'purchases.order',
  'payment-sent': 'purchases.payment_sent',
  'price-setting': 'inventory.price_setting',
  'return-invoice': 'sales.return_invoice',
  'return-purchase': 'purchases.return_purchase',
  'stock-adjustment': 'inventory.stock_adjustment',
  'stock-transfer': 'inventory.stock_transfer',
  'inventory-count': 'inventory.inventory_count',
  'debt-adjustment': 'treasury.debt_adjustment',
  'expense-report': 'treasury.expense_report',
  'service-sale': 'sales.service_sale',
  'service-receipt': 'purchases.service_receipt',
  'retail-sale': 'sales.retail_sale',
  'cash-transfer': 'treasury.cash_transfer',
  'bank-deposit': 'treasury.bank_deposit',
  'bank-withdrawal': 'treasury.bank_withdrawal',
  'bank-payment': 'purchases.bank_payment',
  'bank-receipt': 'sales.bank_receipt',
  'bank-transfer': 'treasury.bank_transfer',
  'refund-payment': 'sales.refund_payment',
  'refund-received': 'purchases.refund_received',
  'production-report': 'inventory.production_report',
  assembly: 'inventory.assembly',
  disassembly: 'inventory.disassembly',
  'payment-request': 'purchases.payment_request',
  'commercial-offer': 'sales.commercial_offer',
  'payment-order': 'treasury.payment_order',
  'material-request': 'inventory.material_request',
  'delivery-note': 'sales.delivery_note',
  'receipt-act': 'purchases.receipt_act',
  'write-off-act': 'inventory.write_off_act',
  repricing: 'inventory.repricing',
  'asset-receipt': 'assets.receipt',
  'asset-commissioning': 'assets.commissioning',
  'asset-disposal': 'assets.disposal',
};

const KEY_TO_DOC_SLUG: Record<string, V2DocumentSlug> = Object.fromEntries(
  Object.entries(DOC_SLUG_TO_KEY).map(([slug, key]) => [key, slug as V2DocumentSlug]),
) as Record<string, V2DocumentSlug>;

export function documentKeyFromSlug(slug: string): string | null {
  return DOC_SLUG_TO_KEY[slug as V2DocumentSlug] ?? null;
}

export function documentSlugFromKey(key: string): V2DocumentSlug | null {
  return KEY_TO_DOC_SLUG[key] ?? null;
}

export const V2_DOCUMENT_SLUGS: V2DocumentSlug[] = Object.keys(DOC_SLUG_TO_KEY) as V2DocumentSlug[];

/**
 * Where the V2 list page for each document lives. Most sit under
 * `/documents`; the purchases pair lives under `/purchases` to keep
 * the side rail clean.
 */
export function listHrefForDocumentSlug(slug: V2DocumentSlug): string {
  switch (slug) {
    case 'purchase-invoice':
    case 'payment-sent':
    case 'return-purchase':
      return `/purchases/${slug}`;
    default:
      return `/documents/${slug}`;
  }
}

/**
 * i18n key (under `v2_nav.documents.section`) of the breadcrumb section
 * label for a given document slug. Used by the generic document renderer
 * so purchase docs don't show a "Satışlar" breadcrumb.
 */
export function sectionLabelKeyForSlug(
  slug: V2DocumentSlug,
): 'sales' | 'purchases' | 'inventory' | 'assets' {
  switch (slug) {
    case 'purchase-invoice':
    case 'payment-sent':
    case 'return-purchase':
    case 'service-receipt':
    case 'refund-received':
    case 'bank-payment':
    case 'payment-request':
    case 'receipt-act':
      return 'purchases';
    case 'write-off-act':
    case 'repricing':
      return 'inventory';
    case 'asset-receipt':
    case 'asset-commissioning':
    case 'asset-disposal':
      return 'assets';
    default:
      return 'sales';
  }
}
