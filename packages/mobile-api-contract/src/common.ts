import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z.string().datetime();
export const DecimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);

export const PaginationQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function pagedResponse<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const ConflictErrorSchema = z.object({
  code: z.enum(['STOCK_INSUFFICIENT', 'PRICE_CHANGED', 'DOCUMENT_POSTED', 'CONFLICT']),
  message: z.string(),
  serverState: z.record(z.unknown()).optional(),
});

export type ConflictError = z.infer<typeof ConflictErrorSchema>;
