import { faker } from '@faker-js/faker';

export function seedRandom(seed = 42) {
  faker.seed(seed);
}

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export interface ProductInput {
  code: string;
  name: string;
}

export interface InvoiceLineInput {
  productIdx: number;
  quantity: number;
  price: number;
}

export interface InvoiceInput {
  date: Date;
  customerIdx: number;
  lines: InvoiceLineInput[];
  shouldPost: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildCustomers(count: number): CustomerInput[] {
  const seen = new Set<string>();
  const out: CustomerInput[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 5) {
    attempts += 1;
    const name = faker.company.name();
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number({ style: 'international' }),
      notes: faker.lorem.sentence({ min: 4, max: 10 }),
    });
  }
  return out;
}

export function buildProducts(count: number): ProductInput[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `SKU-${String(i + 1).padStart(4, '0')}`,
    name: faker.commerce.productName(),
  }));
}

export function buildInvoices(
  count: number,
  customerCount: number,
  productCount: number,
): InvoiceInput[] {
  return Array.from({ length: count }, (_, i) => {
    const lineCount = faker.number.int({ min: 1, max: 5 });
    const lines = Array.from({ length: lineCount }, () => ({
      productIdx: faker.number.int({ min: 0, max: productCount - 1 }),
      quantity: faker.number.int({ min: 1, max: 10 }),
      price: Number(faker.commerce.price({ min: 10, max: 5000, dec: 2 })),
    }));
    return {
      date: new Date(Date.now() - (count - i) * 2 * DAY_MS),
      customerIdx: faker.number.int({ min: 0, max: customerCount - 1 }),
      lines,
      shouldPost: faker.number.float({ min: 0, max: 1 }) < 0.6,
    };
  });
}

export interface PaymentInput {
  customerIdx: number;
  amount: number;
  date: Date;
  note?: string;
  shouldPost: boolean;
}

/**
 * Build demo payment_received inputs.
 *
 * @param count         Number of payments to generate.
 * @param customerIds   Full list of customer IDs (indexes into this array).
 *
 * Strategy:
 *  - Payments 0..count-2: pick from the first half of customerIds so they
 *    definitely have invoices (customers are created before invoices, and
 *    invoices are spread across all customers — the first half will have
 *    invoice exposure). Amount = 10–50 % of a typical invoice value.
 *  - Payment count-1: use the LAST customerIdx so that customer likely has
 *    NO invoices, producing a negative A/R (prepayment) entry.
 *  - All but the last payment shouldPost = true; last one is a draft.
 */
export interface SupplierInput {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

// Suppliers use deterministic names so two reruns within one seed cycle
// — even if faker state has diverged from intermediate buildInvoices /
// buildPayments calls being skipped — collide on the SAME unique key and
// hit the P2002 idempotency path.
export function buildSuppliers(count: number): SupplierInput[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    return {
      name: `Supplier S-${String(idx).padStart(4, '0')}`,
      email: `supplier${String(idx).padStart(4, '0')}@example.com`,
      phone: `+1-555-01${String(idx).padStart(2, '0')}`,
      notes: `Demo supplier #${idx}`,
    };
  });
}

export interface PurchaseInvoiceInput {
  date: Date;
  supplierIdx: number;
  lines: InvoiceLineInput[];
  shouldPost: boolean;
}

export function buildPurchaseInvoices(
  count: number,
  supplierCount: number,
  productCount: number,
): PurchaseInvoiceInput[] {
  return Array.from({ length: count }, (_, i) => {
    const lineCount = faker.number.int({ min: 1, max: 4 });
    const lines = Array.from({ length: lineCount }, () => ({
      productIdx: faker.number.int({ min: 0, max: productCount - 1 }),
      quantity: faker.number.int({ min: 5, max: 50 }),
      price: Number(faker.commerce.price({ min: 5, max: 2500, dec: 2 })),
    }));
    return {
      date: new Date(Date.now() - (count - i) * 3 * DAY_MS),
      supplierIdx: faker.number.int({ min: 0, max: supplierCount - 1 }),
      lines,
      shouldPost: faker.number.float({ min: 0, max: 1 }) < 0.7,
    };
  });
}

export interface PaymentSentInput {
  supplierIdx: number;
  amount: number;
  date: Date;
  note: string;
  shouldPost: boolean;
}

// Deterministic amounts + supplier rotation — this factory runs AFTER
// buildPurchaseInvoices, which is skip-gated on idempotent reruns. Faker
// state would diverge on rerun and the idempotency path would fail.
// Factories skipped by earlier runs must stay deterministic.
export function buildPaymentSent(count: number, supplierIds: string[]): PaymentSentInput[] {
  if (supplierIds.length === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    return {
      supplierIdx: i % supplierIds.length,
      amount: 100_000 + i * 25_000,
      date: new Date(Date.now() - i * DAY_MS),
      note: `Deterministic payment ${i + 1}`,
      shouldPost: true,
    };
  });
}

export function buildPayments(count: number, customerIds: string[]): PaymentInput[] {
  const halfCount = Math.max(1, Math.floor(customerIds.length / 2));
  return Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1;
    // Last payment → last customer (likely no invoices → prepayment/negative A/R)
    const customerIdx = isLast
      ? customerIds.length - 1
      : faker.number.int({ min: 0, max: halfCount - 1 });
    // Average invoice line: qty ~5, price ~2500 → ~12 500; 10-50% of that
    const amount = Number(faker.commerce.price({ min: 500, max: 5000, dec: 2 }));
    const daysAgo = faker.number.int({ min: 1, max: 30 });
    return {
      customerIdx,
      amount,
      date: new Date(Date.now() - daysAgo * DAY_MS),
      note: isLast
        ? 'Prepayment — no invoice yet'
        : faker.helpers.maybe(() => faker.lorem.sentence({ min: 3, max: 8 }), { probability: 0.5 }),
      shouldPost: !isLast,
    };
  });
}
