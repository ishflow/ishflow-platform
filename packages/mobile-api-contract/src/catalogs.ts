import { z } from 'zod';
import { PaginationQuerySchema, UuidSchema, pagedResponse } from './common';

export const CatalogEntityParamSchema = z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, {
  message: 'entity must be <module>.<name>',
});

export const CatalogListQuerySchema = PaginationQuerySchema;

export const CatalogRecordSchema = z
  .object({
    id: UuidSchema,
    code: z.string().nullable().optional(),
    name: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .passthrough();

export const CatalogListResponseSchema = pagedResponse(CatalogRecordSchema);

export const CatalogCreateRequestSchema = z.record(z.unknown());

export const CatalogCreateResponseSchema = z.object({
  id: UuidSchema,
  record: CatalogRecordSchema,
});

export type CatalogRecord = z.infer<typeof CatalogRecordSchema>;
export type CatalogListResponse = z.infer<typeof CatalogListResponseSchema>;
export type CatalogCreateResponse = z.infer<typeof CatalogCreateResponseSchema>;
