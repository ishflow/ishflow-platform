import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'sales',
  name: 'price_agreement',
  label: { en: 'Special Price', ru: 'Особая цена клиента', tr: 'Özel Fiyat' },
  pluralLabel: {
    en: 'Special Prices',
    ru: 'Особые цены клиентов',
    tr: 'Özel Fiyatlar',
  },
  icon: 'BadgePercent',
  fields: {
    code: field.string({
      label: { en: 'Code', ru: 'Код', tr: 'Kod' },
      required: true,
      unique: true,
      maxLength: 32,
      formHidden: true,
      listHidden: true,
      autoGenerate: 'sequence',
    }),
    counterparty: field.reference({
      label: { en: 'Customer', ru: 'Клиент', tr: 'Müşteri' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'customer' },
    }),
    product: field.reference({
      label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
      required: true,
      to: { kind: 'ref', module: 'inventory', name: 'product' },
    }),
    fixedPrice: field.money({
      label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' },
      required: true,
    }),
    validFrom: field.date({
      label: { en: 'Valid From', ru: 'Действует с', tr: 'Başlangıç' },
      required: true,
    }),
    validTo: field.date({
      label: { en: 'Valid To', ru: 'Действует до', tr: 'Bitiş' },
    }),
  },
  permissions: { read: 'any' },
  displayField: 'code',
  // Composite label for breadcrumb/title: "<auto-code> · YYYY-MM-DD".
  // The catalog only stores reference IDs (counterparty/product) on the
  // record, not labels — so the code + validFrom pair is the most
  // information we can surface without an extra DB round-trip.
  presentation: (record) => {
    const code = String(record.code ?? '').trim();
    const validFrom = record.validFrom;
    const dateStr =
      validFrom instanceof Date
        ? validFrom.toISOString().slice(0, 10)
        : typeof validFrom === 'string'
          ? validFrom.slice(0, 10)
          : '';
    if (code && dateStr) return `${code} · ${dateStr}`;
    return code || dateStr || '—';
  },
});
