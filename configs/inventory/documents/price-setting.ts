import { defineDocument, field } from '@/platform/metadata';
import type { PostingContext } from '@/platform/metadata';

defineDocument({
  module: 'inventory',
  name: 'price_setting',
  label: { ru: 'Установка Цен Номенклатуры', tr: 'Fiyat Belirleme', en: 'Price Setting' },
  pluralLabel: { ru: 'Установка Цен Номенклатуры', tr: 'Fiyat Belirlemeler', en: 'Price Settings' },
  icon: 'Tag',
  header: {
    date: field.datetime({
      label: { en: 'Date', ru: 'Дата', tr: 'Tarih' },
      required: true,
      default: 'now',
    }),
    priceType: field.reference({
      label: { en: 'Price Type', ru: 'Тип цен', tr: 'Fiyat Türü' },
      required: true,
      to: { kind: 'ref', module: 'sales', name: 'price_type' },
      referenceFilter: 'staticOnly',
    }),
  },
  lines: {
    items: {
      label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
      pluralLabel: { en: 'Products', ru: 'Товары', tr: 'Ürünler' },
      minRows: 1,
      lineBehavior: 'price-setting',
      fields: {
        product: field.reference({
          label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
          required: true,
          to: { kind: 'ref', module: 'inventory', name: 'product' },
        }),
        price: field.money({
          label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' },
          required: true,
        }),
      },
    },
  },
  posting: {
    'inventory.product_price': async (doc, _pCtx) => {
      const period = (doc.date as Date) ?? new Date();
      const priceType = doc.priceType as string;
      const docLines = doc.lines as
        | { items?: Array<{ product: string; price: number | string }> }
        | undefined;
      const items = docLines?.items ?? [];
      return items.map((l) => ({
        period,
        product: l.product,
        priceType,
        price: Number(l.price),
      }));
    },
  },
  validators: {
    prePost: [
      async (doc, ctx: PostingContext) => {
        const priceTypeId = doc.priceType as string | undefined;
        if (!priceTypeId) return { ok: false, message: 'priceTypeRequired' };
        // biome-ignore lint/suspicious/noExplicitAny: Prisma delegate not typed on tx generic
        const pt = await (ctx.tx as any).catalog_sales_price_type.findUnique({
          where: { id: priceTypeId },
          select: { kind: true },
        });
        if (pt?.kind === 'dynamic') {
          return {
            ok: false,
            message: 'dynamic price type cannot be posted; only static types accept rows',
          };
        }
        return { ok: true };
      },
    ],
  },
  permissions: { read: 'any', write: 'any', post: 'any', unpost: 'any' },
});
