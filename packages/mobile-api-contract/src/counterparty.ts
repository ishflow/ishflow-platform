import { z } from 'zod';
import { DecimalStringSchema, UuidSchema, pagedResponse } from './common';

export const CounterpartyTypeSchema = z.enum(['customer', 'supplier']);
export type CounterpartyType = z.infer<typeof CounterpartyTypeSchema>;

export const BalanceDirectionSchema = z.enum(['owesUs', 'weOwe', 'zero']);
export type BalanceDirection = z.infer<typeof BalanceDirectionSchema>;

export const CounterpartyListQuerySchema = z.object({
  type: CounterpartyTypeSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
});
export type CounterpartyListQuery = z.infer<typeof CounterpartyListQuerySchema>;

export const CounterpartyItemSchema = z.object({
  id: UuidSchema,
  code: z.string().nullable(),
  name: z.string(),
  balance: DecimalStringSchema,
  balanceDirection: BalanceDirectionSchema,
  currency: z.string(),
});
export type CounterpartyItem = z.infer<typeof CounterpartyItemSchema>;

export const CounterpartyListResponseSchema = pagedResponse(CounterpartyItemSchema);
export type CounterpartyListResponse = z.infer<typeof CounterpartyListResponseSchema>;
