import { z } from 'zod';
import { UuidSchema } from './common';

export const AttachmentUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  size: z.number().int().positive().max(20 * 1024 * 1024),
  entity: z.string().min(1).max(64),
  entityId: UuidSchema,
});
export type AttachmentUploadRequest = z.infer<typeof AttachmentUploadRequestSchema>;

export const AttachmentUploadResponseSchema = z.object({
  attachmentId: UuidSchema,
  uploadUrl: z.string().url(),
  downloadUrl: z.string().url(),
});
export type AttachmentUploadResponse = z.infer<typeof AttachmentUploadResponseSchema>;

export const AttachmentListQuerySchema = z.object({
  entity: z.string().min(1).max(64),
  entityId: UuidSchema,
});
export type AttachmentListQuery = z.infer<typeof AttachmentListQuerySchema>;

export const AttachmentListItemSchema = z.object({
  id: UuidSchema,
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  downloadUrl: z.string().url(),
  createdAt: z.string(),
});
export type AttachmentListItem = z.infer<typeof AttachmentListItemSchema>;

export const AttachmentListResponseSchema = z.object({
  items: z.array(AttachmentListItemSchema),
});
export type AttachmentListResponse = z.infer<typeof AttachmentListResponseSchema>;
