import { z } from 'zod';
import { PaginationQuerySchema, UuidSchema, pagedResponse } from './common';

export const NotificationRecordSchema = z.object({
  id: UuidSchema,
  title: z.string(),
  message: z.string(),
  date: z.string().datetime(),
  isRead: z.boolean(),
  deepLink: z.string().nullable(),
});

export const NotificationListQuerySchema = PaginationQuerySchema;
export const NotificationListResponseSchema = pagedResponse(NotificationRecordSchema);

export type NotificationRecord = z.infer<typeof NotificationRecordSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
