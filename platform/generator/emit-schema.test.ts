import {
  clearRegistry,
  defineAccumulationRegister,
  defineCatalog,
  defineDocument,
  field,
} from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { emitSchema } from './emit-schema';

describe('emitSchema', () => {
  it('emits a Prisma model with tenantId + RLS-ready shape for a Catalog', () => {
    clearRegistry();
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: {
        name: field.string({ label: { en: 'Name' }, required: true, unique: true }),
        email: field.string({ label: { en: 'Email' } }),
      },
      permissions: { read: 'any' },
    });
    const out = emitSchema();
    expect(out).toContain('model Catalog_sales_customer {');
    expect(out).toContain('id        String   @id @default(uuid()) @db.Uuid');
    expect(out).toContain('tenantId  String   @map("tenant_id") @db.Uuid');
    // unique fields are tenant-scoped via composite @@unique, NOT global @unique
    expect(out).toMatch(/\n {2}name {6}String *\n/);
    expect(out).not.toMatch(/name\s+String\s+@unique/);
    expect(out).toContain('@@unique([tenantId, name])');
    expect(out).toContain('email     String?');
    expect(out).toContain('@@map("catalog_sales_customer")');
    expect(out).toContain('@@index([tenantId])');
    expect(out).toContain('@@index([tenantId, deletedAt])');
    expect(out).toContain('@@index([tenantId, createdAt])');
  });

  it('emits tenant-scoped composite @@unique for catalog fields with unique:true (not global @unique)', () => {
    clearRegistry();
    defineCatalog({
      module: 'inventory',
      name: 'product',
      label: { en: 'Product' },
      fields: {
        code: field.string({ label: { en: 'Code' }, required: true, unique: true }),
        name: field.string({ label: { en: 'Name' }, required: true }),
        price: field.money({ label: { en: 'Price' } }),
      },
      permissions: { read: 'any' },
    });
    const out = emitSchema();
    // Field-level @unique is FORBIDDEN — two fresh tenants would collide on deterministic values.
    expect(out).not.toMatch(/\b@unique\b(?!\s*\()/);
    // Composite tenant-scoped unique is REQUIRED.
    expect(out).toContain('@@unique([tenantId, code])');
  });

  it('emits displayField index when displayField targets a string/text field', () => {
    clearRegistry();
    defineCatalog({
      module: 'sales',
      name: 'customer',
      label: { en: 'Customer' },
      fields: {
        name: field.string({ label: { en: 'Name' }, required: true }),
      },
      permissions: { read: 'any' },
      displayField: 'name',
    });
    const out = emitSchema();
    expect(out).toContain('@@index([tenantId, name])');
  });

  it('omits displayField index when displayField is not a string/text', () => {
    clearRegistry();
    defineCatalog({
      module: 'x',
      name: 'y',
      label: { en: 'Y' },
      fields: {
        amount: field.money({ label: { en: 'A' } }),
      },
      permissions: { read: 'any', write: 'any' },
      displayField: 'amount',
    });
    const out = emitSchema();
    expect(out).not.toContain('@@index([tenantId, amount])');
  });

  it('emits Document model with status machine + header fields', () => {
    clearRegistry();
    defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: {
        date: field.datetime({ label: { en: 'Date' }, required: true }),
        customer: field.reference({
          label: { en: 'Customer' },
          required: true,
          to: { kind: 'ref', module: 'sales', name: 'customer' },
        }),
      },
      posting: {},
      permissions: { read: 'any' },
    });
    const out = emitSchema();
    expect(out).toContain('model Document_sales_invoice {');
    expect(out).toContain('number    String');
    expect(out).toContain('status    String   @default("SAVED")');
    expect(out).toContain('postedAt  DateTime? @map("posted_at")');
    expect(out).toContain('version   Int       @default(0)');
    expect(out).toContain('date      DateTime');
    expect(out).toContain('customer  String   @db.Uuid');
    expect(out).toContain('@@map("document_sales_invoice")');
    expect(out).toContain('@@unique([tenantId, number])');
    expect(out).toContain('@@index([tenantId, status])');
    expect(out).toContain('@@index([tenantId, postedAt])');
  });

  it('skips docNumber-typed header fields (represented by top-level number column)', () => {
    clearRegistry();
    defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: {
        number: field.docNumber({ label: { en: 'Number' }, prefix: 'INV-' }),
        date: field.datetime({ label: { en: 'Date' }, required: true }),
      },
      posting: {},
      permissions: { read: 'any' },
    });
    const out = emitSchema();
    const numberColumns = out.match(/^ {2}number\s+String/gm) ?? [];
    expect(numberColumns.length).toBe(1);
  });

  it('emits DocumentLine model for each lines section with tenant-scoped indexes', () => {
    clearRegistry();
    defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: {
        date: field.datetime({ label: { en: 'Date' }, required: true }),
      },
      lines: {
        items: {
          label: { en: 'Line' },
          minRows: 1,
          fields: {
            product: field.reference({
              label: { en: 'Product' },
              required: true,
              to: { kind: 'ref', module: 'inventory', name: 'product' },
            }),
            quantity: field.number({ label: { en: 'Qty' }, required: true, min: 1 }),
            price: field.money({ label: { en: 'Price' }, required: true }),
          },
        },
      },
      posting: {},
      permissions: { read: 'any' },
    });
    const out = emitSchema();
    expect(out).toContain('model DocumentLine_sales_invoice_items {');
    expect(out).toContain('documentId String   @map("document_id") @db.Uuid');
    expect(out).toContain('sequence  Int');
    expect(out).toContain('product   String   @db.Uuid');
    expect(out).toContain('quantity  Int');
    expect(out).toContain('price     Decimal  @db.Decimal(14, 2)');
    expect(out).toContain('@@map("document_line_sales_invoice_items")');
    expect(out).toContain('@@unique([tenantId, documentId, sequence])');
    expect(out).toContain('@@index([tenantId])');
    expect(out).toContain('@@index([tenantId, documentId])');
  });

  it('emits nothing extra when the document has no lines', () => {
    clearRegistry();
    defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
      posting: {},
      permissions: { read: 'any', write: 'any' },
    });
    const out = emitSchema();
    expect(out).not.toContain('DocumentLine_');
    expect(out).not.toContain('document_line_');
  });

  it('emits one line model per section when a document declares multiple', () => {
    clearRegistry();
    defineDocument({
      module: 'sales',
      name: 'invoice',
      label: { en: 'Invoice' },
      header: { date: field.datetime({ label: { en: 'Date' }, required: true }) },
      lines: {
        items: {
          label: { en: 'Line' },
          fields: { quantity: field.number({ label: { en: 'Qty' }, required: true }) },
        },
        fees: {
          label: { en: 'Fee' },
          fields: { amount: field.money({ label: { en: 'Amount' }, required: true }) },
        },
      },
      posting: {},
      permissions: { read: 'any', write: 'any' },
    });
    const out = emitSchema();
    expect(out).toContain('model DocumentLine_sales_invoice_items {');
    expect(out).toContain('model DocumentLine_sales_invoice_fees {');
  });

  it('emits Movement model per AccumulationRegister with dimensions + resources', () => {
    clearRegistry();
    defineAccumulationRegister({
      module: 'inventory',
      name: 'stock_balance',
      label: { en: 'Stock Balance' },
      dimensions: {
        product: field.reference({
          label: { en: 'Product' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
      },
      resources: {
        quantity: field.number({ label: { en: 'Qty' } }),
      },
    });
    const out = emitSchema();
    expect(out).toContain('model Movement_inventory_stock_balance {');
    expect(out).toContain('docRef    String   @map("doc_ref") @db.Uuid');
    expect(out).toContain('active    Boolean  @default(true)');
    expect(out).toContain('product   String   @db.Uuid');
    expect(out).toContain('quantity  Int?');
    expect(out).toContain('@@map("movement_inventory_stock_balance")');
    expect(out).toContain('@@index([tenantId, active])');
    expect(out).toContain('@@index([tenantId, docRef])');
    expect(out).toContain('@@index([tenantId, active, timestamp])');
    expect(out).toContain('@@index([tenantId, product, timestamp])');
  });

  it('emitSchema on a money-resource register produces Decimal(14,2) column + dim+timestamp index', () => {
    clearRegistry();
    defineAccumulationRegister({
      module: 'sales',
      name: 'accounts_receivable',
      label: { en: 'Accounts Receivable' },
      dimensions: {
        customer: field.reference({
          label: { en: 'Customer' },
          required: true,
          to: { kind: 'ref', module: 'sales', name: 'customer' },
        }),
      },
      resources: {
        amount: field.money({ label: { en: 'Amount' }, required: true }),
      },
    });
    const out = emitSchema();
    // Model name and table map
    expect(out).toContain('model Movement_sales_accounts_receivable {');
    expect(out).toContain('@@map("movement_sales_accounts_receivable")');
    // money resource emits Decimal(14,2) — required so no `?`
    expect(out).toContain('amount    Decimal  @db.Decimal(14, 2)');
    // dimension column
    expect(out).toContain('customer  String   @db.Uuid');
    // composite index on (tenantId, customer, timestamp)
    expect(out).toContain('@@index([tenantId, customer, timestamp])');
  });

  it('emitSchema on a document with money + text header fields emits Decimal(14,2) and @db.Text', () => {
    clearRegistry();
    defineDocument({
      module: 'sales',
      name: 'payment_received',
      label: { en: 'Payment Received' },
      header: {
        date: field.datetime({ label: { en: 'Date' }, required: true }),
        customer: field.reference({
          label: { en: 'Customer' },
          required: true,
          to: { kind: 'ref', module: 'sales', name: 'customer' },
        }),
        amount: field.money({ label: { en: 'Amount' }, required: true }),
        note: field.text({ label: { en: 'Note' } }),
      },
      posting: {},
      permissions: { read: 'any' },
    });
    const out = emitSchema();
    // Model name
    expect(out).toContain('model Document_sales_payment_received {');
    // money field — required, so no `?`
    expect(out).toContain('amount    Decimal  @db.Decimal(14, 2)');
    // reference field
    expect(out).toContain('customer  String   @db.Uuid');
    // text field — optional (not required), so String? @db.Text
    expect(out).toContain('note      String?  @db.Text');
  });
});
