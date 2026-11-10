import { z } from 'zod';
import { PaginationQuerySchema, UuidSchema, pagedResponse } from './common';

export const AttachmentDraftIdField = z.object({
  attachmentDraftId: UuidSchema.optional(),
});
export type AttachmentDraftIdField = z.infer<typeof AttachmentDraftIdField>;

/** Parse a comma-separated UUID list query param into `string[] | undefined`. */
const csvUuidArray = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const parts = v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length > 0 ? parts : undefined;
  })
  .pipe(z.array(z.string().uuid()).optional());

export const DocumentTypeParamSchema = z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/);

export const DocumentStatusSchema = z.enum(['DRAFT', 'SAVED', 'POSTED', 'CANCELLED']);

export const DocumentListQuerySchema = PaginationQuerySchema.extend({
  status: DocumentStatusSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  customerIds: csvUuidArray,
  supplierIds: csvUuidArray,
  productIds: csvUuidArray,
});

export const DocumentLineSchema = z.object({
  id: UuidSchema,
  productId: UuidSchema,
  productName: z.string().optional(),
  quantity: z.string(),
  price: z.string(),
  total: z.string(),
});

export const PartyRefSchema = z.object({
  id: UuidSchema,
  name: z.string(),
});

export const DocumentRecordSchema = z
  .object({
    id: UuidSchema,
    number: z.string(),
    date: z.string().datetime(),
    status: DocumentStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    items: z.array(DocumentLineSchema).optional(),
    total: z.string().optional(),
    customer: PartyRefSchema.optional(),
    supplier: PartyRefSchema.optional(),
  })
  .passthrough();

export const DocumentListResponseSchema = pagedResponse(DocumentRecordSchema);

export const DocumentCreateRequestSchema = z.record(z.unknown());

export const DocumentCreateResponseSchema = z.object({
  id: UuidSchema,
  record: DocumentRecordSchema,
});

export const DocumentPostResponseSchema = z.object({
  movementCount: z.number().int().nonnegative(),
});

export type DocumentLine = z.infer<typeof DocumentLineSchema>;
export type PartyRef = z.infer<typeof PartyRefSchema>;
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;
export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;
export type DocumentCreateResponse = z.infer<typeof DocumentCreateResponseSchema>;
export type DocumentPostResponse = z.infer<typeof DocumentPostResponseSchema>;
