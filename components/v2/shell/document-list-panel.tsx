import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';
import {
  type DocumentListPanelData,
  V2DocumentListPanelClient,
} from './document-list-panel-client';

/**
 * Contextual side panel for /v2/documents/* + /v2/purchases/* record routes.
 *
 * Tenant-scoped Promise.all over the five data-backed tables (sales invoice,
 * purchase invoice, payment received, payment sent, warehouses). The four
 * stock-movement doctypes (return-invoice, stock-transfer, inventory-count,
 * stock-adjustment) are presentation-only today — their row arrays and the
 * cross-cutting `stockMovementCounts` ship as empty/zero. Client side picks
 * the layout (single vs dual) based on `usePathname()`.
 */
export async function V2DocumentListPanel() {
  const t = await getTranslations('v2_documents.panel');

  let tenantId = '';
  try {
    const ctx = await requireTenantContext();
    tenantId = ctx.tenant.id;
  } catch {
    // Unauthenticated — chrome with empty lists.
  }

  const i18n: DocumentListPanelData['i18n'] = {
    backToDocuments: t('backToDocuments'),
    backToCatalogs: t('backToCatalogs'),
    backToList: {
      returnInvoice: t('backToList.returnInvoice'),
      returnPurchase: t('backToList.returnPurchase'),
      stockTransfer: t('backToList.stockTransfer'),
      inventoryCount: t('backToList.inventoryCount'),
      stockAdjustment: t('backToList.stockAdjustment'),
    },
    searchPlaceholder: t('searchPlaceholder'),
    draft: t('draft'),
    titles: {
      salesInvoice: t('titles.salesInvoice'),
      purchaseInvoice: t('titles.purchaseInvoice'),
      paymentReceived: t('titles.paymentReceived'),
      paymentSent: t('titles.paymentSent'),
      warehouses: t('titles.warehouses'),
      returnInvoice: t('titles.returnInvoice'),
      returnPurchase: t('titles.returnPurchase'),
      stockTransfer: t('titles.stockTransfer'),
      inventoryCount: t('titles.inventoryCount'),
      stockAdjustment: t('titles.stockAdjustment'),
    },
    stockMovements: {
      title: t('stockMovements.title'),
      inventoryCount: t('stockMovements.inventoryCount'),
      stockTransfer: t('stockMovements.stockTransfer'),
      stockAdjustment: t('stockMovements.stockAdjustment'),
      returnInvoice: t('stockMovements.returnInvoice'),
    },
  };

  if (!tenantId) {
    return (
      <V2DocumentListPanelClient
        data={{
          salesInvoice: [],
          purchaseInvoice: [],
          paymentReceived: [],
          paymentSent: [],
          warehouses: [],
          returnInvoice: [],
          returnPurchase: [],
          stockTransfer: [],
          inventoryCount: [],
          stockAdjustment: [],
          stockMovementCounts: {
            inventoryCount: 0,
            stockTransfer: 0,
            stockAdjustment: 0,
            returnInvoice: 0,
          },
          i18n,
        }}
      />
    );
  }

  const data = await withTenant(tenantId, async (tx) => {
    const [salesInvoice, purchaseInvoice, paymentReceived, paymentSent, warehouses] =
      await Promise.all([
        tx.document_sales_invoice.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, number: true },
        }),
        tx.document_purchases_invoice.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, number: true },
        }),
        tx.document_sales_payment_received.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, number: true },
        }),
        tx.document_purchases_payment_sent.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, number: true },
        }),
        tx.catalog_inventory_warehouse.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, code: true, name: true },
        }),
      ]);

    return {
      salesInvoice: salesInvoice.map((r) => ({ id: r.id, code: r.number, name: r.number })),
      purchaseInvoice: purchaseInvoice.map((r) => ({ id: r.id, code: r.number, name: r.number })),
      paymentReceived: paymentReceived.map((r) => ({ id: r.id, code: r.number, name: r.number })),
      paymentSent: paymentSent.map((r) => ({ id: r.id, code: r.number, name: r.number })),
      warehouses: warehouses.map((r) => ({ id: r.id, code: r.code ?? '', name: r.name })),
      returnInvoice: [],
      returnPurchase: [],
      stockTransfer: [],
      inventoryCount: [],
      stockAdjustment: [],
      stockMovementCounts: {
        inventoryCount: 0,
        stockTransfer: 0,
        stockAdjustment: 0,
        returnInvoice: 0,
      },
      i18n,
    } satisfies DocumentListPanelData;
  });

  return <V2DocumentListPanelClient data={data} />;
}
