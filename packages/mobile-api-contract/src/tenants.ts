import { z } from 'zod';
import { TenantSummarySchema } from './me';
import { UuidSchema } from './common';

export const TenantListResponseSchema = z.object({
  items: z.array(TenantSummarySchema),
});

export const SetActiveTenantBodySchema = z.object({
  tenantId: UuidSchema,
});

export const SetActiveTenantResponseSchema = z.object({
  token: z.string().min(1),
});

export type TenantListResponse = z.infer<typeof TenantListResponseSchema>;
export type SetActiveTenantBody = z.infer<typeof SetActiveTenantBodySchema>;
export type SetActiveTenantResponse = z.infer<typeof SetActiveTenantResponseSchema>;
