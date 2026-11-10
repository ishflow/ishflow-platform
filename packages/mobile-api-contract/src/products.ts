import { z } from 'zod';
import { UuidSchema } from './common';

export const ProductByBarcodeQuerySchema = z.object({
  barcode: z.string().min(1).max(64),
});
export type ProductByBarcodeQuery = z.infer<typeof ProductByBarcodeQuerySchema>;

export const ProductByBarcodeResponseSchema = z.object({
  id: UuidSchema,
  code: z.string().nullable().optional(),
  name: z.string(),
  barcode: z.string().nullable().optional(),
});
export type ProductByBarcodeResponse = z.infer<typeof ProductByBarcodeResponseSchema>;
