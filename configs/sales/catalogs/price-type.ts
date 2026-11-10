import { defineCatalog, field } from '@/platform/metadata';

defineCatalog({
  module: 'sales',
  name: 'price_type',
  label: { en: 'Price Type', ru: 'Тип цен', tr: 'Fiyat Türü' },
  pluralLabel: { en: 'Price Types', ru: 'Типы цен', tr: 'Fiyat Türleri' },
  icon: 'Tags',
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
    name: field.string({
      label: { en: 'Name', ru: 'Наименование', tr: 'Ad' },
      required: true,
      unique: true,
    }),
    kind: field.string({
      label: { en: 'Kind', ru: 'Вид', tr: 'Tür' },
      required: true,
      maxLength: 10,
      enumValues: ['static', 'dynamic'],
      enumLabels: {
        static: { en: 'Static', ru: 'Статический', tr: 'Statik' },
        dynamic: { en: 'Dynamic', ru: 'Динамический', tr: 'Dinamik' },
      },
    }),
    description: field.text({
      label: { en: 'Description', ru: 'Описание', tr: 'Açıklama' },
    }),
    basePriceType: field.reference({
      label: { en: 'Base Price Type', ru: 'Базовый тип цен', tr: 'Temel Fiyat Türü' },
      to: { kind: 'ref', module: 'sales', name: 'price_type' },
      // Only static price types are valid bases — prevents dynamic → dynamic cycles.
      referenceFilter: 'staticOnly',
      // Dynamic-only: a static price type doesn't derive from another.
      showIf: { field: 'kind', equals: 'dynamic' },
    }),
    markupPct: field.number({
      label: { en: 'Markup %', ru: 'Наценка %', tr: 'Marj %' },
      min: 0,
      max: 999.99,
      transform: 'percentFraction',
      // Dynamic-only: static prices are manual, no markup applies.
      showIf: { field: 'kind', equals: 'dynamic' },
    }),
    isDefault: field.boolean({
      label: { en: 'Default', ru: 'По умолчанию', tr: 'Varsayılan' },
    }),
  },
  permissions: { read: 'any' },
  displayField: 'name',
});
