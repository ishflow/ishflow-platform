// Central registration of every metadata config. Every runtime entry
// point that touches the registry (`getRegistry()`) MUST import this
// module — either directly or transitively via a layout — so server
// actions and RSC pages always see a fully populated registry.
//
// Import drift on the hand-written lists previously caused production
// 404s on catalog routes whose config wasn't in the route's import list
// (e.g. `sales.price_type`, `inventory.product_price`). A single source
// of truth prevents that class of bug.

// assets
import './assets/catalogs/fixed-asset';
import './assets/documents/commissioning';
import './assets/documents/disposal';
import './assets/documents/receipt';

import './inventory/catalogs/product';
import './inventory/catalogs/product-category';
import './inventory/catalogs/product-group';
import './inventory/catalogs/warehouse';
import './inventory/registers/product-price';
import './inventory/documents/assembly';
import './inventory/documents/disassembly';
import './inventory/documents/price-setting';
import './inventory/documents/inventory-count';
import './inventory/documents/material-request';
import './inventory/documents/production-report';
import './inventory/documents/repricing';
import './inventory/documents/stock-adjustment';
import './inventory/documents/stock-transfer';
import './inventory/documents/write-off-act';
import './inventory/registers/stock-balance';
import './inventory/register-views/stock-balance';
import './purchases/catalogs/supplier';
import './purchases/documents/bank-payment';
import './purchases/documents/payment-request';
import './purchases/documents/payment-sent';
import './purchases/documents/purchase-invoice';
import './purchases/documents/purchase-order';
import './purchases/documents/receipt-act';
import './purchases/documents/refund-received';
import './purchases/documents/return-purchase';
import './purchases/documents/service-receipt';
import './purchases/registers/accounts-payable';
import './purchases/registers/expected-stock';
import './purchases/register-views/accounts-payable';
import './sales/catalogs/customer';
import './sales/catalogs/price-agreement';
import './sales/catalogs/price-type';
import './sales/documents/bank-receipt';
import './sales/documents/commercial-offer';
import './sales/documents/delivery-note';
import './sales/documents/invoice-for-payment';
import './sales/documents/payment-received';
import './sales/documents/refund-payment';
import './sales/documents/retail-sale';
import './sales/documents/return-invoice';
import './sales/documents/sales-invoice';
import './sales/documents/sales-order';
import './sales/documents/service-sale';
import './sales/registers/accounts-receivable';
import './sales/registers/reserved-stock';
import './sales/register-views/accounts-receivable';
import './sales/registers/sale';
import './sales/register-views/sales';
import './sales/register-views/product-prices';
import './treasury/catalogs/bank-account';
import './treasury/catalogs/cash-register';
import './treasury/registers/bank-funds';
import './treasury/registers/cash-funds';
import './treasury/documents/bank-deposit';
import './treasury/documents/bank-transfer';
import './treasury/documents/bank-withdrawal';
import './treasury/documents/cash-transfer';
import './treasury/documents/debt-adjustment';
import './treasury/documents/expense-report';
import './treasury/documents/payment-order';
import './treasury/register-views/cash-funds';

// Finance — VAT settlement register (output/input tax).
import './finance/registers/vat';

// Register-view order (after every view registers so missing ids throw at boot)
import './registers/order';

// Dashboard widget registry. Order matters: order.ts must be imported
// AFTER every widget so missing-widget references throw at boot.
import './dashboard/widgets/kpi-strip';
import './dashboard/widgets/revenue-chart';
import './dashboard/widgets/top-customers';
import './dashboard/widgets/recent-invoices';
import './dashboard/order';

// Report-view registry (metadata-driven /v2/reports/*).
import './reports';

// Settings registry (metadata-driven /v2/admin/* + /v2/settings/* singletons).
import './settings';

// Super-admin registry (cross-tenant, metadata-driven entities).
import './super-admin';
