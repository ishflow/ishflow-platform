import type { AppContext } from '../../platform/auth/current-context';
import { withBypass } from '../../platform/db/tenant-context';
import { createDocument, createRecord, postDocument } from '../../platform/engine';
import { getRegistry } from '../../platform/metadata';
import {
  buildCustomers,
  buildInvoices,
  buildPaymentSent,
  buildPayments,
  buildProducts,
  buildPurchaseInvoices,
  buildSuppliers,
  seedRandom,
} from './factories';

const CUSTOMER_COUNT = 20;
const SUPPLIER_COUNT = 8;
const PRODUCT_COUNT = 50;
const INVOICE_COUNT = 30;
const PURCHASE_INVOICE_COUNT = 10;
const PAYMENT_COUNT = 5;
const PAYMENT_SENT_COUNT = 5;

const WAREHOUSE_DEFS = [
  { code: 'MAIN', name: 'Главный склад', address: 'Москва, ул. Пример, 1' },
  { code: 'BRANCH-1', name: 'Филиал №1', address: 'Санкт-Петербург, пр. Пример, 10' },
] as const;

const STOCK_SEED_DOC_REF = '00000000-0000-0000-0000-000000005eed';
const STOCK_PER_PRODUCT = 1000;

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

type DynamicDelegate = {
  findFirst: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<number>;
};

function delegate(tx: unknown, name: string): DynamicDelegate {
  const bag = tx as Record<string, DynamicDelegate | undefined>;
  const d = bag[name];
  if (!d) throw new Error(`seed: no Prisma delegate for ${name}`);
  return d;
}

function tenantSeed(tenantId: string): number {
  let h = 0;
  for (let i = 0; i < tenantId.length; i++) {
    h = (h * 31 + tenantId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface SeedDemoResult {
  customers: number;
  products: number;
  invoices: { posted: number; drafts: number };
  payments: { posted: number; drafts: number };
  suppliers: number;
  purchaseInvoices: { posted: number; drafts: number };
  paymentsSent: { posted: number; drafts: number };
}

/**
 * Idempotently fill the current tenant with realistic demo data.
 * Reused by the CLI seed AND by the dashboard "Import demo data"
 * server action — both pass an AppContext bound to a real tenant.
 */
export async function seedDemo(ctx: AppContext): Promise<SeedDemoResult> {
  if (!ctx.tenant) {
    throw new Error('seedDemo: ctx.tenant must be non-null');
  }
  const tenant = ctx.tenant;

  // Reseed faker per tenant so rerunning on the same tenant is idempotent
  // (customer/company names are otherwise random). Two different tenants
  // still get distinct demo data via the tenant-derived seed.
  seedRandom(tenantSeed(tenant.id));

  const registry = getRegistry();
  const customerCfg = registry.catalog['sales.customer'];
  const productCfg = registry.catalog['inventory.product'];
  const supplierCfg = registry.catalog['purchases.supplier'];
  const warehouseCfg = registry.catalog['inventory.warehouse'];
  const invoiceCfg = registry.document['sales.invoice'];
  const paymentCfg = registry.document['sales.payment_received'];
  const paymentSentCfg = registry.document['purchases.payment_sent'];
  const purchaseInvoiceCfg = registry.document['purchases.invoice'];
  if (!customerCfg || !productCfg || !invoiceCfg) {
    throw new Error('seedDemo: required configs not registered');
  }
  if (!paymentCfg) {
    throw new Error('seedDemo: sales.payment_received config not registered');
  }
  if (!supplierCfg) {
    throw new Error('seedDemo: purchases.supplier config not registered');
  }
  if (!warehouseCfg) {
    throw new Error('seedDemo: inventory.warehouse config not registered');
  }
  if (!purchaseInvoiceCfg) {
    throw new Error('seedDemo: purchases.invoice config not registered');
  }
  if (!paymentSentCfg) {
    throw new Error('seedDemo: purchases.payment_sent config not registered');
  }

  // ---- Warehouses (must exist before stock movements + invoice lines).
  const warehouseIds: Record<string, string> = {};
  for (const w of WAREHOUSE_DEFS) {
    try {
      const row = (await createRecord(
        ctx,
        warehouseCfg,
        w as unknown as Record<string, unknown>,
      )) as { id: string };
      warehouseIds[w.code] = row.id;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      const existing = (await withBypass((tx) =>
        delegate(tx, 'catalog_inventory_warehouse').findFirst({
          where: { tenantId: tenant.id, code: w.code },
        }),
      )) as { id: string } | null;
      if (existing) warehouseIds[w.code] = existing.id;
    }
  }
  const mainWarehouseId = warehouseIds.MAIN;
  if (!mainWarehouseId) {
    throw new Error('seedDemo: MAIN warehouse not available after seed');
  }

  // ---- Customers
  const customerInputs = buildCustomers(CUSTOMER_COUNT);
  const customerIds: string[] = [];
  let customersCreated = 0;
  for (const c of customerInputs) {
    try {
      const row = (await createRecord(
        ctx,
        customerCfg,
        c as unknown as Record<string, unknown>,
      )) as { id: string };
      customerIds.push(row.id);
      customersCreated += 1;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      const existing = (await withBypass((tx) =>
        delegate(tx, 'catalog_sales_customer').findFirst({
          where: { tenantId: tenant.id, name: c.name },
        }),
      )) as { id: string } | null;
      if (existing) customerIds.push(existing.id);
    }
  }

  // ---- Products
  const productInputs = buildProducts(PRODUCT_COUNT);
  const productIds: string[] = [];
  let productsCreated = 0;
  for (const p of productInputs) {
    try {
      const row = (await createRecord(
        ctx,
        productCfg,
        p as unknown as Record<string, unknown>,
      )) as { id: string };
      productIds.push(row.id);
      productsCreated += 1;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      const existing = (await withBypass((tx) =>
        delegate(tx, 'catalog_inventory_product').findFirst({
          where: { tenantId: tenant.id, code: p.code },
        }),
      )) as { id: string } | null;
      if (existing) productIds.push(existing.id);
    }
  }

  process.stdout.write(
    `seedDemo: ${customersCreated} new customers (${customerIds.length} refs), ` +
      `${productsCreated} new products (${productIds.length} refs)\n`,
  );

  if (customerIds.length === 0 || productIds.length === 0) {
    throw new Error('seedDemo: no customer or product references available for invoices');
  }

  // ---- Initial stock — one synthetic income movement per product, idempotent.
  const stockMovements = await withBypass(async (tx) => {
    const existing = await delegate(tx, 'movement_inventory_stock_balance').count({
      where: { tenantId: tenant.id, docRef: STOCK_SEED_DOC_REF },
    });
    if (existing > 0) return 0;
    const now = new Date();
    const rows = productIds.map((productId) => ({
      tenantId: tenant.id,
      docRef: STOCK_SEED_DOC_REF,
      docType: 'seed.initial_stock',
      kind: 'income',
      active: true,
      timestamp: now,
      warehouse: mainWarehouseId,
      product: productId,
      quantity: STOCK_PER_PRODUCT,
      // Sprint 27 added totalCost; seed initial stock at 0 cost so avg-cost
      // stays neutral until a real purchase invoice posts.
      totalCost: 0,
    }));
    type CreateMany = {
      createMany: (args: { data: unknown[] }) => Promise<{ count: number }>;
    };
    const d = tx as unknown as Record<string, CreateMany | undefined>;
    const mv = d.movement_inventory_stock_balance;
    if (!mv) throw new Error('seedDemo: movement delegate missing');
    const result = await mv.createMany({ data: rows });
    return result.count;
  });

  if (stockMovements > 0) {
    process.stdout.write(
      `seedDemo: ${stockMovements} initial-stock movements (${STOCK_PER_PRODUCT} units per product)\n`,
    );
  } else {
    process.stdout.write('seedDemo: initial stock already seeded — skipping\n');
  }

  // ---- Invoices (multi-line) — idempotent: skip if already at target count.
  let invoicesPosted = 0;
  let invoicesDrafts = 0;

  const existingInvoiceCount = await withBypass((tx) =>
    delegate(tx, 'document_sales_invoice').count({
      where: { tenantId: tenant.id, deletedAt: null },
    }),
  );

  if (existingInvoiceCount >= INVOICE_COUNT) {
    process.stdout.write(
      `seedDemo: ${existingInvoiceCount} invoices already exist — skipping invoice seed\n`,
    );
  } else {
    const toCreate = INVOICE_COUNT - existingInvoiceCount;
    const invoiceInputs = buildInvoices(toCreate, customerIds.length, productIds.length);
    let postErrors = 0;
    for (const inv of invoiceInputs) {
      const customer = customerIds[inv.customerIdx];
      if (!customer) continue;
      const lineRows = inv.lines
        .map((l) => {
          const product = productIds[l.productIdx];
          if (!product) return null;
          return {
            product,
            quantity: l.quantity,
            price: l.price,
          };
        })
        .filter(
          (
            r,
          ): r is {
            product: string;
            quantity: number;
            price: number;
          } => r !== null,
        );
      if (lineRows.length === 0) continue;
      const created = (await createDocument(ctx, invoiceCfg, {
        date: inv.date,
        customer,
        warehouse: mainWarehouseId,
        lines: { items: lineRows },
      })) as { id: string };
      if (inv.shouldPost) {
        try {
          await postDocument(ctx, invoiceCfg, created.id);
          invoicesPosted += 1;
        } catch (err) {
          invoicesDrafts += 1;
          postErrors += 1;
          void err;
        }
      } else {
        invoicesDrafts += 1;
      }
    }
    process.stdout.write(
      `seedDemo: ${toCreate} invoices created (${invoicesPosted} posted, ${invoicesDrafts} drafts; ${postErrors} post-fails)\n`,
    );
  }

  // ---- Payments received — idempotent: skip if already at target count.
  let paymentsPosted = 0;
  let paymentsDraft = 0;

  const paymentExisting = await withBypass((tx) =>
    delegate(tx, 'document_sales_payment_received').count({
      where: { tenantId: tenant.id },
    }),
  );

  if (paymentExisting >= PAYMENT_COUNT) {
    process.stdout.write(
      `seedDemo: ${paymentExisting} payments already exist — skipping payment seed\n`,
    );
  } else {
    const paymentInputs = buildPayments(PAYMENT_COUNT, customerIds);
    for (const pmt of paymentInputs) {
      const customer = customerIds[pmt.customerIdx];
      if (!customer) continue;
      const created = (await createDocument(ctx, paymentCfg, {
        date: pmt.date,
        customer,
        amount: pmt.amount,
        ...(pmt.note !== undefined ? { note: pmt.note } : {}),
      })) as { id: string };
      if (pmt.shouldPost) {
        await postDocument(ctx, paymentCfg, created.id);
        paymentsPosted += 1;
      } else {
        paymentsDraft += 1;
      }
    }
    process.stdout.write(
      `seedDemo: ${paymentsPosted + paymentsDraft} payments created (${paymentsPosted} posted, ${paymentsDraft} drafts)\n`,
    );
  }

  // ---- Suppliers
  const supplierInputs = buildSuppliers(SUPPLIER_COUNT);
  const supplierIds: string[] = [];
  let suppliersCreated = 0;
  for (const s of supplierInputs) {
    try {
      const row = (await createRecord(
        ctx,
        supplierCfg,
        s as unknown as Record<string, unknown>,
      )) as { id: string };
      supplierIds.push(row.id);
      suppliersCreated += 1;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      const existing = (await withBypass((tx) =>
        delegate(tx, 'catalog_purchases_supplier').findFirst({
          where: { tenantId: tenant.id, name: s.name },
        }),
      )) as { id: string } | null;
      if (existing) supplierIds.push(existing.id);
    }
  }

  // ---- Purchase invoices — idempotent: skip if already at target count.
  let purchasePosted = 0;
  let purchaseDrafts = 0;
  if (supplierIds.length > 0) {
    const existingPurchaseCount = await withBypass((tx) =>
      delegate(tx, 'document_purchases_invoice').count({
        where: { tenantId: tenant.id, deletedAt: null },
      }),
    );

    if (existingPurchaseCount >= PURCHASE_INVOICE_COUNT) {
      process.stdout.write(
        `seedDemo: ${existingPurchaseCount} purchase invoices already exist — skipping\n`,
      );
    } else {
      const toCreate = PURCHASE_INVOICE_COUNT - existingPurchaseCount;
      const purchaseInputs = buildPurchaseInvoices(toCreate, supplierIds.length, productIds.length);
      let postErrors = 0;
      for (const inv of purchaseInputs) {
        const supplier = supplierIds[inv.supplierIdx];
        if (!supplier) continue;
        const lineRows = inv.lines
          .map((l) => {
            const product = productIds[l.productIdx];
            if (!product) return null;
            return {
              product,
              quantity: l.quantity,
              price: l.price,
            };
          })
          .filter(
            (
              r,
            ): r is {
              product: string;
              quantity: number;
              price: number;
            } => r !== null,
          );
        if (lineRows.length === 0) continue;
        const created = (await createDocument(ctx, purchaseInvoiceCfg, {
          date: inv.date,
          supplier,
          warehouse: mainWarehouseId,
          lines: { items: lineRows },
        })) as { id: string };
        if (inv.shouldPost) {
          try {
            await postDocument(ctx, purchaseInvoiceCfg, created.id);
            purchasePosted += 1;
          } catch (err) {
            purchaseDrafts += 1;
            postErrors += 1;
            void err;
          }
        } else {
          purchaseDrafts += 1;
        }
      }
      process.stdout.write(
        `seedDemo: ${toCreate} purchase invoices created (${purchasePosted} posted, ${purchaseDrafts} drafts; ${postErrors} post-fails)\n`,
      );
    }
  }

  // ---- Payments sent to suppliers — idempotent: skip if already at target count.
  let paymentsSentPosted = 0;
  let paymentsSentDraft = 0;
  if (supplierIds.length > 0) {
    const paymentSentExisting = await withBypass((tx) =>
      delegate(tx, 'document_purchases_payment_sent').count({
        where: { tenantId: tenant.id, deletedAt: null },
      }),
    );

    if (paymentSentExisting >= PAYMENT_SENT_COUNT) {
      process.stdout.write(
        `seedDemo: ${paymentSentExisting} payments sent already exist — skipping\n`,
      );
    } else {
      const toCreate = PAYMENT_SENT_COUNT - paymentSentExisting;
      const paymentSentInputs = buildPaymentSent(toCreate, supplierIds);
      for (const pmt of paymentSentInputs) {
        const supplier = supplierIds[pmt.supplierIdx];
        if (!supplier) continue;
        try {
          const created = (await createDocument(ctx, paymentSentCfg, {
            date: pmt.date,
            supplier,
            amount: pmt.amount,
            note: pmt.note,
          })) as { id: string };
          if (pmt.shouldPost) {
            try {
              await postDocument(ctx, paymentSentCfg, created.id);
              paymentsSentPosted += 1;
            } catch {
              paymentsSentDraft += 1;
            }
          } else {
            paymentsSentDraft += 1;
          }
        } catch (err) {
          if (!isUniqueConstraintError(err)) throw err;
        }
      }
      process.stdout.write(
        `seedDemo: ${toCreate} payments sent created (${paymentsSentPosted} posted, ${paymentsSentDraft} drafts)\n`,
      );
    }
  }

  // ---- Sprint 30: 1C-style pricing fixtures.
  // Seeds 3 price types (Retail/Wholesale/VIP), a product_price row per
  // product × type at 2026-01-01, customer priceType assignments, and one
  // special override (last VIP customer × first product, fixedPrice=1.00)
  // to prove Layer 1 of the 4-layer resolver. Idempotent: skips entirely
  // if price types already exist for this tenant.
  await withBypass(async (tx) => {
    type CreateDelegate = {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      count: (args: unknown) => Promise<number>;
      findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
      update: (args: unknown) => Promise<unknown>;
    };
    const bag = tx as unknown as Record<string, CreateDelegate | undefined>;
    const priceTypeTbl = bag.catalog_sales_price_type;
    const productTbl = bag.catalog_inventory_product;
    const customerTbl = bag.catalog_sales_customer;
    const agreementTbl = bag.catalog_sales_price_agreement;
    if (!priceTypeTbl || !productTbl || !customerTbl || !agreementTbl) {
      throw new Error('seedDemo: pricing delegates missing');
    }

    const existingTypes = await priceTypeTbl.count({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    if (existingTypes > 0) {
      process.stdout.write(
        `seedDemo: ${existingTypes} price types already exist — skipping pricing seed\n`,
      );
      return;
    }

    const now = new Date('2026-01-01T00:00:00Z');

    // NOTE: Prisma's generated type for catalog_sales_price_type.markupPct
    // is `Int?` even though the DB column is NUMERIC(5,4). Using the standard
    // delegate.create() truncates fractional values to 0. Write via raw SQL
    // so the underlying Decimal(5,4) stores 0.30/0.15/0.05 as intended.
    type PriceTypeRow = { id: string };
    const insertPriceType = async (
      name: string,
      description: string,
      kind: 'static' | 'dynamic',
      markup: number | null,
      isDefault: boolean,
      basePriceType: string | null = null,
    ): Promise<PriceTypeRow> => {
      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO catalog_sales_price_type
          (id, tenant_id, name, kind, description, base_price_type_id, "markupPct", "isDefault", updated_at)
         VALUES
          (gen_random_uuid(), $1::uuid, $2, $3, $4, $5::uuid, $6::numeric, $7, now())
         RETURNING id`,
        tenant.id,
        name,
        kind,
        description,
        basePriceType,
        markup,
        isDefault,
      )) as PriceTypeRow[];
      const first = rows[0];
      if (!first)
        throw new Error(`seedDemo: insert catalog_sales_price_type(${name}) returned 0 rows`);
      return first;
    };

    const retail = await insertPriceType(
      'Perakende / Retail',
      'Standart son kullanıcı fiyatı (statik, elle girilir)',
      'static',
      null,
      true,
    );
    const wholesale = await insertPriceType(
      'Toptan / Wholesale',
      'Toptan satış (statik)',
      'static',
      null,
      false,
    );
    // Dynamic example: VIP derives from Retail with -10% markdown at runtime.
    await insertPriceType(
      'VIP',
      'Anahtar müşteriler (Perakende -%10)',
      'dynamic',
      -0.1,
      false,
      retail.id,
    );

    // Product prices — one register row per (product × static type) at `now`.
    // Inserted directly into the InformationRegister table; the canonical UI
    // path is to post a `price_setting` document, but seed bypasses that for
    // fixture speed (the document path is covered by integration tests).
    // Uses a fixed cost since `catalog_inventory_product.price` has been
    // dropped (replaced by this register).
    const allProducts = (await productTbl.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
    })) as Array<{ id: string }>;
    const fallbackCost = 10;
    // Only static types get stored register rows. VIP is dynamic —
    // resolved at runtime via resolvePriceForType (Retail × (1 + −0.10)).
    const typeWithMult: Array<[{ id: string }, number]> = [
      [retail, 1.3],
      [wholesale, 1.15],
    ];
    const period = now.toISOString().slice(0, 10); // YYYY-MM-DD
    let productPricesCreated = 0;
    for (const product of allProducts) {
      const cost = fallbackCost;
      for (const pair of typeWithMult) {
        if (!pair) continue;
        const [type, mult] = pair;
        await tx.$executeRawUnsafe(
          `INSERT INTO register_inventory_product_price
            (id, tenant_id, period, product, "priceType", price, recorder_type)
           VALUES (gen_random_uuid(), $1::uuid, $2::date, $3::uuid, $4::uuid, $5::numeric, 'seed')`,
          tenant.id,
          period,
          product.id,
          type.id,
          Math.round(cost * mult * 100) / 100,
        );
        productPricesCreated += 1;
      }
    }

    // One special override on (last customer, first product) to prove
    // Layer 1 (price_agreement fixedPrice) of the resolver.
    const allCustomers = (await customerTbl.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      orderBy: { name: 'asc' },
    })) as Array<{ id: string; name: string }>;
    const lastCustomer = allCustomers[allCustomers.length - 1];
    const firstProduct = allProducts[0];
    let specialCreated = 0;
    if (lastCustomer && firstProduct) {
      await agreementTbl.create({
        data: {
          tenantId: tenant.id,
          counterparty: lastCustomer.id,
          product: firstProduct.id,
          fixedPrice: 1.0,
          validFrom: now,
          validTo: null,
        },
      });
      specialCreated = 1;
    }

    process.stdout.write(
      `seedDemo: pricing seed — 3 price types, ${productPricesCreated} product prices, ${specialCreated} special override\n`,
    );
  });

  return {
    customers: customersCreated,
    products: productsCreated,
    invoices: { posted: invoicesPosted, drafts: invoicesDrafts },
    payments: { posted: paymentsPosted, drafts: paymentsDraft },
    suppliers: suppliersCreated,
    purchaseInvoices: { posted: purchasePosted, drafts: purchaseDrafts },
    paymentsSent: { posted: paymentsSentPosted, drafts: paymentsSentDraft },
  };
}
