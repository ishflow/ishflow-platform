import { z } from 'zod';
import { DecimalStringSchema } from './common';

export const RegisterParamSchema = z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/);

export const RegisterBalanceQuerySchema = z.object({
  asOf: z.string().date().optional(),
  filter: z.record(z.string()).optional(),
});

export const RegisterBalanceRowSchema = z
  .object({
    groupKey: z.record(z.string()),
    /**
     * Parallel map of human-readable labels for ref-typed dimensions in
     * `groupKey`. Keys mirror `groupKey`; values are the catalog/document
     * presentation strings (e.g., `"Apple Bread"` for a product UUID).
     * Omitted when the row has no ref dimensions or the lookup yields nothing.
     */
    groupLabels: z.record(z.string()).optional(),
    quantity: DecimalStringSchema.optional(),
    cost: DecimalStringSchema.optional(),
    revenue: DecimalStringSchema.optional(),
  })
  .passthrough();

export const RegisterBalanceResponseSchema = z.object({
  register: z.string(),
  asOf: z.string().datetime().nullable(),
  rows: z.array(RegisterBalanceRowSchema),
});

export type RegisterBalanceResponse = z.infer<typeof RegisterBalanceResponseSchema>;

export const RegisterMovementsQuerySchema = z.object({
  product: z.string().uuid().optional(),
  warehouse: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  supplier: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RegisterMovementSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  /** Movement direction (`income` / `expense`). */
  kind: z.string(),
  /** Document UUID this movement was emitted from. */
  docRef: z.string().uuid(),
  /** Document type slug (`sales.invoice`, `purchases.invoice`, ...). */
  docType: z.string(),
  /** Optional document number for display (resolved server-side). */
  docNumber: z.string().nullable(),
  /** Optional dimension labels — present when the register has refs we
   *  resolved (e.g. warehouse name, product name). */
  warehouseId: z.string().uuid().nullable(),
  warehouseName: z.string().nullable(),
  productId: z.string().uuid().nullable(),
  productName: z.string().nullable(),
  /** Quantity delta (signed: positive for income, negative for expense). */
  quantity: DecimalStringSchema.nullable(),
});

export const RegisterMovementsResponseSchema = z.object({
  register: z.string(),
  items: z.array(RegisterMovementSchema),
});

export type RegisterMovement = z.infer<typeof RegisterMovementSchema>;
export type RegisterMovementsResponse = z.infer<typeof RegisterMovementsResponseSchema>;
