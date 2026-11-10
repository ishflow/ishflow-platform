import { z } from 'zod';

export const ENTITY_TYPES = ['customer', 'product', 'supplier'] as const;
export type ImportEntity = (typeof ENTITY_TYPES)[number];

/** Helper: optional string that treats '' as undefined. */
const optStr = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional();

const customerSchema = z.object({
  name: z.string().trim().min(1, 'name required').max(200),
  email: optStr.pipe(z.union([z.string().email(), z.undefined()])),
  phone: optStr,
  notes: optStr,
  externalId: optStr,
});

const productSchema = z.object({
  name: z.string().trim().min(1, 'name required').max(200),
  barcode: optStr,
  externalId: optStr,
});

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'name required').max(200),
  email: optStr.pipe(z.union([z.string().email(), z.undefined()])),
  phone: optStr,
  notes: optStr,
  externalId: optStr,
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;

export function getSchema(entity: 'customer'): typeof customerSchema;
export function getSchema(entity: 'product'): typeof productSchema;
export function getSchema(entity: 'supplier'): typeof supplierSchema;
export function getSchema(
  entity: ImportEntity,
): typeof customerSchema | typeof productSchema | typeof supplierSchema;
export function getSchema(entity: ImportEntity) {
  switch (entity) {
    case 'customer':
      return customerSchema;
    case 'product':
      return productSchema;
    case 'supplier':
      return supplierSchema;
    default:
      throw new Error(`Unknown import entity: ${entity satisfies never}`);
  }
}

/** Field descriptors used by the column-mapper UI and header-suggestion engine. */
export const FIELD_DESCRIPTORS: Record<
  ImportEntity,
  Array<{ key: string; required: boolean; labels: string[] }>
> = {
  customer: [
    {
      key: 'name',
      required: true,
      labels: ['Name', 'Наименование', 'Имя', 'Ad', 'Müşteri', 'Клиент'],
    },
    { key: 'email', required: false, labels: ['Email', 'E-mail', 'Почта'] },
    { key: 'phone', required: false, labels: ['Phone', 'Телефон', 'Telefon'] },
    { key: 'notes', required: false, labels: ['Notes', 'Примечания', 'Notlar'] },
    { key: 'externalId', required: false, labels: ['External ID', 'ID', 'Код'] },
  ],
  product: [
    { key: 'name', required: true, labels: ['Name', 'Наименование', 'Товар', 'Ürün', 'Ad'] },
    { key: 'barcode', required: false, labels: ['Barcode', 'Штрихкод', 'Barkod'] },
    { key: 'externalId', required: false, labels: ['External ID', 'ID', 'Код'] },
  ],
  supplier: [
    {
      key: 'name',
      required: true,
      labels: ['Name', 'Наименование', 'Ad', 'Поставщик', 'Tedarikçi'],
    },
    { key: 'email', required: false, labels: ['Email', 'E-mail', 'Почта'] },
    { key: 'phone', required: false, labels: ['Phone', 'Телефон', 'Telefon'] },
    { key: 'notes', required: false, labels: ['Notes', 'Примечания', 'Notlar'] },
    { key: 'externalId', required: false, labels: ['External ID', 'ID', 'Код'] },
  ],
};
