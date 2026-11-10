import { z } from 'zod';

/**
 * Zod schema for a single OCR-extracted invoice line. Everything except
 * `rawText` + `description` is nullable so the model can flag a missing field
 * instead of inventing a value.
 */
export const ocrLineSchema = z.object({
  rawText: z.string().describe('Original line text exactly as it appears on the invoice'),
  description: z.string().describe('Product or service description, cleaned up'),
  quantity: z.number().nonnegative().nullable(),
  unit: z
    .string()
    .nullable()
    .describe('Unit of measure, e.g. "шт", "кг", "л". Leave null if missing.'),
  unitPrice: z.number().nonnegative().nullable(),
  total: z.number().nonnegative().nullable(),
  vatRate: z.union([z.literal(0), z.literal(10), z.literal(20)]).nullable(),
});

export type OcrLine = z.infer<typeof ocrLineSchema>;

/**
 * Zod schema for the full extraction result. The model is instructed to
 * return *exactly* this shape; we re-validate after the SDK call so a
 * malformed output is treated as a `failed` job.
 */
export const ocrInvoiceSchema = z.object({
  supplierName: z.string().nullable(),
  supplierInn: z.string().nullable().describe('Russian INN (10 or 12 digits, digits only)'),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable().describe('YYYY-MM-DD ISO date'),
  currency: z.enum(['RUB', 'USD', 'EUR', 'KZT', 'UZS', 'KGS']).nullable(),
  totalAmount: z.number().nonnegative().nullable(),
  lines: z.array(ocrLineSchema),
  confidence: z.number().min(0).max(1).describe('Self-reported overall confidence (0..1)'),
});

export type OcrInvoice = z.infer<typeof ocrInvoiceSchema>;

/**
 * Allowed mime types + per-file size cap. Anything outside this set is
 * rejected before the upload even reaches R2.
 */
export const OCR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
] as const;

export type OcrAllowedMime = (typeof OCR_ALLOWED_MIME_TYPES)[number];

export const OCR_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedOcrMime(mime: string): mime is OcrAllowedMime {
  return (OCR_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}
