import { z } from 'zod';
import { DecimalStringSchema, UuidSchema } from './common';

/**
 * Query for `GET /api/mobile/inventory/stock`.
 *
 * Comma-separated UUIDs in `productIds`. The route caps the count at
 * 100 — the iOS picker batches in pages of ≤50.
 */
export const StockBatchQuerySchema = z.object({
  productIds: z.string().min(1),
});
export type StockBatchQuery = z.infer<typeof StockBatchQuerySchema>;

export const StockBatchWarehouseEntrySchema = z.object({
  warehouseId: UuidSchema,
  warehouseName: z.string(),
  qty: DecimalStringSchema,
});
export type StockBatchWarehouseEntry = z.infer<typeof StockBatchWarehouseEntrySchema>;

export const StockBatchItemSchema = z.object({
  productId: UuidSchema,
  byWarehouse: z.array(StockBatchWarehouseEntrySchema),
});
export type StockBatchItem = z.infer<typeof StockBatchItemSchema>;

export const StockBatchResponseSchema = z.object({
  items: z.array(StockBatchItemSchema),
});
export type StockBatchResponse = z.infer<typeof StockBatchResponseSchema>;
