import {
  ArrowLeftRight,
  Building2,
  ClipboardCheck,
  FileText,
  MinusCircle,
  Undo2,
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Single source of truth for V2 document/movement record routes.
 *
 * Used by both the `'use client'` panel-switcher (to decide whether to
 * mount the document panel slot) and the document-list-panel client (to
 * pick the layout + back link + row list). Keeping the table here means
 * adding a 10th doctype only requires one edit + the matching i18n keys.
 */

export type DocMode =
  | 'salesInvoice'
  | 'purchaseInvoice'
  | 'paymentReceived'
  | 'paymentSent'
  | 'warehouses'
  | 'returnInvoice'
  | 'returnPurchase'
  | 'stockTransfer'
  | 'inventoryCount'
  | 'stockAdjustment';

export type BackKey =
  | 'backToDocuments'
  | 'backToCatalogs'
  | 'backToList.returnInvoice'
  | 'backToList.returnPurchase'
  | 'backToList.stockTransfer'
  | 'backToList.inventoryCount'
  | 'backToList.stockAdjustment';

export type ModeConfig = {
  layout: 'single' | 'dual';
  routePrefix: string;
  rowIcon: ComponentType<{ size?: number; strokeWidth?: number }>;
  backHref: string;
  backLabelKey: BackKey;
  /** Regex (anchored only at the start) matching `/new` and `/[uuid]` for this doctype. */
  matcher: RegExp;
};

export const MODE_CONFIG: Record<DocMode, ModeConfig> = {
  salesInvoice: {
    layout: 'single',
    routePrefix: '/documents/sales-invoice',
    rowIcon: FileText,
    backHref: '/documents',
    backLabelKey: 'backToDocuments',
    matcher: /\/v2\/documents\/sales-invoice\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  purchaseInvoice: {
    layout: 'single',
    routePrefix: '/purchases/purchase-invoice',
    rowIcon: FileText,
    backHref: '/documents',
    backLabelKey: 'backToDocuments',
    matcher: /\/v2\/purchases\/purchase-invoice\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  paymentReceived: {
    layout: 'single',
    routePrefix: '/documents/payment-received',
    rowIcon: FileText,
    backHref: '/documents',
    backLabelKey: 'backToDocuments',
    matcher: /\/v2\/documents\/payment-received\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  paymentSent: {
    layout: 'single',
    routePrefix: '/purchases/payment-sent',
    rowIcon: FileText,
    backHref: '/documents',
    backLabelKey: 'backToDocuments',
    matcher: /\/v2\/purchases\/payment-sent\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  warehouses: {
    layout: 'single',
    routePrefix: '/catalogs/warehouses',
    rowIcon: Building2,
    backHref: '/catalogs',
    backLabelKey: 'backToCatalogs',
    matcher: /\/v2\/catalogs\/warehouses\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  returnInvoice: {
    layout: 'dual',
    routePrefix: '/documents/return-invoice',
    rowIcon: Undo2,
    backHref: '/documents/return-invoice',
    backLabelKey: 'backToList.returnInvoice',
    matcher: /\/v2\/documents\/return-invoice\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  returnPurchase: {
    layout: 'single',
    routePrefix: '/purchases/return-purchase',
    rowIcon: Undo2,
    backHref: '/documents',
    backLabelKey: 'backToDocuments',
    matcher: /\/v2\/purchases\/return-purchase\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  stockTransfer: {
    layout: 'dual',
    routePrefix: '/documents/stock-transfer',
    rowIcon: ArrowLeftRight,
    backHref: '/documents/stock-transfer',
    backLabelKey: 'backToList.stockTransfer',
    matcher: /\/v2\/documents\/stock-transfer\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  inventoryCount: {
    layout: 'dual',
    routePrefix: '/documents/inventory-count',
    rowIcon: ClipboardCheck,
    backHref: '/documents/inventory-count',
    backLabelKey: 'backToList.inventoryCount',
    matcher: /\/v2\/documents\/inventory-count\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
  stockAdjustment: {
    layout: 'dual',
    routePrefix: '/documents/stock-adjustment',
    rowIcon: MinusCircle,
    backHref: '/documents/stock-adjustment',
    backLabelKey: 'backToList.stockAdjustment',
    matcher: /\/v2\/documents\/stock-adjustment\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  },
};

const MODE_ORDER: DocMode[] = [
  'salesInvoice',
  'purchaseInvoice',
  'paymentReceived',
  'paymentSent',
  'warehouses',
  'returnInvoice',
  'returnPurchase',
  'stockTransfer',
  'inventoryCount',
  'stockAdjustment',
];

/** Returns the doctype mode for the current pathname, or null when the route is not a known doc record route. */
export function detectDocMode(pathname: string): DocMode | null {
  for (const mode of MODE_ORDER) {
    if (MODE_CONFIG[mode].matcher.test(pathname)) return mode;
  }
  return null;
}
