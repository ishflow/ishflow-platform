// GENERATED FILE — do not edit by hand. Run `pnpm generate`.

export type NavEntry = {
  kind: 'catalog' | 'document' | 'register';
  id: string;
  module: string;
  name: string;
  href: string;
  label: Record<string, string>;
  icon?: string;
  sidebarHidden?: boolean;
};

export const navManifest: readonly NavEntry[] = [
  {
    kind: "catalog",
    id: "assets.fixed_asset",
    module: "assets",
    name: "fixed_asset",
    href: "/catalogs/assets.fixed_asset",
    label: {
  "en": "Fixed Assets",
  "ru": "Основные средства",
  "tr": "Sabit Kıymetler"
},
    icon: "Server",
  },
  {
    kind: "catalog",
    id: "inventory.product",
    module: "inventory",
    name: "product",
    href: "/catalogs/inventory.product",
    label: {
  "en": "Products",
  "ru": "Номенклатура",
  "tr": "Ürünler"
},
    icon: "Package",
  },
  {
    kind: "catalog",
    id: "inventory.product_category",
    module: "inventory",
    name: "product_category",
    href: "/catalogs/inventory.product_category",
    label: {
  "en": "Product Categories",
  "ru": "Категории товаров",
  "tr": "Ürün Kategorileri"
},
    icon: "Tag",
    sidebarHidden: true,
  },
  {
    kind: "catalog",
    id: "inventory.product_group",
    module: "inventory",
    name: "product_group",
    href: "/catalogs/inventory.product_group",
    label: {
  "en": "Product Groups",
  "ru": "Группы товаров",
  "tr": "Ürün Grupları"
},
    icon: "Boxes",
    sidebarHidden: true,
  },
  {
    kind: "catalog",
    id: "inventory.warehouse",
    module: "inventory",
    name: "warehouse",
    href: "/catalogs/inventory.warehouse",
    label: {
  "en": "Warehouses",
  "ru": "Склады",
  "tr": "Depolar"
},
    icon: "Warehouse",
  },
  {
    kind: "catalog",
    id: "purchases.supplier",
    module: "purchases",
    name: "supplier",
    href: "/catalogs/purchases.supplier",
    label: {
  "en": "Suppliers",
  "ru": "Поставщики",
  "tr": "Tedarikçiler"
},
    icon: "Users",
  },
  {
    kind: "catalog",
    id: "sales.customer",
    module: "sales",
    name: "customer",
    href: "/catalogs/sales.customer",
    label: {
  "en": "Customers",
  "ru": "Клиенты",
  "tr": "Müşteriler"
},
    icon: "Users",
  },
  {
    kind: "catalog",
    id: "sales.price_agreement",
    module: "sales",
    name: "price_agreement",
    href: "/catalogs/sales.price_agreement",
    label: {
  "en": "Special Prices",
  "ru": "Особые цены клиентов",
  "tr": "Özel Fiyatlar"
},
    icon: "BadgePercent",
  },
  {
    kind: "catalog",
    id: "sales.price_type",
    module: "sales",
    name: "price_type",
    href: "/catalogs/sales.price_type",
    label: {
  "en": "Price Types",
  "ru": "Типы цен",
  "tr": "Fiyat Türleri"
},
    icon: "Tags",
  },
  {
    kind: "catalog",
    id: "treasury.bank_account",
    module: "treasury",
    name: "bank_account",
    href: "/catalogs/treasury.bank_account",
    label: {
  "en": "Bank Accounts",
  "ru": "Банковские счета",
  "tr": "Banka Hesapları"
},
    icon: "Landmark",
  },
  {
    kind: "catalog",
    id: "treasury.cash_register",
    module: "treasury",
    name: "cash_register",
    href: "/catalogs/treasury.cash_register",
    label: {
  "en": "Cash Registers",
  "ru": "Кассы",
  "tr": "Kasalar"
},
    icon: "Wallet",
  },
  {
    kind: "document",
    id: "assets.commissioning",
    module: "assets",
    name: "commissioning",
    href: "/documents/assets.commissioning",
    label: {
  "en": "Asset Commissionings",
  "ru": "Принятия к учёту ОС",
  "tr": "Sabit Kıymet İşletmeye Almaları"
},
    icon: "CheckCircle2",
  },
  {
    kind: "document",
    id: "assets.disposal",
    module: "assets",
    name: "disposal",
    href: "/documents/assets.disposal",
    label: {
  "en": "Asset Disposals",
  "ru": "Списания ОС",
  "tr": "Sabit Kıymet Silmeleri"
},
    icon: "PackageMinus",
  },
  {
    kind: "document",
    id: "assets.receipt",
    module: "assets",
    name: "receipt",
    href: "/documents/assets.receipt",
    label: {
  "en": "Asset Receipts",
  "ru": "Поступления ОС",
  "tr": "Sabit Kıymet Alımları"
},
    icon: "PackagePlus",
  },
  {
    kind: "document",
    id: "inventory.assembly",
    module: "inventory",
    name: "assembly",
    href: "/documents/inventory.assembly",
    label: {
  "en": "Assemblies",
  "ru": "Сборки номенклатуры",
  "tr": "Komplektler"
},
    icon: "Boxes",
  },
  {
    kind: "document",
    id: "inventory.disassembly",
    module: "inventory",
    name: "disassembly",
    href: "/documents/inventory.disassembly",
    label: {
  "en": "Disassemblies",
  "ru": "Разукомплектации",
  "tr": "Ayırmalar"
},
    icon: "PackageOpen",
  },
  {
    kind: "document",
    id: "inventory.inventory_count",
    module: "inventory",
    name: "inventory_count",
    href: "/documents/inventory.inventory_count",
    label: {
  "en": "Inventory Counts",
  "ru": "Инвентаризации",
  "tr": "Stok Sayımları"
},
    icon: "ListChecks",
  },
  {
    kind: "document",
    id: "inventory.material_request",
    module: "inventory",
    name: "material_request",
    href: "/documents/inventory.material_request",
    label: {
  "en": "Material Requests",
  "ru": "Заявки на материалы",
  "tr": "Malzeme Talepleri"
},
    icon: "ClipboardList",
  },
  {
    kind: "document",
    id: "inventory.price_setting",
    module: "inventory",
    name: "price_setting",
    href: "/documents/inventory.price_setting",
    label: {
  "ru": "Установка Цен Номенклатуры",
  "tr": "Fiyat Belirlemeler",
  "en": "Price Settings"
},
    icon: "Tag",
  },
  {
    kind: "document",
    id: "inventory.production_report",
    module: "inventory",
    name: "production_report",
    href: "/documents/inventory.production_report",
    label: {
  "en": "Production Reports",
  "ru": "Производственные отчёты",
  "tr": "Üretim Raporları"
},
    icon: "Factory",
  },
  {
    kind: "document",
    id: "inventory.repricing",
    module: "inventory",
    name: "repricing",
    href: "/documents/inventory.repricing",
    label: {
  "en": "Inventory Repricings",
  "ru": "Переоценки ТМЦ",
  "tr": "Stok Yeniden Değerlemeleri"
},
    icon: "TrendingUp",
  },
  {
    kind: "document",
    id: "inventory.stock_adjustment",
    module: "inventory",
    name: "stock_adjustment",
    href: "/documents/inventory.stock_adjustment",
    label: {
  "en": "Stock Adjustments",
  "ru": "Корректировки запасов",
  "tr": "Stok Düzeltmeleri"
},
    icon: "ClipboardCheck",
  },
  {
    kind: "document",
    id: "inventory.stock_transfer",
    module: "inventory",
    name: "stock_transfer",
    href: "/documents/inventory.stock_transfer",
    label: {
  "en": "Stock Transfers",
  "ru": "Перемещения запасов",
  "tr": "Stok Transferleri"
},
    icon: "ArrowLeftRight",
  },
  {
    kind: "document",
    id: "inventory.write_off_act",
    module: "inventory",
    name: "write_off_act",
    href: "/documents/inventory.write_off_act",
    label: {
  "en": "Write-off Acts",
  "ru": "Акты на списание",
  "tr": "Silme Tutanakları"
},
    icon: "FileMinus",
  },
  {
    kind: "document",
    id: "purchases.bank_payment",
    module: "purchases",
    name: "bank_payment",
    href: "/documents/purchases.bank_payment",
    label: {
  "en": "Bank Payments",
  "ru": "Платежи через банк",
  "tr": "Banka Ödemeleri"
},
    icon: "Banknote",
  },
  {
    kind: "document",
    id: "purchases.invoice",
    module: "purchases",
    name: "invoice",
    href: "/documents/purchases.invoice",
    label: {
  "en": "Purchase Invoices",
  "ru": "Поступление товар и услуг",
  "tr": "Alış Faturaları"
},
    icon: "PackagePlus",
  },
  {
    kind: "document",
    id: "purchases.order",
    module: "purchases",
    name: "order",
    href: "/documents/purchases.order",
    label: {
  "en": "Purchase Orders",
  "ru": "Заказы поставщикам",
  "tr": "Alış Siparişleri"
},
    icon: "ClipboardList",
  },
  {
    kind: "document",
    id: "purchases.payment_request",
    module: "purchases",
    name: "payment_request",
    href: "/documents/purchases.payment_request",
    label: {
  "en": "Payment Requests",
  "ru": "Заявки на оплату",
  "tr": "Ödeme Talepleri"
},
    icon: "FileQuestion",
  },
  {
    kind: "document",
    id: "purchases.payment_sent",
    module: "purchases",
    name: "payment_sent",
    href: "/documents/purchases.payment_sent",
    label: {
  "en": "Payments Sent",
  "ru": "Оплата поставщику",
  "tr": "Tedarikçi Ödemeleri"
},
    icon: "ArrowUpFromLine",
  },
  {
    kind: "document",
    id: "purchases.receipt_act",
    module: "purchases",
    name: "receipt_act",
    href: "/documents/purchases.receipt_act",
    label: {
  "en": "Receipt Acts",
  "ru": "Акты приёмки",
  "tr": "Mal Kabul Tutanakları"
},
    icon: "ClipboardCheck",
  },
  {
    kind: "document",
    id: "purchases.refund_received",
    module: "purchases",
    name: "refund_received",
    href: "/documents/purchases.refund_received",
    label: {
  "en": "Refunds from Suppliers",
  "ru": "Возвраты от поставщиков",
  "tr": "Tedarikçi İadeleri"
},
    icon: "Undo",
  },
  {
    kind: "document",
    id: "purchases.return_purchase",
    module: "purchases",
    name: "return_purchase",
    href: "/documents/purchases.return_purchase",
    label: {
  "en": "Purchase Returns",
  "ru": "Возвраты поставщикам",
  "tr": "Alış İadeleri"
},
    icon: "Undo2",
  },
  {
    kind: "document",
    id: "purchases.service_receipt",
    module: "purchases",
    name: "service_receipt",
    href: "/documents/purchases.service_receipt",
    label: {
  "en": "Service Receipts",
  "ru": "Поступления услуг",
  "tr": "Hizmet Alımları"
},
    icon: "HandCoins",
  },
  {
    kind: "document",
    id: "sales.bank_receipt",
    module: "sales",
    name: "bank_receipt",
    href: "/documents/sales.bank_receipt",
    label: {
  "en": "Bank Receipts",
  "ru": "Поступления на счёт",
  "tr": "Banka Tahsilatları"
},
    icon: "PiggyBank",
  },
  {
    kind: "document",
    id: "sales.commercial_offer",
    module: "sales",
    name: "commercial_offer",
    href: "/documents/sales.commercial_offer",
    label: {
  "en": "Commercial Offers",
  "ru": "Коммерческие предложения",
  "tr": "Teklifler"
},
    icon: "FileText",
  },
  {
    kind: "document",
    id: "sales.delivery_note",
    module: "sales",
    name: "delivery_note",
    href: "/documents/sales.delivery_note",
    label: {
  "en": "Delivery Notes",
  "ru": "Расходные накладные",
  "tr": "İrsaliyeler"
},
    icon: "Truck",
  },
  {
    kind: "document",
    id: "sales.invoice",
    module: "sales",
    name: "invoice",
    href: "/documents/sales.invoice",
    label: {
  "en": "Sales Invoices",
  "ru": "Реализация товар и услуг",
  "tr": "Satış Faturaları"
},
    icon: "Receipt",
  },
  {
    kind: "document",
    id: "sales.invoice_for_payment",
    module: "sales",
    name: "invoice_for_payment",
    href: "/documents/sales.invoice_for_payment",
    label: {
  "en": "Invoices for Payment",
  "ru": "Счета на оплату",
  "tr": "Ödeme Faturaları"
},
    icon: "FileText",
  },
  {
    kind: "document",
    id: "sales.order",
    module: "sales",
    name: "order",
    href: "/documents/sales.order",
    label: {
  "en": "Sales Orders",
  "ru": "Заказы покупателей",
  "tr": "Satış Siparişleri"
},
    icon: "ShoppingCart",
  },
  {
    kind: "document",
    id: "sales.payment_received",
    module: "sales",
    name: "payment_received",
    href: "/documents/sales.payment_received",
    label: {
  "en": "Payments Received",
  "ru": "Оплата от покупателя",
  "tr": "Ödeme Tahsilatları"
},
    icon: "ArrowDownToLine",
  },
  {
    kind: "document",
    id: "sales.refund_payment",
    module: "sales",
    name: "refund_payment",
    href: "/documents/sales.refund_payment",
    label: {
  "en": "Refunds to Customers",
  "ru": "Возвраты покупателям",
  "tr": "Müşteri İadeleri"
},
    icon: "Undo2",
  },
  {
    kind: "document",
    id: "sales.retail_sale",
    module: "sales",
    name: "retail_sale",
    href: "/documents/sales.retail_sale",
    label: {
  "en": "Retail Sales",
  "ru": "Розничные продажи",
  "tr": "Perakende Satışlar"
},
    icon: "ShoppingBag",
  },
  {
    kind: "document",
    id: "sales.return_invoice",
    module: "sales",
    name: "return_invoice",
    href: "/documents/sales.return_invoice",
    label: {
  "en": "Sales Returns",
  "ru": "Возвраты от покупателей",
  "tr": "Satış İadeleri"
},
    icon: "Undo2",
  },
  {
    kind: "document",
    id: "sales.service_sale",
    module: "sales",
    name: "service_sale",
    href: "/documents/sales.service_sale",
    label: {
  "en": "Service Sales",
  "ru": "Реализации услуг",
  "tr": "Hizmet Satışları"
},
    icon: "Handshake",
  },
  {
    kind: "document",
    id: "treasury.bank_deposit",
    module: "treasury",
    name: "bank_deposit",
    href: "/documents/treasury.bank_deposit",
    label: {
  "en": "Bank Deposits",
  "ru": "Внесения наличных",
  "tr": "Bankaya Yatırmalar"
},
    icon: "Banknote",
  },
  {
    kind: "document",
    id: "treasury.bank_transfer",
    module: "treasury",
    name: "bank_transfer",
    href: "/documents/treasury.bank_transfer",
    label: {
  "en": "Bank Transfers",
  "ru": "Переводы между счетами",
  "tr": "Banka Transferleri"
},
    icon: "ArrowLeftRight",
  },
  {
    kind: "document",
    id: "treasury.bank_withdrawal",
    module: "treasury",
    name: "bank_withdrawal",
    href: "/documents/treasury.bank_withdrawal",
    label: {
  "en": "Bank Withdrawals",
  "ru": "Снятия наличных",
  "tr": "Bankadan Çekmeler"
},
    icon: "Banknote",
  },
  {
    kind: "document",
    id: "treasury.cash_transfer",
    module: "treasury",
    name: "cash_transfer",
    href: "/documents/treasury.cash_transfer",
    label: {
  "en": "Cash Transfers",
  "ru": "Перемещения наличных",
  "tr": "Kasa Transferleri"
},
    icon: "ArrowLeftRight",
  },
  {
    kind: "document",
    id: "treasury.debt_adjustment",
    module: "treasury",
    name: "debt_adjustment",
    href: "/documents/treasury.debt_adjustment",
    label: {
  "en": "Debt Adjustments",
  "ru": "Корректировки долга",
  "tr": "Borç Düzeltmeleri"
},
    icon: "Scale",
  },
  {
    kind: "document",
    id: "treasury.expense_report",
    module: "treasury",
    name: "expense_report",
    href: "/documents/treasury.expense_report",
    label: {
  "en": "Expense Reports",
  "ru": "Авансовые отчёты",
  "tr": "Masraf Raporları"
},
    icon: "Wallet",
  },
  {
    kind: "document",
    id: "treasury.payment_order",
    module: "treasury",
    name: "payment_order",
    href: "/documents/treasury.payment_order",
    label: {
  "en": "Payment Orders",
  "ru": "Платёжные поручения",
  "tr": "Ödeme Emirleri"
},
    icon: "Send",
  },
  {
    kind: "register",
    id: "inventory.product_price",
    module: "inventory",
    name: "product_price",
    href: "/registers/inventory.product_price",
    label: {
  "en": "Product Prices",
  "ru": "Цены номенклатуры",
  "tr": "Ürün Fiyatları"
},
    icon: "Tag",
  },
  {
    kind: "register",
    id: "inventory.stock_balance",
    module: "inventory",
    name: "stock_balance",
    href: "/registers/inventory.stock_balance",
    label: {
  "en": "Stock Balance",
  "ru": "Остатки склада",
  "tr": "Stok Bakiyesi"
},
    icon: "Boxes",
  },
  {
    kind: "register",
    id: "purchases.accounts_payable",
    module: "purchases",
    name: "accounts_payable",
    href: "/registers/purchases.accounts_payable",
    label: {
  "en": "Accounts Payable",
  "ru": "Кредиторская задолженность",
  "tr": "Borçlar Hesabı"
},
    icon: "HandCoins",
  },
  {
    kind: "register",
    id: "purchases.expected_stock",
    module: "purchases",
    name: "expected_stock",
    href: "/registers/purchases.expected_stock",
    label: {
  "en": "Expected Stock",
  "ru": "Ожидаемые товары",
  "tr": "Beklenen Stok"
},
    icon: "PackagePlus",
  },
  {
    kind: "register",
    id: "sales.accounts_receivable",
    module: "sales",
    name: "accounts_receivable",
    href: "/registers/sales.accounts_receivable",
    label: {
  "en": "Accounts Receivable",
  "ru": "Дебиторская задолженность",
  "tr": "Alacak Hesapları"
},
    icon: "Landmark",
  },
  {
    kind: "register",
    id: "sales.reserved_stock",
    module: "sales",
    name: "reserved_stock",
    href: "/registers/sales.reserved_stock",
    label: {
  "en": "Reserved Stock",
  "ru": "Зарезервированные товары",
  "tr": "Rezerve Stok"
},
    icon: "PackageCheck",
  },
  {
    kind: "register",
    id: "sales.sale",
    module: "sales",
    name: "sale",
    href: "/registers/sales.sale",
    label: {
  "en": "Sales",
  "ru": "Продажа",
  "tr": "Satış"
},
    icon: "TrendingUp",
  },
  {
    kind: "register",
    id: "treasury.bank_funds",
    module: "treasury",
    name: "bank_funds",
    href: "/registers/treasury.bank_funds",
    label: {
  "en": "Bank Funds",
  "ru": "Денежные средства на счетах",
  "tr": "Banka Bakiyeleri"
},
    icon: "Landmark",
  },
  {
    kind: "register",
    id: "treasury.cash_funds",
    module: "treasury",
    name: "cash_funds",
    href: "/registers/treasury.cash_funds",
    label: {
  "en": "Cash Funds",
  "ru": "Денежные средства",
  "tr": "Kasa Bakiyesi"
},
    icon: "Wallet",
  }
];
